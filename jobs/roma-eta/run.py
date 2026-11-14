# Scoperta dati: età media per zona urbanistica di Roma + confini delle zone
import json, os, re, urllib.request, urllib.parse, io, traceback
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'discover.txt'), 'w')
def log(*a):
    print(*a); print(*a, file=LOG); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 condoreco-ig-job'}
def get(url, binary=True):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r: return r.read()
for base in ['https://dati.comune.roma.it/catalog/api/3/action/package_search', 'https://dati.comune.roma.it/api/3/action/package_search']:
    for q in ['zone urbanistiche', 'zona urbanistica popolazione', 'eta media', 'popolazione eta zona']:
        try:
            d = json.loads(get(base + '?rows=30&q=' + urllib.parse.quote(q)))
            log('##', base, q, d['result']['count'])
            for p in d['result']['results']:
                log('-', p['name'], '|', p['title'])
                for r in p['resources']: log('    ', r.get('format'), r.get('name'), r.get('url'))
        except Exception as e: log('ERR', base, q, repr(e))
# PDF annuario e report popolazione
import pdfplumber
for url in ['https://www.comune.roma.it/web-resources/cms/documents/02_Popolazione_Annuario_2025.pdf',
            'https://www.comune.roma.it/web-resources/cms/documents/03_Municipio_pop_2019.pdf']:
    try:
        b = get(url); log('## PDF', url, len(b))
        with pdfplumber.open(io.BytesIO(b)) as pdf:
            for i, pg in enumerate(pdf.pages):
                t = pg.extract_text() or ''
                if re.search(r'zon[ae] urbanistic', t, re.I):
                    log('--- pag', i + 1); log(t[:1500])
    except Exception as e: log('ERR', url, repr(e))
