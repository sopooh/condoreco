// Lavori in background delle assemblee (pg_cron ogni 10 minuti, oppure dall'app
// dopo il caricamento di un pezzo di registrazione):
// 1. aggiorna lo stato di PEC e raccomandate (accettazione, consegna);
// 2. trascrive i pezzi di audio con OpenAI (modello OPENAI_TRANSCRIBE_MODEL,
//    predefinito gpt-transcribe), solo se l'assemblea ha il consenso alla registrazione;
// 3. cancella l'audio 30 giorni dopo il verbale definitivo (GDPR).
// Chiamata da pg_cron: { token }. Dall'app: { assembly_id } con il JWT dell'amministratore.
// Il contenuto dell'audio e delle trascrizioni non viene mai scritto nei log.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { CORS, json, openapiConfigured, pecStatus, raccomandataStatus, type Sender } from '../_shared/assembly.ts'

const AUDIO_BUCKET = 'assembly-audio'
const MAX_ATTEMPTS = 5

async function pollReceipts(svc: SupabaseClient, assemblyId?: string) {
  if (!openapiConfigured()) return 0
  let q = svc.from('condo_assembly_recipients').select('id, provider, provider_ref, sent_by, status')
    .in('status', ['sent', 'accepted']).not('provider_ref', 'is', null)
    .gte('sent_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(40)
  if (assemblyId) q = q.eq('assembly_id', assemblyId)
  const { data: rows } = await q
  const senders = new Map<string, { sender: Sender; password: string } | null>()
  let n = 0
  for (const r of rows ?? []) {
    try {
      let res: { status: string; at?: string }
      if (r.provider === 'openapi_pec') {
        if (!senders.has(r.sent_by)) {
          const { data: s } = await svc.from('admin_sending_settings').select('*').eq('user_id', r.sent_by).maybeSingle()
          const { data: p } = await svc.rpc('get_sending_secret', { p_user: r.sent_by })
          senders.set(r.sent_by, s && p ? { sender: s as Sender, password: p as string } : null)
        }
        const cred = senders.get(r.sent_by)
        if (!cred) continue
        res = await pecStatus({ ...cred, code: r.provider_ref })
      } else if (r.provider === 'openapi_raccomandata') {
        res = await raccomandataStatus(r.provider_ref)
      } else continue
      if (res.status !== r.status && res.status !== 'sent') {
        await svc.from('condo_assembly_recipients').update({
          status: res.status,
          ...(res.status === 'delivered' ? { delivered_at: res.at ? new Date(res.at).toISOString() : new Date().toISOString() } : {}),
          ...(res.status === 'failed' ? { error: 'Consegna non riuscita secondo il gestore' } : {}),
        }).eq('id', r.id)
        n++
      }
    } catch (e) {
      console.error('[assembly-worker] receipt', r.id, (e instanceof Error ? e.message : String(e)).slice(0, 160))
    }
  }
  return n
}

async function transcribe(svc: SupabaseClient, assemblyId?: string) {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return 0
  const model = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') || 'gpt-transcribe'
  let q = svc.from('condo_assembly_recordings').select('id, assembly_id, file_path, mime_type, attempts, segment')
    .in('status', ['uploaded', 'transcribing']).lt('attempts', MAX_ATTEMPTS).order('segment').limit(3)
  if (assemblyId) q = q.eq('assembly_id', assemblyId)
  const { data: rows } = await q
  let n = 0
  for (const r of rows ?? []) {
    const { data: a } = await svc.from('condo_assemblies').select('recording_consent, title').eq('id', r.assembly_id).maybeSingle()
    if (!a?.recording_consent || !r.file_path) {
      await svc.from('condo_assembly_recordings').update({ status: 'error', error: 'Manca il consenso alla registrazione', attempts: MAX_ATTEMPTS }).eq('id', r.id)
      continue
    }
    await svc.from('condo_assembly_recordings').update({ status: 'transcribing', attempts: r.attempts + 1 }).eq('id', r.id)
    try {
      const { data: file, error } = await svc.storage.from(AUDIO_BUCKET).download(r.file_path)
      if (error || !file) throw new Error('download failed')
      const form = new FormData()
      const ext = (r.file_path.split('.').pop() || 'webm').toLowerCase()
      form.append('file', new File([file], `segment-${r.segment}.${ext}`, { type: r.mime_type || file.type || 'audio/webm' }))
      form.append('model', model)
      form.append('language', 'it')
      form.append('response_format', 'text')
      form.append('prompt', `Assemblea di condominio "${a.title}". Termini frequenti: amministratore, millesimi, ordine del giorno, delibera, preventivo, consuntivo, quorum, delega, condomini.`)
      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
      })
      if (!resp.ok) throw new Error(`openai ${resp.status}: ${(await resp.text()).slice(0, 160)}`)
      const text = (await resp.text()).trim()
      await svc.from('condo_assembly_recordings').update({ status: 'done', transcript: text.slice(0, 200000), error: null }).eq('id', r.id)
      n++
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
      console.error('[assembly-worker] transcribe', r.id, msg)
      await svc.from('condo_assembly_recordings').update({ status: r.attempts + 1 >= MAX_ATTEMPTS ? 'error' : 'uploaded', error: msg }).eq('id', r.id)
    }
  }
  return n
}

async function purgeAudio(svc: SupabaseClient) {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: mins } = await svc.from('condo_assembly_minutes').select('assembly_id').lt('finalized_at', cutoff)
  const ids = (mins ?? []).map((m) => m.assembly_id)
  if (!ids.length) return 0
  const { data: recs } = await svc.from('condo_assembly_recordings').select('id, file_path').in('assembly_id', ids).not('file_path', 'is', null).limit(100)
  const paths = (recs ?? []).map((r) => r.file_path as string)
  if (!paths.length) return 0
  const { error } = await svc.storage.from(AUDIO_BUCKET).remove(paths)
  if (error) { console.error('[assembly-worker] purge', error.message); return 0 }
  await svc.from('condo_assembly_recordings').update({ file_path: null }).in('id', (recs ?? []).map((r) => r.id))
  return paths.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))

  if (body.assembly_id) {
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)
    const { data: a } = await svc.from('condo_assemblies').select('building_id').eq('id', body.assembly_id).maybeSingle()
    if (!a) return json({ error: 'Assemblea non trovata' }, 404)
    const { data: isAdmin } = await userClient.rpc('is_condo_admin', { p_building: a.building_id })
    if (!isAdmin) return json({ error: 'forbidden' }, 403)
    const receipts = await pollReceipts(svc, body.assembly_id)
    const transcribed = await transcribe(svc, body.assembly_id)
    return json({ receipts, transcribed, transcription_configured: !!Deno.env.get('OPENAI_API_KEY'), sending_configured: openapiConfigured() })
  }

  if (!body.token) return json({ error: 'forbidden' }, 403)
  const { data: ok, error: tErr } = await svc.rpc('use_cleanup_token', { p_token: body.token })
  if (tErr || !ok) return json({ error: 'forbidden' }, 403)
  const receipts = await pollReceipts(svc)
  const transcribed = await transcribe(svc)
  const purged = await purgeAudio(svc)
  return json({ receipts, transcribed, purged })
})
