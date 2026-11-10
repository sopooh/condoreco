// "Oggi, 10:24" / "Ieri, 18:42" / "3 nov"
export function relTime(iso) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  const hm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diffDays <= 0) return `Oggi, ${hm}`
  if (diffDays === 1) return `Ieri, ${hm}`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
