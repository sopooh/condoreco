// Interpreta una ricerca libera di indirizzo ("via san dionigi 11, Milano"):
// parole della via (senza "via", "viale"...), civico e città se dopo una virgola.
const STREET_TYPES = new Set([
  'via', 'v', 'viale', 'vle', 'piazza', 'p', 'pza', 'piazzale', 'p.le', 'ple', 'corso', 'c.so', 'cso',
  'largo', 'lgo', 'vicolo', 'strada', 'str', 'piazzetta', 'galleria', 'bastioni', 'alzaia', 'ripa', 'lungo',
])

const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function parseAddressQuery(raw) {
  const q = String(raw || '').trim()
  if (!q) return { words: [], civic: null, city: null, street: '' }
  const [streetPart, ...rest] = q.split(',')
  const city = rest.join(',').trim() || null
  let tokens = streetPart.trim().split(/\s+/).filter(Boolean)
  let civic = null
  const last = tokens[tokens.length - 1]
  if (tokens.length > 1 && /^\d+[a-z]?(\/\d*[a-z]?)?$/i.test(last)) { civic = last.toLowerCase(); tokens = tokens.slice(0, -1) }
  const street = tokens.join(' ')
  const words = tokens
    .map((t) => clean(t).replace(/[^a-z0-9']/g, ''))
    .filter((t) => t.length >= 2 && !STREET_TYPES.has(t))
  return { words, civic, city, street }
}

// per i filtri ilike: niente caratteri jolly o separatori di PostgREST
export const ilikeSafe = (w) => w.replace(/[%_,()*\\]/g, '')

export const sameCivic = (a, b) => String(a || '').toLowerCase().replace(/\s+/g, '') === String(b || '').toLowerCase().replace(/\s+/g, '')
