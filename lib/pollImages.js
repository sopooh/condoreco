import { createClient } from '@/lib/supabase/client'
import { shrinkImage } from '@/lib/chatFiles'

// Immagini delle proposte (fase 2): bucket privato poll-images, <building>/<poll>/<file>
const BUCKET = 'poll-images'

export async function uploadPollImage({ buildingId, pollId, file }) {
  if (!file.type.startsWith('image/')) return { error: 'Scegli un’immagine (JPG, PNG o WEBP).' }
  const ready = await shrinkImage(file)
  if (ready.size > 10 * 1024 * 1024) return { error: 'Immagine troppo grande (massimo 10 MB).' }
  const ext = ready.type === 'image/png' ? 'png' : ready.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${buildingId}/${pollId}/${crypto.randomUUID()}.${ext}`
  const { error } = await createClient().storage.from(BUCKET).upload(path, ready, { contentType: ready.type, upsert: false })
  if (error) return { error: 'Caricamento dell’immagine non riuscito.' }
  return { path }
}

const cache = new Map()
export async function pollImageUrl(path) {
  if (!path) return null
  const hit = cache.get(path)
  if (hit && hit.exp > Date.now()) return hit.url
  const { data } = await createClient().storage.from(BUCKET).createSignedUrl(path, 3600)
  if (!data?.signedUrl) return null
  cache.set(path, { url: data.signedUrl, exp: Date.now() + 3300000 })
  return data.signedUrl
}
