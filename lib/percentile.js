// Percentili di confronto tra condomini "simili", usati sulla pagina edificio
// (barra di ranking generale, rating per categoria, card "Confronto con
// condomini simili"). Mai un numero inventato: sotto la soglia minima di
// campione si torna null e la UI mostra "Dati insufficienti per il confronto".

const MIN_COHORT = 5

// Percentuale del cohort che il valore batte (pareggi contano per metà).
// Es. value migliore di 8/10 e pari con 2/10 → (8 + 2*0.5) / 10 = 90%.
export function percentileRank(value, pool) {
  if (value == null) return null
  const clean = pool.filter((v) => v != null)
  if (clean.length < MIN_COHORT) return null
  let worse = 0
  let equal = 0
  for (const v of clean) {
    if (v < value) worse++
    else if (v === value) equal++
  }
  return Math.round(((worse + equal * 0.5) / clean.length) * 100)
}

// Cohort di edifici comparabili: prova prima stesso quartiere+città, poi
// allarga alla sola città se il campione è troppo piccolo. Esclude sempre
// l'edificio stesso.
export function buildCohort(building, allBuildings) {
  const others = allBuildings.filter((b) => b.id !== building.id)

  if (building.neighborhood) {
    const sameNeighborhood = others.filter(
      (b) => b.city === building.city && b.neighborhood === building.neighborhood
    )
    if (sameNeighborhood.length >= MIN_COHORT) return sameNeighborhood
  }

  const sameCity = others.filter((b) => b.city === building.city)
  return sameCity
}

const SCORE_FIELDS = ['score', 'score_noise', 'score_safety', 'score_quality', 'score_maintenance', 'score_costs', 'score_admin']

// Percentili dell'edificio su score generale + le 6 sottocategorie, rispetto
// al cohort di edifici comparabili. Ritorna null se il cohort non raggiunge
// la soglia minima di campione.
export function buildingPercentiles(building, allBuildings) {
  const cohort = buildCohort(building, allBuildings)
  if (cohort.length < MIN_COHORT) return null

  const result = { sampleSize: cohort.length }
  for (const field of SCORE_FIELDS) {
    result[field] = percentileRank(building[field], cohort.map((b) => b[field]))
  }
  return result
}

export { MIN_COHORT }
