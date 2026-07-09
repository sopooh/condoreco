// Logica centralizzata di calcolo punteggi.
// Quando aggiungeremo il sentiment Urbanfile, il peso va qui.

// Peso per tipo di rapporto con l'edificio (usato nel rating ponderato).
// Più alto = conta di più nel punteggio aggregato.
const RESIDENT_WEIGHTS = {
  resident:        1.0,   // Ci vivo
  former_resident: 0.8,   // Ci ho vissuto
  tenant:          0.8,   // Inquilino
  owner:           0.5,   // Conoscenza indiretta
  evaluating:      0.3,   // Visita / Prossimità
  agent:           0.2,   // Contatti indiretti
}
const VERIFIED_BOOST = 1.5  // bonus se il profilo è verificato con documento

// Badge di affidabilità da mostrare su ogni recensione.
// label: testo | tone: colore del tag | bars: 1-3 (livello fiducia visivo)
export const TRUST_BADGE = {
  resident: {
    label: 'Residente dichiarato',
    tone: 'teal',
    bars: 3,
  },
  former_resident: {
    label: 'Ex residente',
    tone: 'blue',
    bars: 2,
  },
  tenant: {
    label: 'Inquilino',
    tone: 'teal',
    bars: 2,
  },
  owner: {
    label: 'Conoscenza indiretta',
    tone: 'amber',
    bars: 1,
  },
  evaluating: {
    label: 'Visita / Prossimità',
    tone: 'slate',
    bars: 1,
  },
  agent: {
    label: 'Conoscenza indiretta',
    tone: 'amber',
    bars: 1,
  },
}

export function reviewWeight(review) {
  let w = RESIDENT_WEIGHTS[review.resident_type] ?? 0.5
  if (review.is_verified) w *= VERIFIED_BOOST
  return w
}

export function weightedScore(reviews, field = 'score') {
  if (!reviews || reviews.length === 0) return null
  let sum = 0, totalWeight = 0
  for (const r of reviews) {
    const val = r[field]
    if (val == null) continue
    const w = reviewWeight(r)
    sum += val * w
    totalWeight += w
  }
  if (totalWeight === 0) return null
  return Math.round((sum / totalWeight) * 10) / 10
}

export function scoreColor(score) {
  if (score == null) return 'var(--text-4)'
  if (score >= 4) return 'var(--teal)'
  if (score >= 3) return '#D97706'
  return '#DC2626'
}

export function scoreLevel(score) {
  if (score == null) return 'none'
  if (score >= 4) return 'high'
  if (score >= 3) return 'mid'
  return 'low'
}

export function autoTags(b) {
  const tags = []
  if (b.score_noise >= 4.3) tags.push({ label: 'Silenzioso', tone: 'green' })
  if (b.score_admin >= 4.3) tags.push({ label: 'Admin reattivo', tone: 'teal' })
  if (b.score_costs >= 4) tags.push({ label: 'Spese ok', tone: 'green' })
  if (b.score_costs != null && b.score_costs < 3) tags.push({ label: 'Spese alte', tone: 'red' })
  if (b.score_maintenance != null && b.score_maintenance < 3) tags.push({ label: 'Manutenzione lenta', tone: 'amber' })
  if (b.score_safety >= 4.3) tags.push({ label: 'Sicuro', tone: 'blue' })
  return tags
}

// ── Fasce spese condominiali ──
// L'utente inserisce il numero esatto, il sito mostra la fascia (privacy + leggibilita').
export function feeBand(monthlyFee) {
  if (monthlyFee == null) return null
  if (monthlyFee < 50)  return { label: 'Sotto 50€', tone: 'green', range: '< 50€/mese' }
  if (monthlyFee < 100) return { label: '50-100€',   tone: 'green', range: '50-100€/mese' }
  if (monthlyFee < 150) return { label: '100-150€',  tone: 'amber', range: '100-150€/mese' }
  if (monthlyFee < 250) return { label: '150-250€',  tone: 'amber', range: '150-250€/mese' }
  return { label: 'Oltre 250€', tone: 'red', range: '> 250€/mese' }
}

// Costo condominiale al mq (mensile)
export function costPerSqm(monthlyFee, sqm) {
  if (!monthlyFee || !sqm) return null
  return Math.round((monthlyFee / sqm) * 100) / 100
}

// Lista servizi presenti (per le icone tipo Booking)
export function buildingAmenities(b) {
  // Importata dinamicamente per evitare dipendenza circolare
  // Usa AMENITY_DB per mappare id → colonna
  const AMENITY_DB = {
    elevator:'has_elevator', concierge:'has_concierge', gym:'has_gym', pool:'has_pool',
    garden:'has_garden', terrace:'has_terrace', parking:'has_parking', box:'has_box',
    bike_room:'has_bike_room', ev_charging:'has_ev_charging', gate:'has_gate',
    basement:'has_basement', trash_room:'has_trash_room', courtyard:'has_courtyard',
    laundry:'has_laundry', common_room:'has_common_room', cctv:'has_cctv',
    disabled_access:'has_disabled_access', intercom:'has_intercom', fiber:'has_fiber',
  }
  const LABELS = {
    elevator:'Ascensore', concierge:'Portineria', gym:'Palestra', pool:'Piscina',
    garden:'Giardino', terrace:'Terrazzo comune', parking:'Parcheggio', box:'Box / garage',
    bike_room:'Deposito bici', ev_charging:'Colonnine elettriche', gate:'Cancello automatico',
    basement:'Cantina', trash_room:'Locale rifiuti', courtyard:'Cortile interno',
    laundry:'Lavanderia comune', common_room:'Sala comune', cctv:'Videosorveglianza',
    disabled_access:'Accesso disabili', intercom:'Citofono / videocitofono', fiber:'Fibra internet',
  }
  const list = Object.entries(AMENITY_DB)
    .filter(([, col]) => b[col])
    .map(([id]) => ({ id, label: LABELS[id] }))
  if (b.heating_type) list.push({ id: 'heating', label: b.heating_type })
  return list
}
