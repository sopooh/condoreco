import { requireAdmin, json } from '@/lib/instagram/auth'
import { renderSlideJpeg } from '@/lib/instagram/render'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST { postId, template, params } -> genera la slide, la salva nel bucket
// "instagram" e la aggiunge in coda al post.
export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth
  const { postId, template, params } = await request.json().catch(() => ({}))
  if (!postId || !template) return json({ error: 'postId e template sono obbligatori' }, 400)

  let jpeg
  try {
    jpeg = await renderSlideJpeg(template, params || {})
  } catch (e) {
    return json({ error: e.message }, 422)
  }

  const { data: last, error: lastError } = await supabase
    .from('ig_slides').select('position').eq('post_id', postId)
    .order('position', { ascending: false }).limit(1)
  if (lastError) return json({ error: lastError.message }, 500)
  if ((last?.length ?? 0) > 0 && last[0].position >= 9) {
    const { count } = await supabase.from('ig_slides').select('id', { count: 'exact', head: true }).eq('post_id', postId)
    if (count >= 10) return json({ error: 'Massimo 10 slide per carosello' }, 422)
  }

  const slideId = crypto.randomUUID()
  const storagePath = `${postId}/${slideId}.jpg`
  const { error: upError } = await supabase.storage.from('instagram')
    .upload(storagePath, jpeg, { contentType: 'image/jpeg', upsert: false })
  if (upError) return json({ error: `Upload: ${upError.message}` }, 500)

  const { data: slide, error } = await supabase.from('ig_slides').insert({
    id: slideId,
    post_id: postId,
    position: (last?.[0]?.position ?? -1) + 1,
    source: 'generated',
    template,
    params: params || {},
    storage_path: storagePath,
  }).select().single()
  if (error) {
    await supabase.storage.from('instagram').remove([storagePath])
    return json({ error: error.message }, 500)
  }
  return json({ slide })
}
