import { createStaticClient } from '@/lib/supabase/static'
import { SITE_URL } from '@/lib/site'

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/cerca', changeFrequency: 'daily', priority: 0.9 },
  { path: '/amministratori', changeFrequency: 'daily', priority: 0.9 },
  { path: '/fornitori', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/come-funziona', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contatti', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/regole-recensioni', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/linee-guida-community', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/termini-e-condizioni', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookie-policy', changeFrequency: 'yearly', priority: 0.2 },
]

// Data dell'ultima recensione pubblicata per entità: è il vero "lastModified"
// della pagina (le viste *_scores non hanno updated_at).
function latestBy(rows, key) {
  const map = new Map()
  for (const r of rows || []) {
    const d = r.updated_at || r.created_at
    if (!d) continue
    const prev = map.get(r[key])
    if (!prev || d > prev) map.set(r[key], d)
  }
  return map
}

export default async function sitemap() {
  const supabase = createStaticClient()

  const [buildingsRes, adminsRes, reviewsRes, adminReviewsRes] = await Promise.all([
    supabase.from('building_scores').select('id'),
    supabase.from('admin_scores').select('id'),
    supabase.from('reviews').select('building_id, created_at, updated_at').eq('is_published', true),
    supabase.from('admin_reviews').select('administrator_id, created_at, updated_at').eq('is_published', true),
  ])
  for (const [label, res] of Object.entries({ buildingsRes, adminsRes, reviewsRes, adminReviewsRes })) {
    if (res.error) console.error(`[sitemap] ${label}`, res.error)
  }

  const buildingDates = latestBy(reviewsRes.data, 'building_id')
  const adminDates = latestBy(adminReviewsRes.data, 'administrator_id')

  const staticEntries = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency,
    priority,
  }))

  const buildingEntries = (buildingsRes.data || []).map((b) => ({
    url: `${SITE_URL}/edificio/${b.id}`,
    ...(buildingDates.get(b.id) && { lastModified: new Date(buildingDates.get(b.id)) }),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const adminEntries = (adminsRes.data || []).map((a) => ({
    url: `${SITE_URL}/amministratore/${a.id}`,
    ...(adminDates.get(a.id) && { lastModified: new Date(adminDates.get(a.id)) }),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...buildingEntries, ...adminEntries]
}
