import { createClient } from '@supabase/supabase-js'

// Client solo per inviare i link via email (accesso, conferma registrazione).
// Usa il flusso "implicit": il link funziona anche se aperto in un altro
// browser o dall'app della posta, perché non serve il codice segreto (PKCE)
// salvato nel browser che ha fatto la richiesta. La sessione arriva
// nell'hash dell'URL e la imposta /auth/confirm sul client normale.
let client: ReturnType<typeof createClient> | null = null
export function emailLinkClient() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'condoreco-email-link' },
    })
  }
  return client
}
