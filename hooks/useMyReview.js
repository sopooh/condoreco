import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Recensione dell'utente corrente per una entita (edificio o amministratore),
// qualunque sia lo stato di pubblicazione (RLS consente "read own unpublished").
// Fetchata client-side: mai parte di una pagina statica condivisa (vedi lib/supabase/static.ts).
export function useMyReview(table, column, id) {
  const session = useSession()
  const [review, setReview] = useState(null)

  const refetch = useCallback(async () => {
    if (!session?.user?.id || !id) {
      console.log('[useMyReview] skip fetch: no session or id', { hasSession: !!session?.user?.id, table, column, id })
      setReview(null)
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from(table)
      .select('*, profiles(display_name, avatar_url, role)')
      .eq(column, id)
      .eq('user_id', session.user.id)
      .maybeSingle()
    console.log('[useMyReview] query result', { table, column, id, userId: session.user.id, data, error })
    setReview(data || null)
  }, [session?.user?.id, table, column, id])

  useEffect(() => { refetch() }, [refetch])

  return [review, refetch]
}
