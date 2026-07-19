import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'

// Bacheca eventi: la RLS fa gia' il filtro giusto lato server.
// Un residente vede gli eventi approvati + i propri in attesa.
// L'admin condominiale vede tutto e puo' approvare.
// Il ruolo arriva da useCondoRole (query unica, con cache condivisa).
export function useEvents(buildingId) {
  const [events, setEvents] = useState([])
  const session = useSession()
  const { isCondoAdmin } = useCondoRole(buildingId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadEvents = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, time_start, time_end, event_type, approved, created_by, profiles:created_by(display_name)')
      .eq('building_id', buildingId)
      .gte('event_date', new Date().toISOString().slice(0, 10))
      .order('event_date', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setEvents(data)
    }
    setLoading(false)
  }, [buildingId])

  useEffect(() => {
    if (buildingId) loadEvents()
  }, [buildingId, loadEvents])

  // Creazione: i residenti creano proposte (approved = false via default DB).
  // L'admin puo' passare approved: true e l'evento e' subito in bacheca.
  const createEvent = useCallback(
    async ({ title, eventDate, timeStart, timeEnd, eventType = 'general' }) => {
      if (!session?.user?.id) return { error: 'Devi essere autenticato' }

      const supabase = createClient()
      const { error } = await supabase.from('events').insert({
        building_id: buildingId,
        created_by: session.user.id,
        title: title.trim(),
        event_date: eventDate,          // 'YYYY-MM-DD'
        time_start: timeStart || null,  // 'HH:MM'
        time_end: timeEnd || null,
        event_type: eventType,          // water | maintenance | meeting | general
        ...(isCondoAdmin ? { approved: true } : {}),
      })

      if (!error) await loadEvents()
      return { error: error?.message ?? null }
    },
    [buildingId, session?.user?.id, isCondoAdmin, loadEvents]
  )

  const approveEvent = useCallback(
    async (eventId) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .update({ approved: true })
        .eq('id', eventId)
      if (!error) await loadEvents()
      return { error: error?.message ?? null }
    },
    [loadEvents]
  )

  const deleteEvent = useCallback(
    async (eventId) => {
      const supabase = createClient()
      const { error } = await supabase.from('events').delete().eq('id', eventId)
      if (!error) await loadEvents()
      return { error: error?.message ?? null }
    },
    [loadEvents]
  )

  return { events, isCondoAdmin, loading, error, createEvent, approveEvent, deleteEvent, reload: loadEvents }
}
