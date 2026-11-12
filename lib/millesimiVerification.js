import { createClient } from '@/lib/supabase/client'

// Verifica dei millesimi: il proprietario carica riparto spese o regolamento
// (bucket privato millesimi-docs, cartella <condominio>/<utente>/), l'amministratore
// del condominio o lo staff approva o respinge. Il file si cancella alla decisione.

export const BUCKET = 'millesimi-docs'
export const MAX_SIZE = 10 * 1024 * 1024
export const DOCUMENT_TYPES = [
  { value: 'riparto', label: 'Ripartizione spese', hint: 'Il riparto o il preventivo con la tua quota' },
  { value: 'regolamento', label: 'Regolamento condominiale', hint: 'Con la tabella millesimale allegata' },
]
export const documentTypeLabel = (v) => DOCUMENT_TYPES.find((d) => d.value === v)?.label ?? v

const ACCEPTED = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif))$/
const safeName = (name) => name.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(-80) || 'documento'

export function validateMillesimiFile(file) {
  if (!file) return 'Carica il documento.'
  if (!ACCEPTED.test(file.type) && !/\.(pdf|jpe?g|png|webp|heic)$/i.test(file.name)) return 'Carica un PDF o una foto (JPG, PNG, HEIC).'
  if (file.size > MAX_SIZE) return 'File troppo grande (massimo 10 MB).'
  return null
}

// Ultima richiesta del residente per questo condominio
export async function fetchMyMillesimiVerification(buildingId, userId) {
  const { data, error } = await createClient()
    .from('millesimi_verifications')
    .select('id, millesimi, status, reject_reason, document_type, created_at, reviewed_at')
    .eq('building_id', buildingId).eq('user_id', userId)
    .neq('status', 'superseded')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) console.error('[millesimi] fetch', error.message)
  return data ?? null
}

export async function submitMillesimiVerification({ buildingId, userId, file, millesimi, documentType, nameOnDocument, previousOwnerName }) {
  const fileErr = validateMillesimiFile(file)
  if (fileErr) return { error: fileErr }
  const supabase = createClient()
  const path = `${buildingId}/${userId}/${crypto.randomUUID()}-${safeName(file.name)}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) {
    console.error('[millesimi] upload', upErr.message)
    return { error: 'Caricamento del documento non riuscito. Riprova.' }
  }
  const { data, error } = await supabase.rpc('submit_millesimi_verification', {
    p_building: buildingId, p_millesimi: millesimi, p_document_type: documentType, p_path: path, p_file_name: file.name,
    p_name_on_document: nameOnDocument, p_previous_owner_name: previousOwnerName || null, p_attest: true,
  })
  if (error) {
    console.error('[millesimi] submit', error.message)
    await supabase.storage.from(BUCKET).remove([path])
    return { error: 'Richiesta non inviata. Riprova.' }
  }
  const replaced = (Array.isArray(data) ? data[0] : data)?.replaced_path
  if (replaced) await supabase.storage.from(BUCKET).remove([replaced])
  return { error: null }
}

export async function fetchPendingMillesimi(buildingId) {
  const { data, error } = await createClient().rpc('millesimi_verifications_pending', { p_building: buildingId })
  if (error) console.error('[millesimi] pending', error.message)
  return { rows: data || [], error }
}

export async function millesimiDocUrl(path) {
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path, 300)
  if (error) console.error('[millesimi] signed url', error.message)
  return data?.signedUrl ?? null
}

export async function reviewMillesimi({ id, approve, reason }) {
  const supabase = createClient()
  const { data: path, error } = await supabase.rpc('review_millesimi_verification', { p_id: id, p_approve: approve, p_reason: reason || null })
  if (error) {
    console.error('[millesimi] review', error.message)
    return { error: /già esaminata/.test(error.message) ? 'Questa richiesta è già stata esaminata.' : 'Operazione non riuscita. Riprova.' }
  }
  // documento cancellato appena c'è la decisione
  if (path) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path])
    if (rmErr) console.error('[millesimi] remove', rmErr.message)
  }
  return { error: null }
}
