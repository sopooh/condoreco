import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// "I tuoi interventi": interventi privati dell'utente (RLS: solo l'autore)
// e rubrica manutentori del condominio (condivisa tra i membri).
export const INTERVENTION_STATUS = {
  requested: { label: 'Aperto', bg: 'var(--teal-lt)', tx: 'var(--teal-dk)' },
  scheduled: { label: 'In programmazione', bg: '#FDF0D5', tx: '#9A5B00' },
  done:      { label: 'Completato', bg: '#E3F5E9', tx: '#15803D', check: true },
  cancelled: { label: 'Annullato', bg: '#F1F3F4', tx: '#6B7280' },
}
export const isActiveIntervention = (i) => i.status === 'requested' || i.status === 'scheduled'

export function useInterventions(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [interventions, setInterventions] = useState([])
  const [maintainers, setMaintainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const [ints, mans] = await Promise.all([
      supabase.from('condo_interventions')
        .select('id, building_id, ref_number, title, category, description, location, status, scheduled_date, time_start, time_end, maintainer_id, created_at, proposed_date, proposed_time_start, proposed_time_end, completion_notes, completed_at')
        .eq('building_id', buildingId).eq('created_by', userId)
        .order('created_at', { ascending: false }),
      supabase.from('condo_maintainers')
        .select('id, name, company, category, phone, email, notes, created_by, supplier_user_id')
        .eq('building_id', buildingId)
        .order('name', { ascending: true }),
    ])
    if (ints.error) console.error('[useInterventions] interventions failed', ints.error)
    if (mans.error) console.error('[useInterventions] maintainers failed', mans.error)
    setError(ints.error?.message || mans.error?.message || null)
    setInterventions(ints.data || [])
    setMaintainers(mans.data || [])
    setLoading(false)
  }, [buildingId, userId])

  useEffect(() => { if (buildingId) load() }, [buildingId, load])

  const createIntervention = useCallback(async (values) => {
    if (!userId) return { error: 'Devi essere autenticato' }
    const supabase = createClient()
    const { data, error } = await supabase.from('condo_interventions').insert({
      building_id: buildingId,
      created_by: userId,
      title: values.title.trim(),
      category: values.category,
      description: values.description?.trim() || null,
      location: values.location?.trim() || null,
      maintainer_id: values.maintainerId || null,
      urgent: !!values.urgent,
    }).select('id').single()
    if (error) { console.error('[useInterventions] insert failed', error); return { error: error.message } }
    await load()
    return { error: null, id: data.id }
  }, [buildingId, userId, load])

  // .select(): un blocco RLS restituisce 0 righe senza errore
  const updateIntervention = useCallback(async (id, patch) => {
    const supabase = createClient()
    const { data, error } = await supabase.from('condo_interventions').update(patch).eq('id', id).select('id')
    if (error) { console.error('[useInterventions] update failed', error); return { error: error.message } }
    if (!data?.length) return { error: 'Non puoi modificare questo intervento' }
    await load()
    return { error: null }
  }, [load])

  const deleteIntervention = useCallback(async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('condo_interventions').delete().eq('id', id)
    if (error) { console.error('[useInterventions] delete failed', error); return { error: error.message } }
    await load()
    return { error: null }
  }, [load])

  const addMaintainer = useCallback(async (values) => {
    if (!userId) return { error: 'Devi essere autenticato' }
    const supabase = createClient()
    const { data, error } = await supabase.from('condo_maintainers').insert({
      building_id: buildingId,
      created_by: userId,
      name: values.name.trim(),
      company: values.company?.trim() || null,
      category: values.category,
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      notes: values.notes?.trim() || null,
    }).select('id').single()
    if (error) { console.error('[useInterventions] maintainer insert failed', error); return { error: error.message } }
    await load()
    return { error: null, id: data.id }
  }, [buildingId, userId, load])

  return { userId, interventions, maintainers, loading, error, createIntervention, updateIntervention, deleteIntervention, addMaintainer, reload: load }
}
