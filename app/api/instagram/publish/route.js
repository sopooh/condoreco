import { requireAdmin, json } from '@/lib/instagram/auth'
import { publishImages } from '@/lib/instagram/graph'
import { getCredentials } from '@/lib/instagram/credentials'

export const runtime = 'nodejs'
export const maxDuration = 120

// POST { postId } -> pubblica il carosello su Instagram
export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth
  const { postId } = await request.json().catch(() => ({}))
  if (!postId) return json({ error: 'postId obbligatorio' }, 400)

  const { data: post, error: postError } = await supabase
    .from('ig_posts').select('*, ig_slides(*)').eq('id', postId).single()
  if (postError) return json({ error: postError.message }, 404)
  if (post.status === 'published') return json({ error: 'Post già pubblicato' }, 409)
  const stale = Date.now() - new Date(post.updated_at).getTime() > 5 * 60 * 1000
  if (post.status === 'publishing' && !stale) return json({ error: 'Pubblicazione già in corso' }, 409)

  const slides = [...(post.ig_slides || [])].sort((a, b) => a.position - b.position)
  if (slides.length < 1 || slides.length > 10) return json({ error: 'Servono da 1 a 10 slide' }, 422)

  let creds
  try { creds = await getCredentials(supabase) } catch (e) { return json({ error: e.message }, 500) }
  if (!creds) return json({ error: 'Collega prima l\'account Instagram (Impostazioni)' }, 412)

  const { error: lockError } = await supabase.from('ig_posts')
    .update({ status: 'publishing', error: null }).eq('id', postId)
  if (lockError) return json({ error: lockError.message }, 500)

  const imageUrls = slides.map((s) => supabase.storage.from('instagram').getPublicUrl(s.storage_path).data.publicUrl)
  try {
    const r = await publishImages({
      igUserId: creds.ig_user_id, token: creds.access_token, imageUrls, caption: post.caption,
    })
    const { data: updated, error } = await supabase.from('ig_posts').update({
      status: 'published', ig_container_id: r.containerId, ig_media_id: r.mediaId,
      permalink: r.permalink, published_at: new Date().toISOString(), error: null,
    }).eq('id', postId).select().single()
    if (error) console.error('[instagram] save publish result', error)
    return json({ post: updated, ...r })
  } catch (e) {
    const { error } = await supabase.from('ig_posts').update({ status: 'failed', error: e.message }).eq('id', postId)
    if (error) console.error('[instagram] save failure', error)
    return json({ error: e.message }, 502)
  }
}
