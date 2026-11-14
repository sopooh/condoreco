// "Chiedi ai residenti": riceve la domanda di chi cerca casa, calcola l'embedding
// con il modello integrato di Supabase (gte-small, 384 dimensioni) e la passa a
// nq_ask, che fa i controlli (email verificata, limiti, antispam), cerca nella
// memoria del condominio e decide se risponde Condor o se avvisare i residenti.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// @ts-ignore Supabase.ai è disponibile nel runtime delle edge function
const session = new Supabase.ai.Session('gte-small')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'Accedi per fare una domanda.' }, 401)

  let body: { building_id?: string; question?: string } = {}
  try { body = await req.json() } catch { /* body non valido */ }
  const question = (body.question || '').trim()
  if (!body.building_id || question.length < 8) return json({ error: 'Scrivi una domanda di almeno 8 caratteri.' }, 400)
  if (question.length > 500) return json({ error: 'La domanda è troppo lunga (massimo 500 caratteri).' }, 400)

  let embedding: number[]
  try {
    embedding = await session.run(question, { mean_pool: true, normalize: true }) as number[]
  } catch (e) {
    console.error('embedding error', e)
    return json({ error: 'Non riesco a elaborare la domanda ora. Riprova tra poco.' }, 500)
  }

  const { data, error } = await admin.rpc('nq_ask', {
    p_user: user.id,
    p_building: body.building_id,
    p_text: question,
    p_embedding: JSON.stringify(embedding),
  })
  if (error) {
    console.error('nq_ask error', error)
    return json({ error: 'Non sono riuscito a inviare la domanda. Riprova.' }, 500)
  }
  return json(data)
})
