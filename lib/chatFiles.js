import { createClient } from '@/lib/supabase/client'

// File allegati alle chat, bucket privato chat-files.
// Percorsi: <building>/g/<id>-<nome> (chat del condominio)
//           <building>/t/<thread>/<id>-<nome> (conversazione)
export const CHAT_BUCKET = 'chat-files'
export const MAX_CHAT_FILE = 25 * 1024 * 1024

export function kindFromMime(mime = '', name = '') {
  if (mime.startsWith('image/') && !/svg/.test(mime)) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (!mime && /\.(jpe?g|png|webp|heic|gif)$/i.test(name)) return 'image'
  return 'file'
}

export function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

// Etichetta usata come testo del messaggio (e anteprima nell'elenco chat)
export function labelFor(kind, name) {
  return {
    image: 'Foto',
    video: 'Video',
    audio: 'Audio',
    file: `Documento: ${name}`,
  }[kind] || name
}

const safeName = (name) => name.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(-80) || 'file'

// Foto grandi dal telefono: ridotte a 2000px JPEG (resta leggibile, pesa 5-10 volte meno).
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || /gif|svg/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export async function uploadChatFile({ buildingId, threadId, file }) {
  const ready = await shrinkImage(file)
  if (ready.size > MAX_CHAT_FILE) return { error: `Il file supera i 25 MB (${formatSize(ready.size)}).` }
  const folder = threadId ? `${buildingId}/t/${threadId}` : `${buildingId}/g`
  const path = `${folder}/${crypto.randomUUID()}-${safeName(ready.name)}`
  const { error } = await createClient().storage.from(CHAT_BUCKET).upload(path, ready, {
    contentType: ready.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) return { error: 'Caricamento non riuscito. Riprova.' }
  const kind = kindFromMime(ready.type, ready.name)
  return { attachment: { path, name: file.name, size: ready.size, mime: ready.type || '' }, kind }
}

// Link temporanei (10 minuti) con cache, così scorrere la chat non li richiede ogni volta
const cache = new Map()
export async function signedChatUrl(path, { download } = {}) {
  const key = `${path}|${download || ''}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.url
  const { data, error } = await createClient().storage.from(CHAT_BUCKET)
    .createSignedUrl(path, 600, download ? { download } : undefined)
  if (error || !data?.signedUrl) return null
  cache.set(key, { url: data.signedUrl, exp: Date.now() + 540000 })
  return data.signedUrl
}
