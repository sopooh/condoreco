'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { createClient } from '@/lib/supabase/client'

// Segnalibri delle liste (saved_admins, saved_suppliers): solo le righe proprie (RLS).
// Senza accesso il segnalibro apre il login e poi riporta alla pagina.
export function useSaved(table, column, nextPath) {
  const session = useSession()
  const userId = session?.user?.id
  const [saved, setSaved] = useState(() => new Set())

  useEffect(() => {
    if (!userId) return
    let off = false
    createClient().from(table).select(column).then(({ data }) => {
      if (!off) setSaved(new Set((data || []).map((r) => r[column])))
    })
    return () => { off = true }
  }, [userId, table, column])

  const toggle = useCallback(async (id) => {
    if (!userId) {
      window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: nextPath } }))
      return
    }
    const on = saved.has(id)
    const flip = (add) => setSaved((prev) => { const n = new Set(prev); if (add) n.add(id); else n.delete(id); return n })
    flip(!on)
    const q = createClient().from(table)
    const { error } = on ? await q.delete().eq(column, id) : await q.insert({ [column]: id })
    if (error) flip(on)
  }, [saved, userId, table, column, nextPath])

  return { saved: userId ? saved : new Set(), toggle }
}
