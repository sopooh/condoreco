import { createStaticClient } from '@/lib/supabase/static'

// Nessuna sitemap esisteva ancora nel progetto: creata qui da zero, non solo
// con la voce /amministratori. Dominio configurabile via NEXT_PUBLIC_SITE_URL,
// fallback al dominio citato nei Termini e Condizioni / indirizzi email.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.condoreco.com'

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/cerca', changeFrequency: 'daily', priority: 0.9 },
  { path: '/amministratori', changeFrequency: 'daily', priority: 0.9 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contatti', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/regole-recensioni', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/linee-guida-community', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/termini-e-condizioni', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookie-policy', changeFrequency: 'yearly', priority: 0.2 },
]

export default async function sitemap() {
  const supabase = createStaticClient()

  const [{ data: buildings }, { data: admins }] = await Promise.all([
    supabase.from('building_scores').select('id'),
    supabase.from('admin_scores').select('id'),
  ])

  const now = new Date()

  const staticEntries = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  const buildingEntries = (buildings || []).map((b) => ({
    url: `${BASE_URL}/edificio/${b.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const adminEntries = (admins || []).map((a) => ({
    url: `${BASE_URL}/amministratore/${a.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...buildingEntries, ...adminEntries]
}
