// Condor AI (Condoreco Plus): riassume la chat del condominio con
// Claude Haiku. Richiede un piano con Condor attivo; massimo 20 usi
// al giorno per utente (protezione dei costi).
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { building_id } = await req.json().catch(() => ({}))
    if (!building_id) return json({ error: 'building_id mancante' }, 400)

    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await anon.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)

    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: enabled } = await svc.rpc('has_condor', { p_user: user.id })
    if (!enabled) return json({ error: 'pro_required' }, 403)

    const { data: member } = await svc.from('condo_members')
      .select('user_id').eq('building_id', building_id).eq('user_id', user.id).maybeSingle()
    if (!member) return json({ error: 'Non sei membro di questo condominio' }, 403)

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return json({ error: 'not_configured' }, 503)

    const { data: remaining, error: spendErr } = await svc.rpc('condor_spend', { p_user: user.id })
    if (spendErr) return json({ error: 'Errore inatteso' }, 500)
    if (remaining === null) return json({ error: 'quota' }, 429)

    const { data: msgs } = await svc.from('messages')
      .select('content, created_at, kind, hidden, profiles:created_by(display_name)')
      .eq('building_id', building_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(60)
    const lines = (msgs ?? [])
      .filter((m) => !m.hidden && m.content && (!m.kind || m.kind === 'text'))
      .reverse()
      .map((m) => `${new Date(m.created_at).toLocaleDateString('it-IT')} · ${m.profiles?.display_name ?? 'Residente'}: ${String(m.content).slice(0, 400)}`)
    if (!lines.length) return json({ summary: 'Non ci sono ancora messaggi da riassumere in questa chat.', remaining })

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 500,
        system: "Sei Condor, l'assistente di Condoreco. Riassumi la chat di un condominio in italiano, in modo neutro e pratico: temi discussi, decisioni prese, cose in sospeso, date da ricordare. Al massimo 6 punti elenco brevi, senza giudizi sulle persone. Non inventare nulla: se un'informazione non c'è, non la aggiungi.",
        messages: [{ role: 'user', content: 'Messaggi recenti della chat del condominio:\n\n' + lines.join('\n') }],
      }),
    })
    if (!r.ok) {
      console.error('[condor-chat-summary] anthropic', r.status, await r.text())
      return json({ error: 'ai_error' }, 502)
    }
    const out = await r.json()
    const summary = (out.content ?? []).filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text).join('\n').trim()
    return json({ summary, remaining })
  } catch (e) {
    console.error('[condor-chat-summary]', e)
    return json({ error: 'Errore inatteso' }, 500)
  }
})
