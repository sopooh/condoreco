import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ────────────────────────────────────────────────────────────────────────
// SOLO letture pubbliche. Mai auth, mai mutation.
//
// Questo client non tocca cookies() — per questo può essere usato dentro
// generateStaticParams/pagine con revalidate senza forzare dynamic rendering
// (a differenza di '@/lib/supabase/server', che chiama cookies()
// incondizionatamente). Non ha però accesso alla sessione dell'utente: usarlo
// per dati per-utente o per scritture "funzionerebbe" in apparenza (le
// policy RLS per l'anon key lo permettono per le tabelle pubbliche) ma con
// comportamento silenziosamente sbagliato (nessuna identità, nessuna riga
// privata visibile). Per quello serve '@/lib/supabase/client' (browser,
// mutation/dati per-utente) o '@/lib/supabase/server' (cookie-aware, route
// dinamiche/protette).
// ────────────────────────────────────────────────────────────────────────
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
