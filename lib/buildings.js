import { createClient } from '@/lib/supabase/client'

// Crea un condominio non ancora online, sempre in stato 'pending' (etichetta
// IT "In verifica"). Il retry di compatibilità gestisce il caso in cui
// colonne opzionali non siano ancora presenti sul DB collegato: prova
// l'insert completo, e solo se fallisce per colonna/constraint mancante
// riprova con un payload ridotto.
export async function createPendingBuilding(payload) {
  const supabase = createClient()
  const fullRow = {
    address: payload.address,
    street_number: payload.street_number || null,
    city: payload.city,
    neighborhood: payload.neighborhood || null,
    postal_code: payload.postal_code || null,
    lat: payload.lat,
    lng: payload.lng,
    year_built: payload.year_built,
    floors: payload.floors,
    units: payload.units,
    has_elevator: !!payload.has_elevator,
    has_garden: !!payload.has_garden,
    heating_type: payload.heating_type || null,
    administrator_id: payload.administrator_id || null,
    administrator_name_pending: payload.administrator_name_pending || null,
    building_state: payload.building_state || null,
    monthly_fee: payload.monthly_fee,
    monthly_fee_building: payload.monthly_fee_building,
    is_supercondominio: !!payload.is_supercondominio,
    monthly_fee_super: payload.monthly_fee_super,
    avg_sqm: payload.avg_sqm,
    has_pool: !!payload.has_pool,
    has_gym: !!payload.has_gym,
    has_concierge: !!payload.has_concierge,
    has_parking: !!payload.has_parking,
    has_stairs_cleaning: !!payload.has_stairs_cleaning,
    status: 'pending',
    created_by: payload.created_by,
  }

  const first = await supabase.from('buildings').insert(fullRow).select('id').single()
  if (!first.error) return first

  const msg = `${first.error?.message || ''} ${first.error?.details || ''}`.toLowerCase()
  const retryRow = { ...fullRow }

  if (msg.includes('column') && msg.includes('does not exist')) {
    delete retryRow.administrator_name_pending
    delete retryRow.building_state
    delete retryRow.monthly_fee_building
    delete retryRow.is_supercondominio
    delete retryRow.monthly_fee_super
    delete retryRow.has_pool
    delete retryRow.has_gym
    delete retryRow.has_concierge
    delete retryRow.has_parking
    delete retryRow.has_stairs_cleaning
    delete retryRow.status
  }

  if (msg.includes('foreign key') && msg.includes('created_by')) {
    delete retryRow.created_by
  }

  if (msg.includes('buildings_status_check') || (msg.includes('check constraint') && msg.includes('status'))) {
    delete retryRow.status
  }

  if (Object.keys(retryRow).length === Object.keys(fullRow).length && retryRow.created_by === fullRow.created_by) {
    return first
  }

  const second = await supabase.from('buildings').insert(retryRow).select('id').single()
  return second.error ? first : second
}

// Cerca un condominio già esistente che assomiglia ai dati appena inseriti
// (posizione, indirizzo, struttura), per evitare doppioni quando un utente
// prova ad aggiungere un edificio già presente. Strategia a cascata: vicinanza
// sul pin → stessa città → match testuale sull'indirizzo → fallback su
// building_scores/buildings grezzo se la view è vuota → ranking client-side.
export async function findSimilarBuilding({ city, address, streetNumber, lat, lng, yearBuilt, floors, units }) {
  if (!city || !address) return { data: null, error: null, debug: { reason: 'missing-city-or-address' } }
  const supabase = createClient()

  const norm = (s) => `${s || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const numOnly = (s) => `${s || ''}`.match(/\d+/)?.[0] || ''
  const addressNorm = norm(address)
  const streetNumNorm = numOnly(streetNumber)

  const columns = 'id, address, street_number, city, neighborhood, year_built, floors, units, monthly_fee, review_count, lat, lng'
  let candidates = []
  const normalizeBuildingsRows = (rows = []) => rows.map((r) => ({ ...r, review_count: r.review_count ?? 0 }))
  let stage = 'none'

  // 1) Primary strategy: nearby buildings around the dropped pin.
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const latDelta = 0.02
    const lngDelta = 0.03
    const near = await supabase
      .from('building_scores')
      .select(columns)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .limit(250)
    if (near.error) return { data: null, error: near.error, debug: { stage: 'nearby' } }
    candidates = near.data || []
    stage = 'building_scores_nearby'
  }

  // 2) Fallback: same city (covers wrong coordinates or missing lat/lng).
  if (!candidates.length) {
    const cityRes = await supabase
      .from('building_scores')
      .select(columns)
      .ilike('city', city)
      .limit(250)
    if (cityRes.error) return { data: null, error: cityRes.error, debug: { stage: 'city' } }
    candidates = cityRes.data || []
    stage = 'building_scores_city'
  }

  // 3) Last fallback: loose textual search by first meaningful token.
  if (!candidates.length) {
    const token = addressNorm.split(' ').find((t) => t.length >= 3)
    if (token) {
      const textRes = await supabase
        .from('building_scores')
        .select(columns)
        .ilike('address', `%${token}%`)
        .limit(250)
      if (textRes.error) return { data: null, error: textRes.error, debug: { stage: 'text' } }
      candidates = textRes.data || []
      stage = 'building_scores_text'
    }
  }

  // 4) Hard fallback: read raw buildings table (works even when view is empty/outdated).
  if (!candidates.length) {
    const bCols = 'id, address, street_number, city, neighborhood, year_built, floors, units, monthly_fee, lat, lng'
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const latDelta = 0.03
      const lngDelta = 0.04
      const nearBuildings = await supabase
        .from('buildings')
        .select(bCols)
        .gte('lat', lat - latDelta)
        .lte('lat', lat + latDelta)
        .gte('lng', lng - lngDelta)
        .lte('lng', lng + lngDelta)
        .limit(250)
      if (nearBuildings.error) return { data: null, error: nearBuildings.error, debug: { stage: 'buildings-nearby' } }
      candidates = normalizeBuildingsRows(nearBuildings.data || [])
      stage = 'buildings_nearby'
    }

    if (!candidates.length) {
      const cityBuildings = await supabase
        .from('buildings')
        .select(bCols)
        .ilike('city', city)
        .limit(250)
      if (cityBuildings.error) return { data: null, error: cityBuildings.error, debug: { stage: 'buildings-city' } }
      candidates = normalizeBuildingsRows(cityBuildings.data || [])
      stage = 'buildings_city'
    }

    if (!candidates.length) {
      const token = addressNorm.split(' ').find((t) => t.length >= 3)
      if (token) {
        const textBuildings = await supabase
          .from('buildings')
          .select(bCols)
          .ilike('address', `%${token}%`)
          .limit(250)
        if (textBuildings.error) return { data: null, error: textBuildings.error, debug: { stage: 'buildings-text' } }
        candidates = normalizeBuildingsRows(textBuildings.data || [])
        stage = 'buildings_text'
      }
    }
  }

  // 5) Ultimate fallback: take any visible building rows and rank client-side.
  if (!candidates.length) {
    const bCols = 'id, address, street_number, city, neighborhood, year_built, floors, units, monthly_fee, lat, lng'
    const anyBuildings = await supabase
      .from('buildings')
      .select(bCols)
      .limit(500)
    if (anyBuildings.error) return { data: null, error: anyBuildings.error, debug: { stage: 'buildings-any' } }
    candidates = normalizeBuildingsRows(anyBuildings.data || [])
    stage = 'buildings_any'
  }

  if (!candidates.length) return { data: null, error: null, debug: { candidateCount: 0, bestScore: 0, stage } }

  const baseTokens = addressNorm.split(' ').filter((t) => t.length > 1)

  const ranked = candidates
    .map((b) => {
      const bAddrNorm = norm(b.address)
      const bTokens = bAddrNorm.split(' ').filter((t) => t.length > 1)
      const bStreetNumNorm = numOnly(b.street_number)
      const overlap = baseTokens.filter((t) => bTokens.includes(t)).length
      const tokenScore = baseTokens.length ? overlap / baseTokens.length : 0

      let score = 0
      if (bAddrNorm === addressNorm) score += 5
      else if (bAddrNorm.includes(addressNorm) || addressNorm.includes(bAddrNorm)) score += 2.5
      else score += tokenScore * 3

      if (streetNumNorm && bStreetNumNorm && bStreetNumNorm === streetNumNorm) score += 3
      else if (streetNumNorm && bStreetNumNorm && Math.abs(Number(bStreetNumNorm) - Number(streetNumNorm)) <= 2) score += 1.5

      if (Number.isFinite(yearBuilt) && Number.isFinite(b.year_built)) score += Math.max(0, 2 - Math.abs(b.year_built - yearBuilt) / 10)
      if (Number.isFinite(floors) && Number.isFinite(b.floors)) score += Math.max(0, 2 - Math.abs(b.floors - floors) / 2)
      if (Number.isFinite(units) && Number.isFinite(b.units)) score += Math.max(0, 2 - Math.abs(b.units - units) / 10)
      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
        const km = Math.hypot((b.lat - lat) * 111, (b.lng - lng) * 78)
        score += Math.max(0, 4 - km * 4)
      }
      return { b, score }
    })
    .sort((a, b) => b.score - a.score)

  // Require a minimal address affinity to avoid false positives in large cities.
  const best = ranked[0]
  return {
    data: best?.score >= 2.2 ? best.b : null,
    error: null,
    debug: {
      candidateCount: candidates.length,
      bestScore: Number((best?.score || 0).toFixed(2)),
      bestAddress: best?.b ? `${best.b.address || ''} ${best.b.street_number || ''}`.trim() : null,
      stage,
    },
  }
}

// Ricerca client-side (tipicamente da SearchBar, dopo la selezione di un
// risultato del typeahead Photon) — usa il client browser, non quello static,
// perché è invocata solo lato client.
export async function searchNearbyBuildings(lat, lng, radiusMeters = 50) {
  const supabase = createClient()
  const { data: postgis } = await supabase.rpc('nearby_buildings', { lat, lng, radius_meters: radiusMeters })
  if (postgis?.length) return postgis
  const latDelta = radiusMeters / 111_000
  const lngDelta = radiusMeters / (111_000 * Math.cos((lat * Math.PI) / 180))
  const { data } = await supabase
    .from('building_scores')
    .select('id, address, street_number, city, neighborhood, score, review_count, lat, lng')
    .gte('lat', lat - latDelta).lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta).lte('lng', lng + lngDelta)
    .limit(5)
  return data || []
}
