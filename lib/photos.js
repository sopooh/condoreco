import { createClient } from '@/lib/supabase/client'
import { processImageFile } from '@/lib/imageUtils'

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/building-photos`
const EDGE_FUNC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-photo`

export function photoUrl(storagePath) {
  return `${STORAGE_BASE}/${storagePath}`
}

// Upload di un file foto: compressione → storage → DB → edge function (fire & forget).
export async function uploadPhoto(file, buildingId, reviewId = null) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Devi accedere per caricare foto.')

  const { blob, qualityScore } = await processImageFile(file)

  const photoId = crypto.randomUUID()
  const storagePath = `${buildingId}/${photoId}.webp`

  const { error: uploadErr } = await supabase.storage
    .from('building-photos')
    .upload(storagePath, blob, { contentType: 'image/webp', upsert: false })
  if (uploadErr) throw uploadErr

  const { data: inserted, error: insertErr } = await supabase
    .from('photos')
    .insert({
      id: photoId,
      building_id: buildingId,
      review_id: reviewId || null,
      uploaded_by: user.id,
      status: 'approved',
      quality_score: qualityScore,
      storage_path: storagePath,
    })
    .select('id')
    .single()
  if (insertErr) throw insertErr

  // Chiama l'edge function per analisi server-side (non bloccante)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    fetch(EDGE_FUNC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ photo_id: photoId }),
    }).catch(() => {})
  })

  return inserted.id
}
