// Rendiconto mensile per i consiglieri.
// pg_cron (il 1° del mese) genera i numeri del mese precedente e chiama questa funzione,
// che aggiunge un breve commento di Condor (solo se l'amministratore ha Condor attivo)
// e manda l'email a consiglieri e amministratore. Nei numeri non ci sono nomi di morosi.
// Chiamata da pg_cron: { token, month }. Dall'app (amministratore): { building_id, month, send }.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/assembly.ts'
import { render, sendMails, userEmails, euro, emailConfigured, type Mail } from '../_shared/email.ts'

const MODEL = 'claude-haiku-5-5'
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const CAT: Record<string, string> = { maintenance: 'Manutenzione', services: 'Servizi', utilities: 'Utenze', insurance: 'Assicurazione', admin: 'Amministrazione', other: 'Altro' }

const monthLabel = (iso: string) => { const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`); return `${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}` }

// deno-lint-ignore no-explicit-any
function rowsOf(d: any): [string, string][] {
  return [
    ['Rate emesse', `${euro(Number(d.issued?.ordinaria || 0) + Number(d.issued?.straordinaria || 0))} (${d.issued?.count || 0})`],
    ['Incassato nel mese', euro(d.collected?.amount || 0)],
    ['Spese del mese', euro(d.expenses_total || 0)],
    ['Morosità a fine mese', `${euro(d.arrears?.amount || 0)} · ${d.arrears?.members || 0} condomini`],
    ['Di cui oltre 90 giorni', euro(d.arrears?.over_90_days || 0)],
    ['Anno: preventivo', euro(d.year_to_date?.budget || 0)],
    ['Anno: speso finora', euro(d.year_to_date?.spent || 0)],
    ['Anno: incassato finora', euro(d.year_to_date?.collected || 0)],
  ]
}

async function aiComment(key: string, condo: string, month: string, data: unknown) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 500,
      system: 'Sei Condor, assistente di Condoreco. Scrivi in italiano un commento di 3-5 frasi al rendiconto mensile di un condominio per i consiglieri: cosa va bene, cosa tenere d\'occhio (morosità, spese oltre il preventivo), senza inventare dati e senza nomi. Tono neutro e concreto. Niente elenchi puntati.',
      messages: [{ role: 'user', content: `Condominio ${condo}, ${month}. Dati (euro): ${JSON.stringify(data)}. Categorie spese: ${JSON.stringify(CAT)}.` }],
    }),
  })
  if (!r.ok) { console.error('[monthly-reports] anthropic', r.status); return null }
  const out = await r.json()
  return (out.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim().slice(0, 4000) || null
}

async function processReport(svc: SupabaseClient, reportId: string, send: boolean) {
  const { data: rep } = await svc.from('condo_monthly_reports').select('*').eq('id', reportId).maybeSingle()
  if (!rep) return { id: reportId, skipped: 'not found' }
  const { data: b } = await svc.from('buildings').select('address, street_number, city').eq('id', rep.building_id).maybeSingle()
  const condo = `${[b?.address, b?.street_number].filter(Boolean).join(' ')}${b?.city ? `, ${b.city}` : ''}`
  const month = monthLabel(rep.month)

  const { data: people } = await svc.from('condo_members').select('user_id, role, is_councillor').eq('building_id', rep.building_id)
  const admins = (people ?? []).filter((p) => p.role === 'admin').map((p) => p.user_id)
  const councillors = (people ?? []).filter((p) => p.is_councillor).map((p) => p.user_id)

  // commento di Condor: solo se un amministratore del condominio ha Condor attivo
  let comment = rep.ai_comment as string | null
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!comment && key) {
    let enabled = false
    for (const a of admins) { const { data } = await svc.rpc('has_condor', { p_user: a }); if (data) { enabled = true; break } }
    if (enabled) {
      comment = await aiComment(key, condo, month, rep.data)
      if (comment) await svc.from('condo_monthly_reports').update({ ai_comment: comment }).eq('id', rep.id)
    }
  }

  if (!send || rep.emailed_at || !emailConfigured()) return { id: rep.id, comment: !!comment, emailed: 0 }
  const to = await userEmails(svc, [...new Set([...admins, ...councillors])])
  const body = render({
    title: `Rendiconto di ${month}`,
    paragraphs: [`Ecco i numeri di ${month} del condominio di ${condo}.`, ...(comment ? [comment] : [])],
    rows: rowsOf(rep.data),
    cta: { label: 'Apri il rendiconto', path: `/edificio/${rep.building_id}/condominio/rendicontazione` },
    footer: 'Ricevi questa email perché sei consigliere o amministratore di questo condominio.',
  })
  const mails: Mail[] = [...to.values()].map((email) => ({ to: email, subject: `Rendiconto di ${month} · ${condo}`, ...body }))
  const sent = await sendMails(mails, `monthly-report-${rep.id}`)
  if (sent > 0) await svc.from('condo_monthly_reports').update({ emailed_at: new Date().toISOString() }).eq('id', rep.id)
  return { id: rep.id, comment: !!comment, emailed: sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))
  try {
    // dall'app: l'amministratore genera (o rigenera) un mese e, se vuole, lo invia
    if (body.building_id) {
      const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) return json({ error: 'Non autenticato' }, 401)
      const month = String(body.month || '').slice(0, 10)
      if (!/^\d{4}-\d{2}-01$/.test(month)) return json({ error: 'Mese non valido' }, 400)
      const { data: id, error } = await userClient.rpc('generate_monthly_report', { p_building: body.building_id, p_month: month })
      if (error) return json({ error: error.code === '42501' ? 'Solo l\'amministratore' : 'Generazione non riuscita' }, error.code === '42501' ? 403 : 500)
      if (body.regenerate_comment) await svc.from('condo_monthly_reports').update({ ai_comment: null }).eq('id', id)
      if (body.send) await svc.from('condo_monthly_reports').update({ emailed_at: null }).eq('id', id)
      return json(await processReport(svc, id as string, !!body.send))
    }

    if (!body.token) return json({ error: 'forbidden' }, 403)
    const { data: ok, error: tErr } = await svc.rpc('use_cleanup_token', { p_token: body.token })
    if (tErr || !ok) return json({ error: 'forbidden' }, 403)
    const { data: reps } = await svc.from('condo_monthly_reports').select('id').eq('month', String(body.month).slice(0, 10)).is('emailed_at', null)
    const results = []
    for (const r of reps ?? []) results.push(await processReport(svc, r.id, true))
    return json({ processed: results })
  } catch (e) {
    console.error('[monthly-reports]', e instanceof Error ? e.message : String(e))
    return json({ error: 'Errore inatteso' }, 500)
  }
})
