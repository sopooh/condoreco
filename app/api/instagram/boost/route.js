import { requireAdmin, json } from '@/lib/instagram/auth'
import { boostPost } from '@/lib/instagram/ads'
import { getCredentials } from '@/lib/instagram/credentials'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST { postId, objective, dailyBudgetEur, days, city, radiusKm, ageMin, ageMax }
// Crea la sponsorizzazione in PAUSA: si attiva a mano da Gestione inserzioni.
export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth
  const body = await request.json().catch(() => ({}))
  if (!body.postId) return json({ error: 'postId obbligatorio' }, 400)

  const { data: post, error } = await supabase.from('ig_posts').select('*').eq('id', body.postId).single()
  if (error) return json({ error: error.message }, 404)
  if (post.status !== 'published' || !post.ig_media_id) return json({ error: 'Pubblica il post prima di sponsorizzarlo' }, 422)
  if (post.boost?.ad_id) return json({ error: 'Questo post ha già una sponsorizzazione' }, 409)

  let creds = null
  try { creds = await getCredentials(supabase) } catch (e) { console.error('[instagram] creds for boost', e) }

  const slug = (post.title || 'post').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'post'
  const link = `https://condoreco.com/?utm_source=instagram&utm_medium=paid&utm_campaign=${slug}`

  try {
    const boost = await boostPost({
      mediaId: post.ig_media_id,
      name: `Condoreco | ${post.title || slug}`,
      objective: body.objective,
      dailyBudgetEur: body.dailyBudgetEur,
      days: body.days,
      city: body.city,
      radiusKm: body.radiusKm,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      link,
    }, creds?.ig_user_id, creds?.access_token)
    const { data: updated, error: saveError } = await supabase.from('ig_posts')
      .update({ boost }).eq('id', post.id).select().single()
    if (saveError) console.error('[instagram] save boost', saveError)
    return json({ post: updated, boost })
  } catch (e) {
    return json({ error: e.message }, 502)
  }
}
