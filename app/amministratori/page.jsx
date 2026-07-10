import { createStaticClient } from '@/lib/supabase/static'
import AdminsResultsView from '@/components/admins/AdminsResultsView'

export const revalidate = 3600

export const metadata = {
  title: 'Amministratori di condominio',
  description: 'Scopri reputazione, stabili gestiti e recensioni degli amministratori di condominio prima di averci a che fare.',
}

async function getAdminsData(searchParams) {
  const supabase = createStaticClient()

  const city = searchParams.city || null
  const query = searchParams.q?.trim() || ''
  const feeMin = searchParams.feeMin ? Number(searchParams.feeMin) : 0
  const feeMax = searchParams.feeMax ? Number(searchParams.feeMax) : 3000

  function applyCommonFilters(req) {
    if (city) req = req.eq('city', city)
    if (query) {
      req = req.or(`name.ilike.%${query}%,studio_name.ilike.%${query}%`)
    }
    return req
  }

  let req = applyCommonFilters(supabase.from('admin_scores').select('*'))
  // Filtro attivo solo se scostato dal default: altrimenti gte(...,0) su
  // Postgres escluderebbe gli amministratori con avg_monthly_fee null
  // (nessun edificio con quota valorizzata).
  if (feeMin > 0) req = req.gte('avg_monthly_fee', feeMin)
  if (feeMax < 3000) req = req.lte('avg_monthly_fee', feeMax)

  // Baseline dell'istogramma: stessi filtri tranne il range fee.
  const feeCountsReq = applyCommonFilters(supabase.from('admin_scores').select('avg_monthly_fee'))

  const [{ data: adminRows }, { data: cityRows }, { data: feeRows }] = await Promise.all([
    req,
    supabase.from('admin_scores').select('city'),
    feeCountsReq,
  ])

  const admins = adminRows || []

  const buildingsByAdmin = {}
  if (admins.length > 0) {
    const ids = admins.map((a) => a.id)
    const { data: buildings } = await supabase
      .from('building_scores')
      .select('*')
      .in('administrator_id', ids)
    buildings?.forEach((b) => {
      if (!buildingsByAdmin[b.administrator_id]) buildingsByAdmin[b.administrator_id] = []
      buildingsByAdmin[b.administrator_id].push(b)
    })
  }

  const cityCounts = new Map()
  ;(cityRows || []).forEach((a) => {
    if (!a.city) return
    cityCounts.set(a.city, (cityCounts.get(a.city) || 0) + 1)
  })
  const cities = Array.from(cityCounts.keys()).sort().map((name) => ({ name }))
  const feeCounts = (feeRows || []).map((a) => a.avg_monthly_fee).filter(Boolean)

  return { admins, buildingsByAdmin, cities, feeCounts, city }
}

export default async function AdminsPage({ searchParams }) {
  const resolvedParams = await searchParams
  const { admins, buildingsByAdmin, cities, feeCounts, city } = await getAdminsData(resolvedParams)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--white)', padding: '28px 40px 20px' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>
            Amministratori
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 20 }}>
            Scopri reputazione, stabili gestiti e recensioni degli amministratori di condominio prima di averci a che fare.
          </p>
        </div>
      </div>

      <AdminsResultsView
        admins={admins}
        buildingsByAdmin={buildingsByAdmin}
        cities={cities}
        feeCounts={feeCounts}
        city={city}
      />
    </div>
  )
}
