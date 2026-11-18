// Ricerca per significato nell'archivio documenti del condominio.
// Calcola il vettore della domanda con gte-small (dentro Supabase) e chiama
// search_condo_documents con l'identità dell'utente: le regole di accesso (RLS)
// decidono quali documenti può vedere. La domanda non viene scritta nei log.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
const model = new (globalThis as any).Supabase.ai.Session('gte-small')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const { building_id, query, limit } = await req.json().catch(() => ({}))
    const q = typeof query === 'string' ? query.trim().slice(0, 300) : ''
    if (!building_id || q.length < 2) return json({ error: 'Domanda mancante' }, 400)

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)

    const { data: member, error: mErr } = await userClient.rpc('is_member', { p_building: building_id })
    if (mErr) { console.error('[document-search] is_member', mErr.message); return json({ error: 'Errore inatteso' }, 500) }
    if (!member) return json({ error: 'Non fai parte di questo condominio' }, 403)

    const out = await model.run(q, { mean_pool: true, normalize: true })
    const embedding = JSON.stringify(Array.from(out as ArrayLike<number>))

    const { data, error } = await userClient.rpc('search_condo_documents', {
      p_building: building_id, p_query: q, p_embedding: embedding, p_limit: Math.min(Number(limit) || 8, 20),
    })
    if (error) { console.error('[document-search] rpc', error.message); return json({ error: 'Ricerca non riuscita' }, 500) }
    return json({ results: data ?? [] })
  } catch (e) {
    console.error('[document-search]', e instanceof Error ? e.message : String(e))
    return json({ error: 'Errore inatteso' }, 500)
  }
})
