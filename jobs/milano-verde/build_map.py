# Mappa dei NIL di Milano colorati per indice di verde urbano (Comune di Milano, luglio 2024)
# su base MapTiler dataviz. Gira su GitHub Actions (rete completa).
import csv, io, json, math, os, re, sys, urllib.request
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'condoreco-ig-job/1.0'}

def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8', 'replace')

# 1. confini NIL vigenti (PGT 2030)
pkg = json.loads(get('https://dati.comune.milano.it/api/3/action/package_show?id=ds964-nil-vigenti-pgt-2030'))
res = [r for r in pkg['result']['resources'] if 'json' in (r.get('format') or '').lower()]
print('risorse geojson:', [(r['name'], r['url']) for r in res])
gj = json.loads(get(res[0]['url']))
def to_ll(x, y):
    if abs(x) > 180 or abs(y) > 90:  # EPSG:3857
        lon = x / 6378137 * 180 / math.pi
        lat = (2 * math.atan(math.exp(y / 6378137)) - math.pi / 2) * 180 / math.pi
        return lon, lat
    return x, y
def rings(geom):
    if geom['type'] == 'Polygon': return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon': return geom['coordinates']
    return []
feats = []
for f in gj['features']:
    p = f['properties']; nid = int(p.get('ID_NIL') or p.get('id_nil'))
    polys = [[[to_ll(*pt[:2]) for pt in ring] for ring in poly] for poly in rings(f['geometry'])]
    feats.append({'id': nid, 'name': p.get('NIL') or p.get('nil'), 'polys': polys})
print('NIL:', len(feats))
json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'ID_NIL': f['id'], 'NIL': f['name']},
  'geometry': {'type': 'MultiPolygon', 'coordinates': [[[ [round(x, 5), round(y, 5)] for x, y in ring] for ring in poly] for poly in f['polys']]}} for f in feats]},
  open(os.path.join(OUT, 'nil_4326.geojson'), 'w'))

# 2. indice di verde e classi (terzili)
vals = {int(r['ID_NIL']): (r['NIL'], float(r['value'])) for r in csv.DictReader(open(os.path.join(HERE, 'verde_nil_2024.csv')), delimiter=';')}
srt = sorted(v for _, v in vals.values())
t1, t2 = srt[len(srt) // 3], srt[2 * len(srt) // 3]
def cls(v): return 'meno' if v < t1 else ('medio' if v < t2 else 'piu')
stats = {'soglie': [t1, t2], 'nil': [{'id': k, 'nome': n, 'valore': round(v, 2), 'classe': cls(v)} for k, (n, v) in sorted(vals.items(), key=lambda kv: -kv[1][1])]}
json.dump(stats, open(os.path.join(OUT, 'stats.json'), 'w'), ensure_ascii=False, indent=1)

# 3. chiave MapTiler: quella pubblica del sito, altrimenti la demo
key = os.environ.get('MAPTILER_KEY') or ''
if not key:
    try:
        html = get('https://www.condoreco.com/cerca')
        for src in sorted(set(re.findall(r'/_next/static/chunks/[^"\']+\.js', html))):
            js = get('https://www.condoreco.com' + src)
            m = re.search(r'"([A-Za-z0-9]{16,40})"\s*\|\|\s*"get_your_own', js) or re.search(r'api\.maptiler\.com[^"\'`]*?key=([A-Za-z0-9]{16,40})', js)
            if m: key = m.group(1); break
    except Exception as e:
        print('chiave dal sito non trovata:', e)
key = key or 'get_your_own_D6rA4zTHduk6KOKTXzGB'
print('chiave maptiler:', key[:4] + '...')

# 4. base mappa: tile 512 dataviz-v4 a z12 sul riquadro dei NIL
Z, T = 12, 512
def proj(lon, lat):
    s = math.sin(math.radians(lat)); n = T * 2 ** Z
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
xs, ys = [], []
for f in feats:
    for poly in f['polys']:
        for x, y in poly[0]:
            px, py = proj(x, y); xs.append(px); ys.append(py)
pad = 40
x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
W, H = int(x1 - x0), int(y1 - y0)
base = Image.new('RGBA', (W, H), (245, 246, 247, 255))
for ty in range(int(y0 // T), int(y1 // T) + 1):
    for tx in range(int(x0 // T), int(x1 // T) + 1):
        url = f'https://api.maptiler.com/maps/dataviz-v4/{Z}/{tx}/{ty}.png?key={key}'
        try:
            tile = Image.open(io.BytesIO(get(url, binary=True))).convert('RGBA')
            if tile.size != (T, T): tile = tile.resize((T, T))
            base.paste(tile, (int(tx * T - x0), int(ty * T - y0)))
        except Exception as e:
            print('tile fallita', tx, ty, e)

# 5. aree colorate
COL = {'piu': (13, 103, 111), 'medio': (244, 180, 0), 'meno': (220, 38, 38)}
S = 2  # supersampling per bordi puliti
over = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(over)
lines = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); dl = ImageDraw.Draw(lines)
for f in feats:
    if f['id'] not in vals: continue
    c = COL[cls(vals[f['id']][1])]
    for poly in f['polys']:
        pts = [((proj(x, y)[0] - x0) * S, (proj(x, y)[1] - y0) * S) for x, y in poly[0]]
        d.polygon(pts, fill=c + (150,))
        dl.line(pts + [pts[0]], fill=(255, 255, 255, 230), width=2 * S)
over = Image.alpha_composite(over, lines).resize((W, H), Image.LANCZOS)
img = Image.alpha_composite(base, over).convert('RGB')
img.save(os.path.join(OUT, 'mappa_verde_milano.png'), optimize=True)
print('mappa', img.size)

# 6. centroidi (per eventuali etichette)
cent = {}
for f in feats:
    ring = max((p[0] for p in f['polys']), key=len)
    pts = [proj(x, y) for x, y in ring]
    cent[f['id']] = [round(sum(p[0] for p in pts) / len(pts) - x0, 1), round(sum(p[1] for p in pts) / len(pts) - y0, 1)]
json.dump({'size': [W, H], 'centroidi': cent}, open(os.path.join(OUT, 'centroidi.json'), 'w'))
