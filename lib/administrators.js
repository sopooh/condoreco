import { createClient } from '@/lib/supabase/client'

// Cerca un amministratore per nome esatto (case-insensitive); se non esiste
// lo crea. Usato dal flusso "aggiungi condominio" quando l'utente digita un
// amministratore non ancora presente su CondoReco.
export async function findOrCreateAdministrator(name, city) {
  const supabase = createClient()
  const trimmed = name.trim()
  if (!trimmed) return { data: null, error: new Error('Nome amministratore mancante') }
  const { data: existing } = await supabase.from('administrators').select('id, name, city').ilike('name', trimmed).limit(1).maybeSingle()
  if (existing) return { data: existing, error: null }
  return supabase.from('administrators').insert({ name: trimmed, city: city || null }).select('id, name, city').single()
}
