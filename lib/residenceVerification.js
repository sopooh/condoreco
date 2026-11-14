// Verifica di residenza reale: il documento va nel bucket privato
// residence-docs (<building>/<user>/<file>), la richiesta in
// condo_join_requests. Decide l'admin del condominio o, se il condominio non
// ha admin, lo staff Condoreco (RPC review_condo_join, che crea la riga in
// condo_members). Il documento viene cancellato appena la richiesta e'
// decisa o ritirata: lo fa il client di chi decide/ritira, poi
// clear_join_document azzera il percorso.
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'residence-docs'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export const DOCUMENT_LABELS = {
  certificato: 'Certificato di residenza',
  affitto: 'Contratto di affitto',
  rogito: 'Rogito',
  bolletta: 'Bolletta',
}

export function validateDocument(file) {
  if (!file) return 'Scegli un file.'
  if (file.size > MAX_BYTES) return 'Il file supera i 10 MB.'
  if (file.type && !ALLOWED.includes(file.type)) return 'Formato non supportato: usa PDF, JPG, PNG o HEIC.'
  return null
}

// Ultima richiesta dell'utente per il condominio:
// { status: 'not_started' } oppure { status, id, reason, created_at }
export async function getMyJoinRequest(buildingId) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('condo_join_requests')
    .select('id, status, reason, created_at')
    .eq('building_id', buildingId)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[residenceVerification] read failed', error.message)
    return { status: 'error' }
  }
  return data ?? { status: 'not_started' }
}

export async function submitJoinRequest({ buildingId, userId, file, documentType, unit }) {
  const invalid = validateDocument(file)
  if (invalid) return { error: invalid }
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'
  const path = `${buildingId}/${userId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (upErr) {
    console.error('[residenceVerification] upload failed', upErr.message)
    return { error: 'Caricamento non riuscito. Riprova.' }
  }
  const { data, error } = await supabase.rpc('request_condo_join', {
    p_building: buildingId,
    p_document_type: documentType,
    p_document_path: path,
    p_floor: unit?.floor ?? null,
    p_millesimi: unit?.millesimi ?? null,
    p_tenure: unit?.tenure ?? null,
  })
  if (error) {
    console.error('[residenceVerification] request failed', error.message)
    await supabase.storage.from(BUCKET).remove([path])
    if (error.code === '23505') return { error: 'Sei già membro di questo condominio.' }
    return { error: 'Invio della richiesta non riuscito. Riprova.' }
  }
  return { id: data }
}

async function deleteDocument(supabase, requestId, path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error('[residenceVerification] document delete failed', error.message)
    return
  }
  const { error: clrErr } = await supabase.rpc('clear_join_document', { p_request: requestId })
  if (clrErr) console.error('[residenceVerification] clear path failed', clrErr.message)
}

export async function withdrawJoinRequest(requestId) {
  const supabase = createClient()
  const { data: path, error } = await supabase.rpc('withdraw_condo_join', { p_request: requestId })
  if (error) {
    console.error('[residenceVerification] withdraw failed', error.message)
    return { error: 'Non siamo riusciti a ritirare la richiesta.' }
  }
  await deleteDocument(supabase, requestId, path)
  return {}
}

// Per chi decide: richieste in attesa (tutte quelle che puo' decidere, o di un condominio)
export async function listPendingJoinRequests(buildingId = null) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('pending_join_requests', { p_building: buildingId })
  if (error) {
    console.error('[residenceVerification] pending list failed', error.message)
    return { error: 'Impossibile caricare le richieste.', rows: [] }
  }
  return { rows: data ?? [] }
}

// URL firmato breve (5 minuti) per vedere il documento
export async function getDocumentUrl(path) {
  if (!path) return null
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
  if (error) {
    console.error('[residenceVerification] signed url failed', error.message)
    return null
  }
  return data?.signedUrl ?? null
}

export async function reviewJoinRequest(requestId, approve, reason = null) {
  const supabase = createClient()
  const { data: path, error } = await supabase.rpc('review_condo_join', {
    p_request: requestId, p_approve: approve, p_reason: reason,
  })
  if (error) {
    console.error('[residenceVerification] review failed', error.message)
    return { error: 'Operazione non riuscita. Ricarica la pagina e riprova.' }
  }
  await deleteDocument(supabase, requestId, path)
  return {}
}
