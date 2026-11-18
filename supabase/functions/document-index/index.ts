// Indicizzazione dell'archivio documenti del condominio.
// 1. Estrae il testo (PDF con unpdf, Word .docx con mammoth, testo semplice).
// 2. Lo divide in pezzi di circa 1.000 caratteri con un po' di sovrapposizione.
// 3. Calcola i vettori con gte-small (gira dentro Supabase, nessun servizio esterno).
// Lavora a lotti per restare nei limiti di CPU: quello che non finisce lo
// completa il passaggio periodico (pg_cron, run_document_indexing, ogni 5 minuti).
//
// Due modi di chiamarla:
// - dall'app subito dopo il caricamento: { document_id } con il JWT dell'utente
//   (deve poter leggere il documento);
// - da pg_cron: { token } monouso preso da cleanup_tokens.
// Il contenuto dei documenti non viene mai scritto nei log (GDPR).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1'
import { Buffer } from 'node:buffer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const BUCKET = 'condo-documents'
const CHUNK_CHARS = 1000      // gte-small legge al massimo 512 token
const CHUNK_OVERLAP = 150
const EMBED_BATCH = 24        // vettori per chiamata: sta nei limiti di CPU
const MAX_DOCS_PER_RUN = 3
const MAX_ATTEMPTS = 5
const MIN_TEXT_CHARS = 40     // sotto questa soglia il PDF è probabilmente una scansione

// deno-lint-ignore no-explicit-any
const model = new (globalThis as any).Supabase.ai.Session('gte-small')

async function embed(text: string): Promise<number[]> {
  const out = await model.run(text, { mean_pool: true, normalize: true })
  return Array.from(out as ArrayLike<number>)
}

type Page = { page: number | null; text: string }

function clean(s: string) {
  return s.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

async function extractPages(file: Blob, name: string, mime: string | null): Promise<Page[] | 'unsupported'> {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const type = (mime || file.type || '').toLowerCase()
  const buf = new Uint8Array(await file.arrayBuffer())

  if (type === 'application/pdf' || ext === 'pdf') {
    const pdf = await getDocumentProxy(buf)
    const { text } = await extractText(pdf, { mergePages: false })
    return (text as string[]).map((t, i) => ({ page: i + 1, text: clean(t) }))
  }
  if (type.includes('wordprocessingml') || ext === 'docx') {
    const mammoth = await import('npm:mammoth@1.8.0')
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
    return [{ page: null, text: clean(value) }]
  }
  if (type.startsWith('text/') || ext === 'txt') {
    return [{ page: null, text: clean(new TextDecoder().decode(buf)) }]
  }
  // immagini, .doc e fogli di calcolo: niente testo per ora (OCR in una fase successiva)
  return 'unsupported'
}

// Divide il testo di ogni pagina in pezzi, preferendo tagliare a fine paragrafo o frase.
function chunkPages(pages: Page[]) {
  const chunks: { page: number | null; content: string }[] = []
  for (const p of pages) {
    let t = p.text
    while (t.length > 0) {
      if (t.length <= CHUNK_CHARS) { chunks.push({ page: p.page, content: t }); break }
      let cut = t.lastIndexOf('\n', CHUNK_CHARS)
      if (cut < CHUNK_CHARS * 0.5) cut = t.lastIndexOf('. ', CHUNK_CHARS) + 1
      if (cut < CHUNK_CHARS * 0.5) cut = t.lastIndexOf(' ', CHUNK_CHARS)
      if (cut < CHUNK_CHARS * 0.5) cut = CHUNK_CHARS
      chunks.push({ page: p.page, content: t.slice(0, cut).trim() })
      t = t.slice(Math.max(cut - CHUNK_OVERLAP, 1)).trimStart()
      // riparte dall'inizio di una parola
      const sp = t.indexOf(' ')
      if (sp > 0 && sp < 40) t = t.slice(sp + 1)
    }
  }
  return chunks.filter((c) => c.content.length >= 20)
}

// deno-lint-ignore no-explicit-any
async function extractDocument(svc: SupabaseClient, doc: any) {
  await svc.from('condo_documents')
    .update({ text_status: 'processing', index_attempts: (doc.index_attempts ?? 0) + 1, text_error: null })
    .eq('id', doc.id)

  const { data: file, error: dlErr } = await svc.storage.from(BUCKET).download(doc.file_path)
  if (dlErr || !file) throw new Error('download failed')

  const pages = await extractPages(file, doc.file_name, doc.mime_type)
  if (pages === 'unsupported') {
    await svc.from('condo_documents').update({ text_status: 'unsupported', indexed_at: new Date().toISOString() }).eq('id', doc.id)
    return
  }
  const totalChars = pages.reduce((n, p) => n + p.text.length, 0)
  if (totalChars < MIN_TEXT_CHARS) {
    await svc.from('condo_documents')
      .update({ text_status: 'no_text', text_pages: pages.length, text_chars: totalChars, indexed_at: new Date().toISOString() })
      .eq('id', doc.id)
    return
  }

  const chunks = chunkPages(pages)
  await svc.from('condo_document_chunks').delete().eq('document_id', doc.id)
  for (let i = 0; i < chunks.length; i += 200) {
    const rows = chunks.slice(i, i + 200).map((c, j) => ({
      document_id: doc.id, building_id: doc.building_id, chunk_index: i + j, page: c.page, content: c.content,
    }))
    const { error } = await svc.from('condo_document_chunks').insert(rows)
    if (error) throw new Error('insert chunks: ' + error.message)
  }
  await svc.from('condo_documents').update({ text_pages: pages.length, text_chars: totalChars }).eq('id', doc.id)
}

// Calcola i vettori mancanti; restituisce quanti ne restano per quel documento.
async function embedPending(svc: SupabaseClient, documentId: string, budget: number) {
  const { data: rows, error } = await svc.from('condo_document_chunks')
    .select('id, content').eq('document_id', documentId).is('embedding', null)
    .order('chunk_index').limit(budget)
  if (error) throw new Error('load chunks: ' + error.message)
  for (const r of rows ?? []) {
    const v = await embed(r.content)
    const { error: uErr } = await svc.from('condo_document_chunks').update({ embedding: JSON.stringify(v) }).eq('id', r.id)
    if (uErr) throw new Error('save embedding: ' + uErr.message)
  }
  const { count } = await svc.from('condo_document_chunks')
    .select('id', { count: 'exact', head: true }).eq('document_id', documentId).is('embedding', null)
  return { done: rows?.length ?? 0, left: count ?? 0 }
}

// deno-lint-ignore no-explicit-any
async function processDocument(svc: SupabaseClient, doc: any, budget: number) {
  try {
    const { count: existing } = await svc.from('condo_document_chunks')
      .select('id', { count: 'exact', head: true }).eq('document_id', doc.id)
    if (doc.text_status === 'pending' || !existing) {
      await extractDocument(svc, doc)
      const { data: now } = await svc.from('condo_documents').select('text_status').eq('id', doc.id).maybeSingle()
      if (now?.text_status !== 'processing') return { id: doc.id, status: now?.text_status, used: 0 }
    }
    const { done, left } = await embedPending(svc, doc.id, budget)
    if (left === 0) {
      await svc.from('condo_documents').update({ text_status: 'indexed', indexed_at: new Date().toISOString(), text_error: null }).eq('id', doc.id)
    }
    return { id: doc.id, status: left === 0 ? 'indexed' : 'processing', used: done, left }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[document-index]', doc.id, msg.slice(0, 200))
    const attempts = (doc.index_attempts ?? 0) + 1
    const failed = attempts >= MAX_ATTEMPTS
    await svc.from('condo_documents')
      .update({ text_status: failed ? 'error' : 'processing', text_error: msg.slice(0, 300), index_attempts: attempts })
      .eq('id', doc.id)
    return { id: doc.id, status: failed ? 'error' : 'retry', used: 0 }
  }
}

const DOC_COLUMNS = 'id, building_id, file_path, file_name, mime_type, text_status, index_attempts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))

  // Chiamata dall'app: un solo documento, che l'utente deve poter leggere.
  if (body.document_id) {
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)
    const { data: visible, error: vErr } = await userClient.from('condo_documents').select('id').eq('id', body.document_id).maybeSingle()
    if (vErr) { console.error('[document-index] check', vErr.message); return json({ error: 'Errore inatteso' }, 500) }
    if (!visible) return json({ error: 'Documento non trovato' }, 404)
    const { data: doc } = await svc.from('condo_documents').select(DOC_COLUMNS).eq('id', body.document_id).maybeSingle()
    if (!doc) return json({ error: 'Documento non trovato' }, 404)
    if (!['pending', 'processing'].includes(doc.text_status)) return json({ id: doc.id, status: doc.text_status })
    return json(await processDocument(svc, doc, EMBED_BATCH))
  }

  // Passaggio periodico da pg_cron.
  if (!body.token) return json({ error: 'forbidden' }, 403)
  const { data: ok, error: tErr } = await svc.rpc('use_cleanup_token', { p_token: body.token })
  if (tErr || !ok) return json({ error: 'forbidden' }, 403)

  const { data: docs, error } = await svc.from('condo_documents').select(DOC_COLUMNS)
    .in('text_status', ['pending', 'processing']).lt('index_attempts', MAX_ATTEMPTS)
    .order('created_at').limit(MAX_DOCS_PER_RUN)
  if (error) { console.error('[document-index] list', error.message); return json({ error: 'list failed' }, 500) }

  let budget = EMBED_BATCH * 2
  const results = []
  for (const doc of docs ?? []) {
    if (budget <= 0) break
    const r = await processDocument(svc, doc, budget)
    budget -= r.used
    results.push(r)
  }
  return json({ processed: results })
})
