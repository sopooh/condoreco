// Nome e cognome legali per l'area condominio (niente nickname). Stesse
// regole di public.legal_name_ok nel database.
const RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]*[A-Za-zÀ-ÖØ-öø-ÿ.]$/

export function cleanName(v) {
  return (v || '').trim().replace(/\s+/g, ' ')
}

export function legalNameError(v, what = 'Il nome') {
  const s = cleanName(v)
  if (!s) return `${what} è obbligatorio.`
  if (s.length < 2 || s.length > 60) return `${what} deve avere tra 2 e 60 lettere.`
  if (!RE.test(s) || /(.)\1\1/.test(s)) return `${what} può contenere solo lettere, spazi, apostrofi e trattini.`
  return null
}

// Il nome sul documento corrisponde (in modo approssimato) a quello dichiarato?
export function namesMatch(declared, onDocument) {
  if (!declared || !onDocument) return null
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1)
  const doc = new Set(norm(onDocument))
  const words = norm(declared)
  return words.length > 0 && words.every((w) => doc.has(w))
}
