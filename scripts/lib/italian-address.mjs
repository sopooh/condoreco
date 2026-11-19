// Normalizzazione di nomi di vie italiane scritti in maiuscolo nei dataset
// pubblici (Comune di Milano ds634, ANNCSU): VIA DELL'ARTE -> Via dell'Arte.

const LOWER = new Set([
  'di', 'da', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'dal', 'dalla', 'dai', 'dalle',
  'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'e', 'ed', 'in', 'a', 'sul', 'sulla', 'per', 'con', 'tra', 'fra',
  // articolate elise: dell'Arte, sull'Isola (D' resta maiuscola: D'Annunzio)
  'dell', 'dall', 'all', 'sull', 'nell',
])
const D_SURNAMES = new Set(['annunzio', 'azeglio', 'acquisto', 'amico', 'alembert', 'ovidio', 'avanzo', 'agostino', 'alessandro', 'angelo', 'antona', 'arrigo', 'urso'])
const ROMAN = /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/
const ACCENT = { A: 'à', E: 'è', I: 'ì', O: 'ò', U: 'ù' }

export function capWord(w, first) {
  if (!w) return w
  // de' (Campo de' Fiori, San Vincenzo de' Paoli): preposizione tronca, non accento
  if (/^DE'$/i.test(w)) return first ? "De'" : "de'"
  // accento scritto come apostrofo finale: SAVARE' -> Savarè
  const acc = w.match(/^(.*)([AEIOU])'$/)
  if (acc) return capWord(acc[1], first) + ACCENT[acc[2]]
  // elisioni: DELL'ARTE -> dell'Arte, CORSO D'ITALIA -> Corso d'Italia,
  // ma i cognomi restano maiuscoli: D'Annunzio, D'Azeglio
  if (w.includes("'")) {
    const [a, ...rest] = w.split("'")
    const surname = /^d$/i.test(a) && D_SURNAMES.has((rest[0] || '').toLowerCase())
    const head = /^d$/i.test(a) && !first && !surname ? 'd' : capWord(a, first)
    return [head, ...rest.map((r) => capWord(r, true))].join("'")
  }
  if (w.includes('-')) return w.split('-').map((p, i) => capWord(p, first || i > 0)).join('-')
  const lw = w.toLowerCase()
  if (LOWER.has(lw)) return first ? lw.charAt(0).toUpperCase() + lw.slice(1) : lw
  if (ROMAN.test(w) && w.length > 1) return w
  return lw.charAt(0).toUpperCase() + lw.slice(1)
}

export function titleCase(s) {
  return s.trim().split(/\s+/).map((w, i) => capWord(w, i === 0)).join(' ')
}

export const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

