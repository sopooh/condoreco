// Date "di calendario" (YYYY-MM-DD) calcolate nell'ora locale del browser.
// Non usare toISOString() per questo: converte in UTC, e in Italia la
// mezzanotte locale diventa le 22/23 del giorno prima, spostando i giorni.
export function toLocalISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Prima e ultima data visibili nella griglia mensile (lunedi-domenica, 6 settimane)
export function monthGridRange(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7))
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41)
  return { start, end }
}
