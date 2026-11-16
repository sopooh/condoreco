// Stima indicativa dei millesimi di proprietà generale a partire da metri
// quadri e spese mensili dichiarati dal residente, confrontati con i dati
// medi del condominio. NON sostituisce la tabella millesimale: i millesimi
// reali dipendono da piano, esposizione, pertinenze e coefficienti.
export function estimateMillesimi({ mySqm, myFee, units, avgSqm, avgFee }) {
  const n = Number(units)
  if (!(n >= 2)) return null
  const estimates = []
  const sqm = Number(mySqm)
  if (sqm > 0) {
    const totalSqm = n * (Number(avgSqm) > 0 ? Number(avgSqm) : sqm)
    estimates.push((sqm / totalSqm) * 1000)
  }
  const fee = Number(myFee)
  if (fee > 0 && Number(avgFee) > 0) estimates.push((fee / (n * Number(avgFee))) * 1000)
  if (!estimates.length) return null
  const mid = Math.min(999, estimates.reduce((a, b) => a + b, 0) / estimates.length)
  const low = Math.max(1, mid * 0.75)
  const high = Math.min(1000, mid * 1.25)
  // spesa annua dell'intero condominio, ricavata dalla tua quota
  const yearlyTotal = fee > 0 ? Math.round((fee * 12) / (mid / 1000)) : null
  return { mid, low, high, yearlyTotal }
}

export const fmtMill = (v) => v.toLocaleString('it-IT', { maximumFractionDigits: v < 10 ? 2 : 1 })
