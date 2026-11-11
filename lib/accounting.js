// Contabilità: voci di spesa, formati, lettura estratto conto e abbinamento ai pagamenti attesi.

export const SPESA_CATEGORIES = [
  { id: 'maintenance', label: 'Manutenzione', color: '#0D676F' },
  { id: 'services', label: 'Servizi (pulizie, rifiuti)', color: '#5EC4C8' },
  { id: 'utilities', label: 'Utenze comuni', color: '#86D99B' },
  { id: 'insurance', label: 'Assicurazione', color: '#F2B544' },
  { id: 'admin', label: 'Amministrazione', color: '#9B8AFB' },
  { id: 'other', label: 'Altre spese', color: '#D5DCDD' },
]
export const categoryOf = (id) => SPESA_CATEGORIES.find((c) => c.id === id) || SPESA_CATEGORIES.at(-1)

export const CHARGE_STATUS = {
  open: { label: 'Da pagare', bg: '#FFF7E6', fg: '#8A5A00' },
  overdue: { label: 'Scaduta', bg: '#FEF3F2', fg: '#B42318' },
  pending: { label: 'Da confermare', bg: '#EEF4FF', fg: '#1D4ED8' },
  paid: { label: 'Pagata', bg: '#ECFDF3', fg: '#067647' },
  cancelled: { label: 'Annullata', bg: '#F2F4F7', fg: '#667085' },
}
export const METHOD_LABEL = { bonifico: 'Bonifico', carta: 'Carta', paypal: 'PayPal', contanti: 'Contanti', altro: 'Altro' }

// "€ 1.234,56" (simbolo davanti, come nei riepiloghi bancari)
export const euro = (n, opts = {}) =>
  `€ ${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always', ...opts }).format(Number(n) || 0)}`

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const isOverdue = (c, today = todayISO()) => c.status === 'open' && c.due_date < today
export const statusKey = (c, today) => (isOverdue(c, today) ? 'overdue' : c.status)
export const fmtDay = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

// Causale da usare nel bonifico: contiene i codici delle rate, che l'import riconosce
export const causaleFor = (charges, name) =>
  `Condominio ${charges.map((c) => `CR-${c.code}`).join(' ')}${name ? ` ${name}` : ''}`.slice(0, 140)

export function normalizeIban(s = '') {
  return s.replace(/\s+/g, '').toUpperCase()
}
export function formatIban(s = '') {
  return normalizeIban(s).replace(/(.{4})/g, '$1 ').trim()
}

/* ───────────── Estratto conto ───────────── */

const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// "1.234,56" / "1234.56" / "-50,00" / "€ 50" → numero
export function parseAmount(v) {
  if (typeof v === 'number') return v
  let s = String(v ?? '').replace(/[€\s]/g, '').replace(/^\((.*)\)$/, '-$1')
  if (!s) return NaN
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (s.includes(',')) s = s.replace(',', '.')
  return Number(s)
}

// 31/12/2026, 31-12-26, 2026-12-31, data Excel → 'YYYY-MM-DD'
export function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

function splitCsv(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || ''
  const sep = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => String(c).trim()))
}

const COLS = {
  date: ['data valuta', 'data contabile', 'data operazione', 'data', 'date', 'valuta'],
  amount: ['importo', 'amount', 'importo eur', 'importo (eur)'],
  credit: ['entrate', 'avere', 'accrediti', 'accredito', 'dare/avere avere'],
  debit: ['uscite', 'dare', 'addebiti', 'addebito'],
  desc: ['descrizione', 'causale', 'descrizione operazione', 'dettagli', 'description', 'motivazione', 'causale descrizione'],
  payer: ['ordinante', 'controparte', 'beneficiario/ordinante', 'nome ordinante', 'mittente'],
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = rows[i].map(norm)
    const has = (keys) => cells.findIndex((c) => keys.some((k) => c === k || c.startsWith(k)))
    const date = has(COLS.date)
    const amount = has(COLS.amount)
    const credit = has(COLS.credit)
    if (date >= 0 && (amount >= 0 || credit >= 0)) {
      return { index: i, date, amount, credit, debit: has(COLS.debit), desc: has(COLS.desc), payer: has(COLS.payer) }
    }
  }
  return null
}

// Legge CSV o Excel della banca → [{ date, amount, description, payer, fingerprint }] (solo entrate)
export async function readBankFile(file) {
  let rows
  if (/\.xls$/i.test(file.name)) return { error: 'Il vecchio formato .xls non si legge: aprilo e salvalo come .xlsx o CSV.' }
  if (/\.xlsx$/i.test(file.name)) {
    try {
      const { readSheet } = await import('read-excel-file/browser')
      rows = (await readSheet(file)).map((r) => r.map((c) => (c == null ? '' : c)))
    } catch {
      return { error: 'Non riesco a leggere il file Excel. Prova a esportarlo in CSV.' }
    }
  } else {
    const buf = await file.arrayBuffer()
    let text = new TextDecoder('utf-8').decode(buf)
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf)
    rows = splitCsv(text)
  }
  const h = findHeader(rows)
  if (!h) return { error: 'Non trovo le colonne Data e Importo nel file. Esporta i movimenti in CSV o Excel dalla banca.' }
  const out = []
  for (const r of rows.slice(h.index + 1)) {
    const date = parseDate(r[h.date])
    let amount = h.amount >= 0 ? parseAmount(r[h.amount]) : NaN
    if ((isNaN(amount) || amount === 0) && h.credit >= 0) amount = parseAmount(r[h.credit])
    if (!date || isNaN(amount) || amount <= 0) continue // solo bonifici in entrata
    const description = h.desc >= 0 ? String(r[h.desc] ?? '').trim() : r.filter((_, i) => ![h.date, h.amount, h.credit, h.debit].includes(i)).join(' ').trim()
    const payer = h.payer >= 0 ? String(r[h.payer] ?? '').trim() : ''
    out.push({ date, amount: Math.round(amount * 100) / 100, description, payer, fingerprint: `${date}|${amount.toFixed(2)}|${norm(description).slice(0, 120)}|${norm(payer)}` })
  }
  if (!out.length) return { error: 'Nel file non ci sono entrate da abbinare.' }
  return { rows: out }
}

// Abbina ogni entrata a una rata aperta:
// 1) codice CR-XXXXXXXX nella causale (certo)
// 2) stesso importo + nome del condomino nella causale/ordinante (probabile)
// 3) stesso importo e una sola rata possibile (da verificare)
export function matchMovements(rows, charges, members) {
  const open = charges.filter((c) => c.status === 'open' || c.status === 'pending')
  const byCode = Object.fromEntries(open.map((c) => [c.code, c]))
  const nameOf = Object.fromEntries(members.map((m) => [m.user_id, m.display_name || '']))
  const used = new Set()
  return rows.map((r) => {
    const text = norm(`${r.description} ${r.payer}`)
    const codes = [...`${r.description} ${r.payer}`.toUpperCase().matchAll(/CR-?([0-9A-F]{8})/g)].map((m) => m[1])
    for (const code of codes) {
      const c = byCode[code]
      if (c && !used.has(c.id)) { used.add(c.id); return { ...r, charge: c, confidence: 'certo' } }
    }
    const same = open.filter((c) => !used.has(c.id) && Math.abs(Number(c.amount) - r.amount) < 0.005)
    const named = same.filter((c) => {
      const parts = norm(nameOf[c.user_id]).split(/\s+/).filter((p) => p.length >= 3)
      return parts.length && parts.some((p) => text.includes(p))
    }).sort((a, b) => a.due_date.localeCompare(b.due_date))
    if (named.length) { used.add(named[0].id); return { ...r, charge: named[0], confidence: 'probabile' } }
    if (same.length === 1) { used.add(same[0].id); return { ...r, charge: same[0], confidence: 'da verificare' } }
    return { ...r, charge: null, confidence: null }
  })
}
