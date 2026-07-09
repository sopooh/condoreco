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

  let req = supabase.from('building_scores').select('*')
  if (city) req = req.eq('city', city)
  if (query) {
    req = req.or(`address.ilike.%${query}%,neighborhood.ilike.%${query}%,city.ilike.%${query}%`)
  }
  amenities.forEach((id) => {
    const column = AMENITY_DB[id]
    if (column) req = req.eq(column, true)
  })

  const [{ data: buildings }, { data: cityRows }] = await Promise.all([
    req,
    supabase.from('building_scores').select('city'),
  ])

  const citySet = new Set()
  ;(cityRows || []).forEach((b) => { if (b.city) citySet.add(b.city) })

  return {
    buildings: buildings || [],
    cities: Array.from(citySet).sort().map((name) => ({ name })),
    query,
    city,
    focusLat,
    focusLng,
  }
}

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams
  const { buildings, cities, query, city, focusLat, focusLng } = await getSearchData(resolvedParams)

  return (
    <SearchResultsView
      buildings={buildings}
      cities={cities}
      query={query}
      city={city}
      focusLat={focusLat}
      focusLng={focusLng}
    />
  )
}
