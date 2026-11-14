# Età media per zona urbanistica (Ufficio di Statistica di Roma Capitale, schede municipio) + confini ZU da OSM
import json, os, re, io, urllib.request, urllib.parse
import pdfplumber
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'log.txt'), 'w')
def log(*a): print(*a); print(*a, file=LOG); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 condoreco-ig-job'}
def get(url, data=None):
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r: return r.read()
# 1. quale anno esiste
year = None
for y in range(2025, 2018, -1):
    try:
        b = get(f'https://www.comune.roma.it/web-resources/cms/documents/01_Municipio_pop_{y}.pdf'); year = y; log('anno', y, len(b)); break
    except Exception as e: log('no', y, repr(e)[:80])
rows = []
for m in range(1, 16):
    url = f'https://www.comune.roma.it/web-resources/cms/documents/{m:02d}_Municipio_pop_{year}.pdf'
    try:
        b = get(url)
    except Exception as e:
        log('ERR', url, repr(e)[:100]); continue
    with pdfplumber.open(io.BytesIO(b)) as pdf:
        for i, pg in enumerate(pdf.pages):
            t = pg.extract_text() or ''
            if re.search(r'et[àa] media', t, re.I):
                log(f'--- M{m} pag {i+1}'); log(t[:1200])
                for line in t.splitlines():
                    mm = re.match(r'^\s*(\d{1,3},\d)\s+(\d{1,2}[a-zA-Z])\s+(.+)$', line)
                    if mm: rows.append((m, mm.group(2).upper(), mm.group(3).strip(), float(mm.group(1).replace(',', '.'))))
log('righe', len(rows))
with open(os.path.join(OUT, 'eta_zu.csv'), 'w') as f:
    f.write('municipio,zu,nome,eta_media\n')
    for r in rows: f.write(f'{r[0]},{r[1]},"{r[2]}",{r[3]}\n')
# 2. confini zone urbanistiche da OSM (admin_level 11 dentro Roma)
q = '[out:json][timeout:170];area["name"="Roma"]["admin_level"="8"]->.r;rel(area.r)["boundary"="administrative"]["admin_level"="11"];out tags geom;'
try:
    d = json.loads(get('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data': q}).encode()))
    els = d.get('elements', [])
    log('OSM relazioni', len(els))
    for e in els[:200]: log('  ', e['tags'].get('ref'), e['tags'].get('name'))
    json.dump(els, open(os.path.join(OUT, 'osm_zu.json'), 'w'))
except Exception as e: log('ERR osm', repr(e))
