// Utilità per elaborazione lato client delle foto.
// La ri-codifica su canvas rimuove automaticamente tutti i metadati EXIF,
// incluse le coordinate GPS, senza librerie esterne.

const MAX_SIDE = 2000   // px lato lungo massimo
const QUALITY = 0.80    // qualità WebP
const MAX_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
const ACCEPTED_EXTS = /\.(jpe?g|png|webp|heic|heif)$/i

export function validatePhotoFile(file) {
  const typeOk = file.type.startsWith('image/') || ACCEPTED_EXTS.test(file.name)
  if (!typeOk) throw new Error(`Formato non supportato. Usa JPG, PNG, WEBP o HEIC.`)
  if (file.size > MAX_SIZE_BYTES) throw new Error(`File troppo grande (max 10 MB): ${file.name}`)
}

// Comprime, ridimensiona e converte in WebP rimuovendo tutti i metadati EXIF.
// Ritorna { blob, qualityScore, width, height }.
export async function processImageFile(file) {
  validatePhotoFile(file)

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Impossibile leggere l\'immagine. Prova un formato diverso (JPG o PNG).')
  }

  let { width, height } = bitmap
  if (width > MAX_SIDE || height > MAX_SIDE) {
    const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const qualityScore = analyzeQuality(ctx, width, height)

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione in WebP fallita'))), 'image/webp', QUALITY)
  )

  bitmap.close?.()
  return { blob, qualityScore, width, height }
}

// Stima della qualità basata su luminosità, gamma dinamica e risoluzione.
// La stessa logica gira server-side nell'edge function per un risultato più affidabile.
function analyzeQuality(ctx, width, height) {
  const sampleW = Math.min(width, 300)
  const sampleH = Math.min(height, 300)
  const { data } = ctx.getImageData(
    Math.floor((width - sampleW) / 2),
    Math.floor((height - sampleH) / 2),
    sampleW, sampleH,
  )

  let totalLum = 0, minL = 255, maxL = 0
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    totalLum += l
    if (l < minL) minL = l
    if (l > maxL) maxL = l
  }

  const avgLum = totalLum / (data.length / 4)
  const dynamicRange = maxL - minL

  const brightnessScore = avgLum < 40
    ? (avgLum / 40) * 15
    : avgLum > 230
      ? ((255 - avgLum) / 25) * 15
      : Math.max(0, 40 - Math.abs(avgLum - 140) / 3)

  const rangeScore = dynamicRange < 30
    ? (dynamicRange / 30) * 10
    : Math.min((dynamicRange / 200) * 30, 30)

  const megapixels = (width * height) / 1_000_000
  const resScore = Math.min(megapixels / 4, 1) * 30

  return Math.round(brightnessScore + rangeScore + resScore)
}
