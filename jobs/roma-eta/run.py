# Giovani e anziani per zona urbanistica di Roma + confini ZU da OSM
import json, os, re, io, urllib.request, urllib.parse
import pdfplumber
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'log.txt'), 'w')
def log(*a): print(*a); print(*a, file=LOG); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) condoreco-ig-job/1.0', 'Accept': '*/*'}
def get(url, data=None):
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r: return r.read()
# A. Istat approfondimento Roma (censimento permanente) e allegati
for url in []:
    try:
        b = get(url); log('## ISTAT', url, len(b))
        with pdfplumber.open(io.BytesIO(b)) as pdf:
            log('pagine', len(pdf.pages))
            for i, pg in enumerate(pdf.pages):
                t = pg.extract_text() or ''
                if re.search(r'vecchiaia|et[àa] media|allegato', t, re.I): log(f'--- pag {i+1}'); log(t[:2500])
    except Exception as e: log('ERR', url, repr(e))
# B. schede municipio 2019: indice di vecchiaia per z.u.
rows = []
for m in []:
    url = f'https://www.comune.roma.it/web-resources/cms/documents/{m:02d}_Municipio_pop_2019.pdf'
    try: b = get(url)
    except Exception as e: log('ERR', url, repr(e)[:100]); continue
    with pdfplumber.open(io.BytesIO(b)) as pdf:
        for pg in pdf.pages:
            t = pg.extract_text() or ''
            if 'Indice di vecchiaia per z.u.' in t:
                for line in t.splitlines():
                    mm = re.match(r'^\s*([\d.]+,\d)\s+(\d{1,2}[a-zA-Z])\s+(.+)$', line)
                    if mm: rows.append((m, mm.group(2).upper(), mm.group(3).strip(), float(mm.group(1).replace('.', '').replace(',', '.'))))
log('righe vecchiaia', len(rows))
if rows:
  with open(os.path.join(OUT, 'vecchiaia_zu_2019.csv'), 'w') as f:
    f.write('municipio,zu,nome,indice_vecchiaia\n')
    for r in rows: f.write(f'{r[0]},{r[1]},"{r[2]}",{r[3]}\n')
# C. confini zone urbanistiche da OSM
q = '[out:json][timeout:170];rel["boundary"="administrative"]["admin_level"="11"](41.65,12.20,42.10,12.86);out tags geom;'
for ep in ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']:
    try:
        d = json.loads(get(ep + '?' + urllib.parse.urlencode({'data': q})))
        els = d.get('elements', []); log('OSM', ep, len(els))
        for e in els: log('  ', e['tags'].get('ref'), '|', e['tags'].get('name'))
        json.dump(els, open(os.path.join(OUT, 'osm_zu.json'), 'w')); break
    except Exception as e: log('ERR osm', ep, repr(e))

# D. fallback Istat basi territoriali 2021 Lazio: sezioni con codice ASC (zone urbanistiche)
if not os.path.exists(os.path.join(OUT, 'osm_zu.json')) or len(json.load(open(os.path.join(OUT, 'osm_zu.json')))) < 100:
    import zipfile, shapefile
    for url in ['https://www.istat.it/storage/cartografia/basi_territoriali/2021/R12_21.zip', 'https://www.istat.it/storage/cartografia/basi_territoriali/WGS_84_UTM/2011/R12_11_WGS84.zip']:
        try:
            b = get(url); log('ISTAT BT', url, len(b))
            z = zipfile.ZipFile(io.BytesIO(b)); log(z.namelist()[:40])
            shp = [n for n in z.namelist() if n.lower().endswith('.shp')]
            for n in shp:
                base = n[:-4]
                r = shapefile.Reader(shp=io.BytesIO(z.read(base + '.shp')), dbf=io.BytesIO(z.read(base + '.dbf')))
                log('layer', n, len(r), [f[0] for f in r.fields[1:]])
                log('  es', r.record(0))
            z.extractall(os.path.join(HERE, 'tmp_bt'))
            break
        except Exception as e: log('ERR bt', url, repr(e))
