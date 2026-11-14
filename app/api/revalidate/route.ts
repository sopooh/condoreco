import { revalidatePath } from 'next/cache'
import { SeverityNumber } from '@opentelemetry/api-logs'
import { posthogLogger } from '@/instrumentation'
import { createClient } from '@/lib/supabase/server'

// Svuota la cache (ISR) delle pagine pubbliche dopo una moderazione dell'admin:
// senza questo una foto o una recensione rifiutata restava visibile fino a
// un'ora sulla pagina dell'edificio. Solo gli admin del sito possono chiamarla
// e solo per i percorsi pubblici previsti qui sotto.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    posthogLogger?.emit({
      body: 'Cache revalidation denied because no authenticated session was present',
      severityNumber: SeverityNumber.WARN,
      attributes: { route: '/api/revalidate', denial_reason: 'unauthenticated' },
    })
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') {
    posthogLogger?.emit({
      body: 'Cache revalidation denied because the caller was not an administrator',
      severityNumber: SeverityNumber.WARN,
      attributes: { route: '/api/revalidate', denial_reason: 'not_admin' },
    })
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { buildings?: unknown; administrators?: unknown } = {}
  try { body = await request.json() } catch { /* corpo vuoto */ }
  const ids = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && UUID.test(x)).slice(0, 50)

  const paths: string[] = []
  ids(body.buildings).forEach((id) => paths.push(`/edificio/${id}`))
  ids(body.administrators).forEach((id) => paths.push(`/amministratore/${id}`))
  // elenchi che mostrano copertine, punteggi e numero di recensioni
  paths.push('/', '/cerca', '/amministratori')
  paths.forEach((p) => revalidatePath(p))

  posthogLogger?.emit({
    body: 'Administrator completed public cache revalidation',
    severityNumber: SeverityNumber.INFO,
    attributes: {
      route: '/api/revalidate',
      paths_revalidated: paths.length,
      building_paths_revalidated: ids(body.buildings).length,
      administrator_paths_revalidated: ids(body.administrators).length,
    },
  })

  return Response.json({ revalidated: paths })
}
