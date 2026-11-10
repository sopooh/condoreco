// Ricerca per corrispondenza o somiglianza (errori di battitura, accenti,
// parole in ordine diverso, sinonimi comuni in ambito condominiale).

const SYNONYMS = [
  ['assemblea', 'riunione', 'verbale', 'convocazione', 'delibera'],
  ['avviso', 'comunicazione', 'circolare', 'comunicato'],
  ['bilancio', 'rendiconto', 'consuntivo', 'preventivo', 'spese', 'riparto', 'quote', 'rate'],
  ['catasto', 'catastale', 'visura', 'planimetria', 'mappa'],
  ['millesimi', 'millesimale', 'tabella'],
  ['regolamento', 'regole', 'statuto'],
  ['manutenzione', 'intervento', 'riparazione', 'lavori', 'guasto'],
  ['bollettino', 'rapportino', 'lavorazione', 'sal', 'avanzamento'],
  ['certificato', 'certificazione', 'collaudo', 'verifica', 'conformita'],
  ['ascensore', 'elevatore'],
  ['caldaia', 'riscaldamento', 'termosifoni', 'centrale termica'],
  ['assicurazione', 'polizza', 'sinistro'],
  ['contratto', 'accordo', 'fornitore'],
  ['fattura', 'ricevuta', 'pagamento'],
]

export function normalize(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

const tokens = (s) => normalize(s).split(' ').filter((t) => t.length > 0)

// distanza di Levenshtein con uscita anticipata oltre max
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

function expand(t) {
  const out = new Set([t])
  for (const group of SYNONYMS) {
    if (group.some((w) => w === t || (t.length >= 4 && w.startsWith(t)) || (w.length >= 4 && t.startsWith(w)))) group.forEach((w) => out.add(w))
  }
  return [...out]
}

// punteggio 0..1 di quanto il token della query corrisponde a una parola del testo
function tokenScore(q, words) {
  let best = 0
  for (const w of words) {
    if (w === q) return 1
    if (w.startsWith(q)) best = Math.max(best, q.length >= 3 ? 0.9 : 0.6)
    else if (q.length >= 4 && w.includes(q)) best = Math.max(best, 0.75)
    else if (q.length >= 4 && w.length >= 4) {
      const max = q.length >= 8 ? 2 : 1
      const d = lev(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 1))), max)
      if (d <= max) best = Math.max(best, 0.7 - d * 0.12)
    }
  }
  return best
}

// fields: [{ text, weight }]. Restituisce un punteggio > 0 se c'è corrispondenza.
export function matchScore(query, fields) {
  const qTokens = tokens(query)
  if (!qTokens.length) return 1
  const full = normalize(query)
  let total = 0
  for (const f of fields) {
    const text = normalize(f.text)
    if (full.length >= 3 && text.includes(full)) total += 2 * f.weight
  }
  let matched = 0
  for (const qt of qTokens) {
    let best = 0
    for (const f of fields) {
      const words = tokens(f.text)
      const direct = tokenScore(qt, words)
      const syn = expand(qt).filter((s) => s !== qt).reduce((m, s) => Math.max(m, tokenScore(s, words) * 0.6), 0)
      best = Math.max(best, Math.max(direct, syn) * f.weight)
    }
    if (best > 0) matched++
    total += best
  }
  // tutte le parole devono trovare qualcosa (anche per somiglianza)
  if (matched < qTokens.length) return 0
  return total
}

export function fuzzyFilter(items, query, getFields) {
  if (!normalize(query)) return items
  return items
    .map((it) => ({ it, s: matchScore(query, getFields(it)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it)
}
