import { createClient } from '@/lib/supabase/client'

// "Elimina per me": messaggi nascosti solo all'utente (tabella chat_message_hides),
// in tutte le chat. Cache a livello di modulo: una sola lettura per sessione.
let cache = null

export async function loadHiddenMessageIds() {
  if (cache) return cache
  const { data, error } = await createClient().from('chat_message_hides')
    .select('message_id').order('created_at', { ascending: false }).limit(5000)
  if (error) { console.error('[chatHides] load failed', error.message); return new Set() }
  cache = new Set((data || []).map((r) => r.message_id))
  return cache
}

export async function hideMessageForMe(messageId) {
  const { error } = await createClient().from('chat_message_hides').insert({ message_id: messageId })
  if (error && error.code !== '23505') {
    console.error('[chatHides] hide failed', error.message)
    return { error: 'Non riesco a eliminare il messaggio. Riprova.' }
  }
  cache = new Set(cache || []).add(messageId)
  return { error: null }
}
