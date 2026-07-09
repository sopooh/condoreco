import { createClient } from '@/lib/supabase/client'

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
