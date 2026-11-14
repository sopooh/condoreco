# Mappa delle zone urbanistiche di Roma per indice di vecchiaia (Roma Capitale, 2019)
# Confini: Istat basi territoriali 2021 (sezioni di censimento unite per area sub-comunale)
import csv, io, json, math, os, re, unicodedata, urllib.request, zipfile
import shapefile
from shapely.geometry import shape, mapping
from shapely.ops import unary_union, transform
from pyproj import Transformer
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'log.txt'), 'w')
def log(*a): print(*a); print(*a, file=LOG); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 condoreco-ig-job/1.0', 'Accept': '*/*'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=240) as r: return r.read()
def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
z = zipfile.ZipFile(io.BytesIO(get('https://www.istat.it/storage/cartografia/basi_territoriali/2021/R12_21.zip')))
prj = z.read('SHP/R12_21_WGS84.prj').decode(); log('prj', prj[:120])
for n in ['TAB/ASC1_R12_21.csv', 'TAB/ASC2_R12_21.csv', 'TAB/ASC3_R12_21.csv']:
    txt = z.read(n).decode('latin-1'); lines = txt.splitlines(); log(n, len(lines)); log('  ', lines[:4])
# zone urbanistiche Comune (2019)
zu = {}
for r in csv.DictReader(open(os.path.join(OUT, 'vecchiaia_zu_2019.csv'))):
    zu[r['zu']] = {'nome': r['nome'], 'v': float(r['indice_vecchiaia']), 'mun': int(r['municipio'])}
log('zu comune', len(zu))
# scegli il livello ASC che corrisponde alle zone urbanistiche
best = None
for lvl in (1, 2, 3):
    rows = list(csv.reader(io.StringIO(z.read(f'TAB/ASC{lvl}_R12_21.csv').decode('latin-1')), delimiter=';'))
    hdr = rows[0]; data = [r for r in rows[1:] if r and '58091' in ''.join(r[:3])]
    log('lvl', lvl, hdr, len(data), data[:3])
    if 140 <= len(data) <= 170: best = (lvl, hdr, data)
lvl, hdr, data = best
log('livello ZU =', lvl)
# mappa codice ASC -> codice ZU comune via nome
names = {norm(v['nome']): k for k, v in zu.items()}
asc2zu = {}
for r in data:
    code = next((c for c in r if re.fullmatch(r'\d{1,3}', c.strip() or 'x')), None)
    txt = ' '.join(r)
    mm = re.search(r'\b(\d{1,2}[A-Za-z])\b', txt)
    key = mm.group(1).upper() if mm else None
    if key not in zu:
        for c in r:
            if norm(c) in names: key = names[norm(c)]; break
            nc = norm(re.sub(r'^\s*\d{1,2}[A-Za-z]\s*', '', c))
            if nc in names: key = names[nc]; break
    asc2zu[r] = key if False else None
    asc2zu[tuple(r)] = key
log('match', sum(1 for v in asc2zu.values() if v), 'su', len(data))
log('non trovati', [list(k) for k, v in asc2zu.items() if not v][:20])
# sezioni Roma -> unione per ZU
r = shapefile.Reader(shp=io.BytesIO(z.read('SHP/R12_21_WGS84.shp')), dbf=io.BytesIO(z.read('SHP/R12_21_WGS84.dbf')))
f_idx = {f[0]: i for i, f in enumerate(r.fields[1:])}
ascf = f'COM_ASC{lvl}'
groups, pop = {}, {}
# codice ASC nella tabella: cerca la colonna che contiene il valore COM_ASC
for sr in r.iterShapeRecords():
    rec = sr.record
    if rec[f_idx['PRO_COM']] != 58091: continue
    a = rec[f_idx[ascf]]
    groups.setdefault(a, []).append(shape(sr.shape.__geo_interface__)); pop[a] = pop.get(a, 0) + rec[f_idx['POP21']]
log('gruppi ASC', len(groups), list(groups)[:10])
# collega i codici ASC numerici alle righe della tabella
code2zu = {}
for row, key in asc2zu.items():
    for c in row:
        c = c.strip()
        if c.isdigit() and int(c) in groups: code2zu[int(c)] = key
log('codici collegati', len(code2zu))
tr = Transformer.from_crs('EPSG:32632', 'EPSG:4326', always_xy=True)
feats = []
for a, geoms in groups.items():
    key = code2zu.get(a)
    g = transform(tr.transform, unary_union(geoms).buffer(0)).simplify(0.0003)
    feats.append({'asc': a, 'zu': key, 'pop': pop[a], 'geom': g})
json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'asc': f['asc'], 'zu': f['zu'], 'pop21': f['pop']}, 'geometry': mapping(f['geom'])} for f in feats]}, open(os.path.join(OUT, 'zu_4326.geojson'), 'w'))
# classi su zone con almeno 1000 abitanti
vals = [zu[f['zu']]['v'] for f in feats if f['zu'] in zu and f['pop'] >= 1000]
srt = sorted(vals); t1, t2 = srt[len(srt) // 3], srt[2 * len(srt) // 3]
def cls(v): return 'giovani' if v < t1 else ('medio' if v < t2 else 'anziani')
stats = {'soglie': [t1, t2], 'zu': sorted([{'zu': f['zu'], 'nome': zu[f['zu']]['nome'], 'mun': zu[f['zu']]['mun'], 'vecchiaia': zu[f['zu']]['v'], 'pop21': f['pop'], 'classe': cls(zu[f['zu']]['v'])} for f in feats if f['zu'] in zu and f['pop'] >= 1000], key=lambda x: x['vecchiaia'])}
json.dump(stats, open(os.path.join(OUT, 'stats.json'), 'w'), ensure_ascii=False, indent=1)
log('classificate', len(stats['zu']), 'soglie', t1, t2)
# mappa
key = 'get_your_own_D6rA4zTHduk6KOKTXzGB'
Z, T = 11, 512
def proj(lon, lat):
    s = math.sin(math.radians(lat)); n = T * 2 ** Z
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
def polys(g): return [g] if g.geom_type == 'Polygon' else list(g.geoms)
xs, ys = [], []
for f in feats:
    for p in polys(f['geom']):
        for x, y in p.exterior.coords: px, py = proj(x, y); xs.append(px); ys.append(py)
pad = 30; x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
W, H = int(x1 - x0), int(y1 - y0); log('dimensioni', W, H)
base = Image.new('RGBA', (W, H), (245, 246, 247, 255))
for ty in range(int(y0 // T), int(y1 // T) + 1):
    for tx in range(int(x0 // T), int(x1 // T) + 1):
        try:
            tile = Image.open(io.BytesIO(get(f'https://api.maptiler.com/maps/dataviz-v4/{Z}/{tx}/{ty}.png?key={key}'))).convert('RGBA')
            if tile.size != (T, T): tile = tile.resize((T, T))
            base.paste(tile, (int(tx * T - x0), int(ty * T - y0)))
        except Exception as e: log('tile', tx, ty, e)
COL = {'giovani': (13, 103, 111), 'medio': (244, 180, 0), 'anziani': (232, 101, 26)}
S = 2
over = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(over)
lines = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); dl = ImageDraw.Draw(lines)
for f in feats:
    ok = f['zu'] in zu and f['pop'] >= 1000
    c = COL[cls(zu[f['zu']]['v'])] + (160,) if ok else (150, 150, 150, 70)
    for p in polys(f['geom']):
        pts = [((proj(x, y)[0] - x0) * S, (proj(x, y)[1] - y0) * S) for x, y in p.exterior.coords]
        d.polygon(pts, fill=c); dl.line(pts, fill=(255, 255, 255, 230), width=S)
over = Image.alpha_composite(over, lines).resize((W, H), Image.LANCZOS)
Image.alpha_composite(base, over).convert('RGB').save(os.path.join(OUT, 'mappa_eta_roma.png'), optimize=True)
log('fatto')
