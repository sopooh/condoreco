import { createStaticClient } from '@/lib/supabase/static'
import SearchResultsView from '@/components/search/SearchResultsView'
import { AMENITY_DB } from '@/lib/amenities'

export const metadata = {
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

  return {
    buildings: buildings || [],
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
