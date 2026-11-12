import { createStaticClient } from '@/lib/supabase/static'
import SearchResultsView from '@/components/search/SearchResultsView'
import { AMENITY_DB } from '@/lib/amenities'
import { attachCoverPhotos } from '@/lib/photos'

export const metadata = {
  alternates: { canonical: '/cerca' },
  title: 'Cerca condominio',
  description: 'Cerca edifici per città, via o quartiere e filtra per servizi disponibili.',
}

async function getSearchData(searchParams) {
  const supabase = createStaticClient()

  const query = searchParams.q?.trim() || ''
  const city = searchParams.city || null
  const amenities = searchParams.amenities ? searchParams.amenities.split(',').filter(Boolean) : []
  const focusLat = searchParams.lat ? Number(searchParams.lat) : null
  const focusLng = searchParams.lng ? Number(searchParams.lng) : null
  const feeMin = searchParams.feeMin ? Number(searchParams.feeMin) : 0
  const feeMax = searchParams.feeMax ? Number(searchParams.feeMax) : 3000
  const sort = searchParams.sort || 'recent'

  function applyCommonFilters(req) {
    if (city) req = req.eq('city', city)
    if (query) {
      req = req.or(`address.ilike.%${query}%,neighborhood.ilike.%${query}%,city.ilike.%${query}%`)
    }
    amenities.forEach((id) => {
      const column = AMENITY_DB[id]
      if (column) req = req.eq(column, true)
    })
    return req
  }

  let req = applyCommonFilters(supabase.from('building_scores').select('*'))
  // Filtro attivo solo se scostato dal default: altrimenti gte(...,0) su
  // Postgres escluderebbe gli edifici con monthly_fee null (mai valorizzata).
  if (feeMin > 0) req = req.gte('monthly_fee', feeMin)
  if (feeMax < 3000) req = req.lte('monthly_fee', feeMax)

  // Baseline dell'istogramma: stessi filtri tranne il range fee, così le
  // barre grigie mostrano sempre la distribuzione completa delle quote.
  const feeCountsReq = applyCommonFilters(supabase.from('building_scores').select('monthly_fee'))

  const [{ data: buildings }, { data: cityRows }, { data: feeRows }] = await Promise.all([
    req,
    supabase.from('building_scores').select('city'),
    feeCountsReq,
  ])

  const citySet = new Set()
  ;(cityRows || []).forEach((b) => { if (b.city) citySet.add(b.city) })

  // Foto caricate dagli utenti in thumbnail al posto della mappa statica
  // (priorità già gestita da getBuildingPreviewImage, manca solo il dato):
  // una per edificio, preferendo la cover e poi il quality_score migliore.
  const sorted = await sortBuildings(supabase, buildings || [], sort)
  const buildingsWithPhotos = await attachCoverPhotos(supabase, sorted)

  return {
    buildings: buildingsWithPhotos,
    cities: Array.from(citySet).sort().map((name) => ({ name })),
    feeCounts: (feeRows || []).map((b) => b.monthly_fee).filter(Boolean),
    query,
    city,
    focusLat,
    focusLng,
  }
}

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams
  const { buildings, cities, feeCounts, query, city, focusLat, focusLng } = await getSearchData(resolvedParams)

  return (
    <SearchResultsView
      buildings={buildings}
      cities={cities}
      feeCounts={feeCounts}
      query={query}
      city={city}
      focusLat={focusLat}
      focusLng={focusLng}
    />
  )
}

// Ordinamento scelto in "Ordina per". I valori mancanti (null) finiscono in fondo.
async function sortBuildings(supabase, list, sort) {
  if (!list.length) return list
  const byNum = (key, dir) => (a, b) => {
    const x = a[key], y = b[key]
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    return dir * (Number(x) - Number(y))
  }
  if (sort === 'rating') return [...list].sort(byNum('score', -1))
  if (sort === 'fee_asc') return [...list].sort(byNum('monthly_fee', 1))
  if (sort === 'fee_desc') return [...list].sort(byNum('monthly_fee', -1))
  if (sort === 'reviews') return [...list].sort(byNum('review_count', -1))
  // 'recent': building_scores non espone created_at, si legge da buildings
  const { data } = await supabase.from('buildings').select('id, created_at').in('id', list.map((b) => b.id))
  const at = Object.fromEntries((data || []).map((r) => [r.id, new Date(r.created_at).getTime()]))
  return [...list].sort((a, b) => (at[b.id] || 0) - (at[a.id] || 0))
}
