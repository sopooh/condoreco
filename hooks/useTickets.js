import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Ticket della bacheca urgente (public.building_reports): quelli aperti nel
// mese corrente piu' quelli ancora aperti dai mesi precedenti.
// Aperto = status open/under_review, chiuso = resolved.
export const isTicketOpen = (t) => t.status !== 'resolved'

export function useTickets(buildingId) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const session = useSession()
  const userId = session?.user?.id ?? null

  const load = useCallback(async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('building_reports')
      .select('id, title, category, description, status, created_at, resolved_at, user_id')
      .eq('building_id', buildingId)
      .or(`created_at.gte.${monthStart},status.neq.resolved`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useTickets] load failed', error)
      setError(error.message)
    } else {
      setError(null)
      setTickets(data)
    }
    setLoading(false)
  }, [buildingId])

  useEffect(() => {
    if (buildingId) load()
  }, [buildingId, load])

  const openTicket = useCallback(async ({ title, category, description }) => {
    if (!userId) return { error: 'Devi essere autenticato' }
    const supabase = createClient()
    const { error } = await supabase.from('building_reports').insert({
      building_id: buildingId,
      user_id: userId,
      title: title.trim(),
      category,
      description: description?.trim() || null,
    })
    if (error) console.error('[useTickets] insert failed', error)
    else await load()
    return { error: error?.message ?? null }
  }, [buildingId, userId, load])

  // .select() dopo l'update: se la RLS blocca, Supabase non da' errore ma
  // restituisce 0 righe, e va segnalato invece di fallire in silenzio.
  const setTicketOpen = useCallback(async (ticketId, open) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('building_reports')
      .update(open
        ? { status: 'open', resolved_at: null, resolved_by: null }
        : { status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq('id', ticketId)
      .select('id')
    if (error) {
      console.error('[useTickets] update failed', error)
      return { error: error.message }
    }
    if (!data?.length) return { error: 'Non hai i permessi per modificare questo ticket' }
    await load()
    return { error: null }
  }, [userId, load])

  return { tickets, loading, error, userId, openTicket, setTicketOpen, reload: load }
}
