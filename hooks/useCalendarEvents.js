import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'
import { toLocalISODate, monthGridRange } from '@/lib/localDate'

// Eventi visibili nella griglia di un mese (inclusi i giorni del mese
// prima/dopo mostrati in griglia). month e' 0-11 (convenzione Date di JS).
export function useCalendarEvents(buildingId, year, month) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const session = useSession()
  const { isCondoAdmin } = useCondoRole(buildingId)

  const { start, end } = monthGridRange(year, month)
  const from = toLocalISODate(start)
  const to = toLocalISODate(end)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, location, event_date, time_start, time_end, event_type, approved, created_by, profiles:created_by(display_name)')
      .eq('building_id', buildingId)
      .gte('event_date', from)
      .lte('event_date', to)
      .order('event_date', { ascending: true })
      .order('time_start', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[useCalendarEvents] load failed', error)
      setError(error.message)
    } else {
      setError(null)
      setEvents(data)
    }
    setLoading(false)
  }, [buildingId, from, to])

  useEffect(() => {
    if (buildingId) load()
  }, [buildingId, load])

  const createEvent = useCallback(
    async (values) => {
      if (!session?.user?.id) return { error: 'Devi essere autenticato' }

      const supabase = createClient()
      const { data, error } = await supabase.from('events').insert({
        building_id: buildingId,
        created_by: session.user.id,
        title: values.title.trim(),
        description: values.description?.trim() || null,
        location: values.location?.trim() || null,
        event_date: values.eventDate,
        time_start: values.timeStart || null,
        time_end: values.timeEnd || null,
        event_type: values.eventType ?? 'general',
        ...(isCondoAdmin ? { approved: true } : {}),
      })
        .select('id, title, description, location, event_date, time_start, time_end, event_type, approved')
        .single()

      if (error) console.error('[useCalendarEvents] insert failed', error)
      else await load()
      // event: l'appuntamento appena creato, per offrire subito
      // "Aggiungi a Google Calendar" / .ics nella conferma
      return { error: error?.message ?? null, event: data ?? null }
    },
    [buildingId, session?.user?.id, isCondoAdmin, load]
  )

  const updateEvent = useCallback(
    async (eventId, values) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .update({
          title: values.title?.trim(),
          description: values.description?.trim() || null,
          location: values.location?.trim() || null,
          event_date: values.eventDate,
          time_start: values.timeStart || null,
          time_end: values.timeEnd || null,
          event_type: values.eventType,
        })
        .eq('id', eventId)

      if (!error) await load()
      return { error: error?.message ?? null }
    },
    [load]
  )

  const deleteEvent = useCallback(
    async (eventId) => {
      const supabase = createClient()
      const { error } = await supabase.from('events').delete().eq('id', eventId)
      if (!error) await load()
      return { error: error?.message ?? null }
    },
    [load]
  )

  const approveEvent = useCallback(
    async (eventId) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .update({ approved: true })
        .eq('id', eventId)
      if (!error) await load()
      return { error: error?.message ?? null }
    },
    [load]
  )

  return { events, loading, error, isCondoAdmin, createEvent, updateEvent, deleteEvent, approveEvent, reload: load }
}
