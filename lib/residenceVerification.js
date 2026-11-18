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
  autocertificazione: 'Autocertificazione',
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

// Le foto vengono convertite in JPEG prima del caricamento (anche HEIC da
// iPhone): pesano meno e Condor le puo' leggere.
async function prepareFile(file) {
  if (!file.type?.startsWith('image/') || file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') return file
  try {
    const { imageToJpegBytes } = await import('@/lib/autocertificazione')
    const bytes = await imageToJpegBytes(file)
    return new File([bytes], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// 1) carica il documento (non crea ancora la richiesta)
export async function uploadResidenceDocument({ buildingId, userId, file }) {
  const invalid = validateDocument(file)
  if (invalid) return { error: invalid }
  const ready = await prepareFile(file)
  const supabase = createClient()
  const ext = (ready.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'
  const path = `${buildingId}/${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, ready, { contentType: ready.type || undefined, upsert: false })
  if (error) {
    console.error('[residenceVerification] upload failed', error.message)
    return { error: 'Caricamento non riuscito. Riprova.' }
  }
  return { path }
}

// 2) Condor controlla il documento: { report } oppure { error, code }
const PRECHECK_ERRORS = {
  quota: 'Hai fatto troppi controlli oggi.',
  not_configured: 'Il controllo automatico non è attivo.',
  ai_error: 'Condor non è riuscito a leggere il documento.',
  unsupported: 'Condor non legge questo formato.',
}
export async function precheckResidenceDocument({ buildingId, path, documentType, declarantName }) {
  const { data, error } = await createClient().functions.invoke('residence-precheck', {
    body: { building_id: buildingId, document_path: path, document_type: documentType, declarant: declarantName ? { name: declarantName } : null },
  })
  if (error) {
    let code = null
    try { code = (await error.context?.json())?.error ?? null } catch { /* risposta non JSON */ }
    console.error('[residenceVerification] precheck failed', code || error.message)
    return { error: PRECHECK_ERRORS[code] || 'Controllo automatico non riuscito.', code: code || 'error' }
  }
  if (!data?.report) return { error: 'Controllo automatico non riuscito.', code: 'error' }
  return { report: data.report }
}

// Documento sbagliato o sostituito: lo cancella subito
export async function discardResidenceDocument(path) {
  if (!path) return
  const { error } = await createClient().storage.from(BUCKET).remove([path])
  if (error) console.error('[residenceVerification] discard failed', error.message)
}

// 3) crea la richiesta col documento gia' caricato (l'esito di Condor viene
// agganciato dal database)
export async function createJoinRequest({ buildingId, path, documentType, unit }) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('request_condo_join', {
    p_building: buildingId,
    p_document_type: documentType,
    p_document_path: path,
    p_floor: unit?.floor ?? null,
    p_millesimi: unit?.millesimi ?? null,
    p_tenure: unit?.tenure ?? null,
    p_unit_code: unit?.unitCode ?? null,
    p_pec: unit?.pec ?? null,
  })
  if (error) {
    console.error('[residenceVerification] request failed', error.message)
    if (error.code === '23505') return { error: 'Sei già membro di questo condominio.' }
    return { error: 'Invio della richiesta non riuscito. Riprova.' }
  }
  return { id: data }
}

export async function submitJoinRequest({ buildingId, userId, file, documentType, unit }) {
  const up = await uploadResidenceDocument({ buildingId, userId, file })
  if (up.error) return up
  const res = await createJoinRequest({ buildingId, path: up.path, documentType, unit })
  if (res.error) await discardResidenceDocument(up.path)
  return res
}

// Per chi decide: archivio delle verifiche gia' decise (senza file, solo l'esito)
export async function listDecidedJoinRequests(buildingId = null) {
  const { data, error } = await createClient().rpc('decided_join_requests', { p_building: buildingId })
  if (error) {
    console.error('[residenceVerification] decided list failed', error.message)
    return { error: 'Impossibile caricare lo storico.', rows: [] }
  }
  return { rows: data ?? [] }
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

// link (solo se approve): { unitId } oppure { newUnitCode }, piu' fullName e role
// per l'anagrafe. Senza link il condomino entra ma non viene collegato a un'unita'.
export async function reviewJoinRequest(requestId, approve, reason = null, link = null) {
  const supabase = createClient()
  const { data: path, error } = await supabase.rpc('review_condo_join', {
    p_request: requestId, p_approve: approve, p_reason: reason,
    p_unit: approve ? link?.unitId ?? null : null,
    p_new_unit_code: approve ? link?.newUnitCode ?? null : null,
    p_full_name: approve ? link?.fullName ?? null : null,
    p_role: approve ? link?.role ?? null : null,
  })
  if (error) {
    console.error('[residenceVerification] review failed', error.message)
    return { error: 'Operazione non riuscita. Ricarica la pagina e riprova.' }
  }
  await deleteDocument(supabase, requestId, path)
  return {}
}

// Parere di Condor sul documento (edge function document-checker). Solo per
// chi puo' decidere la richiesta; non salva nulla e non decide al posto
// dell'amministratore. Ritorna { report, disclaimer } oppure { error }.
const CHECK_ERRORS = {
  not_configured: 'Il controllo con Condor non è ancora attivo.',
  ai_error: 'Condor non è riuscito a leggere il documento. Riprova tra poco.',
}

export async function checkDocumentWithCondor(requestId) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('document-checker', { body: { request_id: requestId } })
  if (error) {
    let code = null
    try { code = (await error.context?.json())?.error ?? null } catch { /* risposta non JSON */ }
    console.error('[residenceVerification] condor check failed', code || error.message)
    return { error: CHECK_ERRORS[code] || code || 'Controllo non riuscito. Riprova.' }
  }
  if (!data?.report) return { error: 'Controllo non riuscito. Riprova.' }
  return { report: data.report, disclaimer: data.disclaimer }
}
