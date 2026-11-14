// Prepara una foto dal telefono per Instagram: 1080x1350 (4:5) JPEG.
// mode 'fill' = riempie e ritaglia al centro; 'fit' = intera con bordo brand.
// La ri-codifica su canvas elimina anche i metadati EXIF (GPS compreso).

export const IG_W = 1080
export const IG_H = 1350

export async function prepareForInstagram(file, { mode = 'fill', background = '#F9FAFB' } = {}) {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error(`Formato non supportato: ${file.name}`)
  }
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`Impossibile leggere ${file.name}. Prova JPG o PNG.`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = IG_W
  canvas.height = IG_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, IG_W, IG_H)
  ctx.imageSmoothingQuality = 'high'

  const scale = mode === 'fit'
    ? Math.min(IG_W / bitmap.width, IG_H / bitmap.height)
    : Math.max(IG_W / bitmap.width, IG_H / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.drawImage(bitmap, (IG_W - w) / 2, (IG_H - h) / 2, w, h)
  bitmap.close?.()

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione JPEG fallita'))), 'image/jpeg', 0.9)
  )
}
