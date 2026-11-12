import { createStaticClient } from '@/lib/supabase/static'
import SuppliersResultsView from '@/components/suppliers/directory/SuppliersResultsView'
import { fuzzyFilter } from '@/lib/fuzzySearch'
import { maintenanceCategoryLabel } from '@/lib/maintenanceCategories'

export const revalidate = 300

export const metadata = {
  title: 'Fornitori Recofixer',
  description: 'Idraulici, elettricisti, ascensoristi e imprese che lavorano con i condomini su Condoreco, divisi per categoria e città.',
}

const SORTS = {
  verified: (a, b) => Number(b.verified) - Number(a.verified) || b.jobs - a.jobs || a.company_name.localeCompare(b.company_name, 'it'),
  jobs: (a, b) => b.jobs - a.jobs || b.condos - a.condos,
  condos: (a, b) => b.condos - a.condos || b.jobs - a.jobs,
  recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  name: (a, b) => a.company_name.localeCompare(b.company_name, 'it'),
}

const inCity = (s, city) => !city || s.zones.length === 0 || s.zones.some((z) => z.toLowerCase() === city.toLowerCase())

export default async function SuppliersPage({ searchParams }) {
  const sp = await searchParams
  const city = sp.city || null
  const q = sp.q?.trim() || ''
  const cats = (sp.cat || '').split(',').filter(Boolean)
  const onlyVerified = sp.tab === 'verificati'
  const sort = sp.tab === 'attivi' ? 'jobs' : sp.tab === 'nuovi' ? 'recent' : (SORTS[sp.sort] ? sp.sort : 'verified')

  const supabase = createStaticClient()
  const [{ data }, { data: geo }] = await Promise.all([
    supabase.rpc('public_suppliers'),
    supabase.from('building_scores').select('city, lat, lng').not('lat', 'is', null),
  ])
  const all = (data || []).map((s) => ({ ...s, categories: s.categories || [], zones: s.zones || [] }))

  // Città dalle zone dichiarate dai fornitori, ordinate alfabeticamente.
  const cityMap = new Map()
  all.forEach((s) => s.zones.forEach((z) => { const k = z.trim(); if (k && !cityMap.has(k.toLowerCase())) cityMap.set(k.toLowerCase(), k) }))
  const cities = [...cityMap.values()].sort((a, b) => a.localeCompare(b, 'it')).map((name) => ({ name }))

  // Conteggi per categoria: stessi filtri tranne le categorie stesse.
  let base = all.filter((s) => inCity(s, city) && (!onlyVerified || s.verified))
  if (q) base = fuzzyFilter(base, q, (s) => [s.company_name, s.description || '', ...s.categories.map(maintenanceCategoryLabel), ...s.zones])
  const categoryCounts = {}
  base.forEach((s) => s.categories.forEach((c) => { categoryCounts[c] = (categoryCounts[c] || 0) + 1 }))

  const suppliers = base
    .filter((s) => cats.length === 0 || cats.some((c) => s.categories.includes(c)))
    .sort(SORTS[sort])

  // Mappa: un pin per città servita, nel centro medio dei condomini di quella città
  const centers = new Map()
  ;(geo || []).forEach((b) => {
    const k = (b.city || '').trim().toLowerCase()
    if (!k || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return
    const c = centers.get(k) || { lat: 0, lng: 0, n: 0 }
    c.lat += b.lat; c.lng += b.lng; c.n += 1
    centers.set(k, c)
  })
  const perCity = new Map()
  suppliers.forEach((s) => s.zones.forEach((z) => {
    const k = z.trim().toLowerCase()
    if (k) perCity.set(k, { name: perCity.get(k)?.name || z.trim(), count: (perCity.get(k)?.count || 0) + 1 })
  }))
  const cityPins = [...perCity.entries()]
    .filter(([k]) => centers.has(k))
    .map(([k, v]) => {
      const c = centers.get(k)
      return { id: `city-${k}`, city: v.name, lat: c.lat / c.n, lng: c.lng / c.n, pinBadge: v.count, pinLabel: v.name }
    })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <SuppliersResultsView suppliers={suppliers} cities={cities} categoryCounts={categoryCounts} city={city} total={all.length} cityPins={cityPins} />
    </div>
  )
}
