import { createClient } from '@/lib/supabase/server'

// Le route /api/instagram/* non passano dal middleware: verifichiamo qui
// sessione + ruolo admin. Il client restituito porta la sessione dell'utente,
// quindi anche RLS (is_admin) protegge ogni lettura/scrittura.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: json({ error: 'Accesso richiesto' }, 401) }
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (error) console.error('[instagram] profile lookup', error)
  if (profile?.role !== 'admin') return { error: json({ error: 'Non autorizzato' }, 403) }
  return { supabase, user }
}

export function json(body, status = 200) {
  return Response.json(body, { status })
}
