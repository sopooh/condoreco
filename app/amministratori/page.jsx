import { createStaticClient } from '@/lib/supabase/static'
import AdminsResultsView from '@/components/admins/AdminsResultsView'
import { attachCoverPhotos } from '@/lib/photos'
import SeoIntro from '@/components/seo/SeoIntro'

export const revalidate = 3600

// Rilevanza: media bayesiana del voto (chi ha poche recensioni pesa meno),
// poi condomini gestiti e certificazione.
const bayes = (a) => ((a.score || 0) * a.review_count + 3.5 * 5) / (a.review_count + 5)
const ADMIN_SORTS = {
  rilevanti: (a, b) => bayes(b) - bayes(a) || b.building_count - a.building_count || Number(b.verified) - Number(a.verified),
  valutazione: (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.review_count - a.review_count,
  recensioni: (a, b) => b.review_count - a.review_count || (b.score ?? 0) - (a.score ?? 0),
  condomini: (a, b) => b.building_count - a.building_count || b.review_count - a.review_count,
  anzianita: (a, b) => (a.active_since || 9999) - (b.active_since || 9999),
  nome: (a, b) => a.name.localeCompare(b.name, 'it'),
}

export const metadata = {
  title: 'Amministratori di condominio: recensioni e opinioni',
  description: 'Recensioni e opinioni sugli amministratori di condominio scritte dai residenti: trasparenza, rapidità, gestione delle assemblee e condomini gestiti.',
  alternates: { canonical: '/amministratori' },
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

  let admins = adminRows || []
  if (searchParams.rec === '1') admins = admins.filter((a) => a.review_count > 0)
  if (searchParams.tab === 'certificati') admins = admins.filter((a) => a.verified)
  const sortId = searchParams.tab === 'recensiti' ? 'recensioni' : searchParams.tab === 'attivi' ? 'condomini' : (ADMIN_SORTS[searchParams.sort] ? searchParams.sort : 'rilevanti')
  admins = [...admins].sort(ADMIN_SORTS[sortId])

  const buildingsByAdmin = {}
  if (admins.length > 0) {
    const ids = admins.map((a) => a.id)
    const { data: buildings } = await supabase
      .from('building_scores')
      .select('*')
      .in('administrator_id', ids)
    // Foto caricate dagli utenti in thumbnail al posto della mappa statica,
    // stesso trattamento della lista Esplora.
    const buildingsWithPhotos = await attachCoverPhotos(supabase, buildings || [])
    buildingsWithPhotos.forEach((b) => {
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
      <AdminsResultsView
        admins={admins}
        buildingsByAdmin={buildingsByAdmin}
        cities={cities}
        feeCounts={feeCounts}
        city={city}
      />
      <SeoIntro title="Come scegliere un amministratore di condominio">
        <p>
          Su CondoReco trovi le recensioni degli amministratori di condominio scritte da chi vive negli stabili
          che gestiscono. Ogni profilo mostra il punteggio medio, i condomini amministrati e le valutazioni su
          disponibilità, trasparenza dei conti, rapidità negli interventi e gestione delle assemblee.
        </p>
        <p>
          Puoi filtrare per città e ordinare per valutazione, numero di recensioni o anni di attività:
          utile se il tuo condominio sta cambiando amministratore o se vuoi capire chi gestisce il palazzo
          dove stai per comprare o affittare.
        </p>
      </SeoIntro>
    </div>
  )
}
