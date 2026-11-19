import { createStaticClient } from '@/lib/supabase/static'
import { parseAddressQuery, ilikeSafe, sameCivic } from '@/lib/addressQuery'
import SearchResultsView from '@/components/search/SearchResultsView'
import { AMENITY_DB } from '@/lib/amenities'
import { attachCoverPhotos } from '@/lib/photos'

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
  const sort = searchParams.sort || 'recent'

  const parsed = parseAddressQuery(query)

  // mode 'street': tutte le parole della via nell'indirizzo (ordine e "via/viale" non contano);
  // mode 'loose': testo intero in via, quartiere o città (es. "Corvetto", "Milano")
  function applyCommonFilters(req, mode) {
    if (city) req = req.eq('city', city)
    if (query && mode === 'street') {
      parsed.words.forEach((w) => { req = req.ilike('address', `%${ilikeSafe(w)}%`) })
    } else if (query) {
      const t = ilikeSafe(query)
      req = req.or(`address.ilike.%${t}%,neighborhood.ilike.%${t}%,city.ilike.%${t}%`)
    }
    amenities.forEach((id) => {
      const column = AMENITY_DB[id]
      if (column) req = req.eq(column, true)
    })
    return req
  }

  async function run(mode) {
    let req = applyCommonFilters(supabase.from('building_scores').select('*').neq('status', 'imported'), mode)
    // Filtro attivo solo se scostato dal default: altrimenti gte(...,0) su
    // Postgres escluderebbe gli edifici con monthly_fee null (mai valorizzata).
    if (feeMin > 0) req = req.gte('monthly_fee', feeMin)
    if (feeMax < 3000) req = req.lte('monthly_fee', feeMax)
    // Baseline dell'istogramma: stessi filtri tranne il range fee
    const feeReq = applyCommonFilters(supabase.from('building_scores').select('monthly_fee').neq('status', 'imported'), mode)
    const [{ data }, { data: fees }] = await Promise.all([req, feeReq])
    return { data: data || [], fees: fees || [] }
  }

  // Civici importati dal Comune (status 'imported', senza recensioni): entrano
  // solo quando l'utente cerca una via/quartiere o arriva da un punto sulla mappa,
  // e sempre dopo i palazzi recensiti. Con filtri su spese o servizi non hanno
  // dati, quindi restano fuori.
  const IMPORTED_LIMIT = 60
  const dataFiltersActive = feeMin > 0 || feeMax < 3000 || amenities.length > 0
  async function runImported(mode) {
    if (dataFiltersActive) return []
    const hasFocus = Number.isFinite(focusLat) && Number.isFinite(focusLng)
    if (!query && !hasFocus) return []
    let req = supabase.from('building_scores').select('*').eq('status', 'imported')
    if (query) {
      req = applyCommonFilters(req, mode)
      if (parsed.civic && mode === 'street') req = req.ilike('street_number', `${ilikeSafe(parsed.civic)}%`)
    } else {
      if (city) req = req.eq('city', city)
      const d = 0.004 // ~400 m attorno al punto
      req = req.gte('lat', focusLat - d).lte('lat', focusLat + d).gte('lng', focusLng - d * 1.4).lte('lng', focusLng + d * 1.4)
    }
    const { data } = await req.order('address').order('street_number').limit(IMPORTED_LIMIT)
    let rows = data || []
    // Civico cercato non trovato con prefisso: mostra comunque i civici della via
    if (!rows.length && query && parsed.civic && mode === 'street') {
      const { data: street } = await applyCommonFilters(supabase.from('building_scores').select('*').eq('status', 'imported'), mode)
        .order('street_number').limit(IMPORTED_LIMIT)
      rows = street || []
    }
    return rows
  }

  let mode = parsed.words.length ? 'street' : 'loose'
  let res = await run(mode)
  let imported = await runImported(mode)
  if (!res.data.length && !imported.length && mode === 'street') {
    mode = 'loose'
    res = await run(mode)
    imported = await runImported(mode)
  }
  const buildings = res.data
  const feeRows = res.fees

  // civico: prima quello cercato; se non c'è, si propongono gli altri civici della stessa via
  let civicMiss = null
  const allFound = [...buildings, ...imported]
  if (parsed.civic && mode === 'street' && allFound.length) {
    const exact = allFound.filter((b) => sameCivic(b.street_number, parsed.civic))
    if (!exact.length) civicMiss = { civic: parsed.civic, street: allFound[0].address || parsed.street }
  }

  const { data: cityRows } = await supabase.from('building_scores').select('city').neq('status', 'imported')

  const citySet = new Set()
  ;(cityRows || []).forEach((b) => { if (b.city) citySet.add(b.city) })

  // Foto caricate dagli utenti in thumbnail al posto della mappa statica
  // (priorità già gestita da getBuildingPreviewImage, manca solo il dato):
  // una per edificio, preferendo la cover e poi il quality_score migliore.
  // Recensiti ordinati come scelto, poi i civici importati (ordine per via e numero).
  let sorted = [...await sortBuildings(supabase, buildings || [], sort), ...imported]
  if (parsed.civic && mode === 'street') {
    sorted = [...sorted.filter((b) => sameCivic(b.street_number, parsed.civic)), ...sorted.filter((b) => !sameCivic(b.street_number, parsed.civic))]
  }
  const buildingsWithPhotos = await attachCoverPhotos(supabase, sorted)

  return {
    buildings: buildingsWithPhotos,
    cities: Array.from(citySet).sort().map((name) => ({ name })),
    feeCounts: (feeRows || []).map((b) => b.monthly_fee).filter(Boolean),
    query,
    city,
    focusLat,
    focusLng,
    civicMiss,
  }
}

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams
  const { buildings, cities, feeCounts, query, city, focusLat, focusLng, civicMiss } = await getSearchData(resolvedParams)

  return (
    <SearchResultsView
      buildings={buildings}
      cities={cities}
      feeCounts={feeCounts}
      query={query}
      city={city}
      focusLat={focusLat}
      focusLng={focusLng}
      civicMiss={civicMiss}
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
