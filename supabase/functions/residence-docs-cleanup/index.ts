// Pulizia notturna dei documenti di residenza abbandonati (bucket residence-docs):
// file caricati da piu' di 24 ore che nessuna richiesta in attesa usa.
// La chiama pg_cron (run_residence_docs_cleanup) con un gettone monouso
// salvato in cleanup_tokens: senza gettone valido non fa niente.
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const { token } = await req.json().catch(() => ({}))
  if (!token) return json({ error: 'forbidden' }, 403)

  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: ok, error: tErr } = await svc.rpc('use_cleanup_token', { p_token: token })
  if (tErr || !ok) return json({ error: 'forbidden' }, 403)

  const { data: names, error } = await svc.rpc('orphan_residence_docs', { p_hours: 24 })
  if (error) { console.error('[residence-docs-cleanup] list', error.message); return json({ error: 'list failed' }, 500) }
  const paths = (names ?? []).map((r: unknown) => (typeof r === 'string' ? r : (r as Record<string, string>).orphan_residence_docs)).filter(Boolean)
  if (!paths.length) return json({ removed: 0 })

  const { data: removed, error: rmErr } = await svc.storage.from('residence-docs').remove(paths)
  if (rmErr) { console.error('[residence-docs-cleanup] remove', rmErr.message); return json({ error: 'remove failed' }, 500) }
  console.log('[residence-docs-cleanup] removed', removed?.length ?? 0)
  return json({ removed: removed?.length ?? 0 })
})
