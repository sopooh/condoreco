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

  let req = supabase.from('admin_scores').select('*')
  if (city) req = req.eq('city', city)
  if (query) {
    req = req.or(`name.ilike.%${query}%,studio_name.ilike.%${query}%`)
  }

  const [{ data: adminRows }, { data: cityRows }] = await Promise.all([
    req,
    supabase.from('admin_scores').select('city'),
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

  return { admins, buildingsByAdmin, cities, city }
}

export default async function AdminsPage({ searchParams }) {
  const resolvedParams = await searchParams
  const { admins, buildingsByAdmin, cities, city } = await getAdminsData(resolvedParams)

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
        city={city}
      />
    </div>
  )
}
