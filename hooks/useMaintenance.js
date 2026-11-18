import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Manutenzioni obbligatorie (fermaposto, programmate, fatte) e segnalazioni
// smistate per urgenza. Solo amministratore: le RPC lo verificano.
export const URGENCY = {
  emergency: { label: 'Emergenza', color: '#B42318', bg: '#FEE4E2' },
  high: { label: 'Urgente', color: '#B54708', bg: '#FEF0C7' },
  normal: { label: 'Normale', color: 'var(--teal-dk)', bg: 'var(--teal-lt)' },
  low: { label: 'Bassa', color: 'var(--text-3)', bg: '#F2F4F4' },
}

const ERRORS = {
  'invalid date': 'Scegli una data valida.',
  'invalid time': "L'orario di fine deve essere dopo l'inizio.",
  'not allowed': 'Solo l\'amministratore può farlo.',
}
const msg = (error, fallback) => {
  const k = Object.keys(ERRORS).find((x) => (error?.message || '').includes(x))
  return k ? ERRORS[k] : fallback
}

export function useMaintenance(buildingId, enabled = true) {
  const [state, setState] = useState({ loading: true, error: null, items: [], tickets: [], suppliers: [] })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!buildingId || !enabled) return
    let off = false
    ;(async () => {
      const s = createClient()
      const { error: ensErr } = await s.rpc('ensure_maintenance_plan', { p_building: buildingId })
      if (ensErr) console.error('[useMaintenance] ensure failed', ensErr.message)
      const [i, t, m] = await Promise.all([
        s.rpc('maintenance_items', { p_building: buildingId }),
        s.rpc('tickets_triage', { p_building: buildingId }),
        s.from('condo_maintainers').select('id, name, company, category, phone').eq('building_id', buildingId).order('name'),
      ])
      if (off) return
      ;[i, t, m].forEach((r) => r.error && console.error('[useMaintenance] load failed', r.error.message))
      setState({
        loading: false,
        error: i.error || t.error ? 'Impossibile caricare le manutenzioni.' : null,
        items: i.data || [], tickets: t.data || [], suppliers: m.data || [],
      })
    })()
    return () => { off = true }
  }, [buildingId, enabled, tick])

  const call = useCallback(async (fn, args, fallback) => {
    const { error } = await createClient().rpc(fn, args)
    if (error) { console.error(`[useMaintenance] ${fn} failed`, error.message); return { error: msg(error, fallback) } }
    reload()
    return {}
  }, [reload])

  return {
    ...state,
    reload,
    schedule: (id, v) => call('schedule_maintenance', { p_item: id, p_date: v.date, p_time_start: v.start || null, p_time_end: v.end || null, p_maintainer: v.maintainer || null, p_notes: v.notes || null }, 'Programmazione non riuscita.'),
    complete: (id, date) => call('complete_maintenance', { p_item: id, p_done: date || null }, 'Operazione non riuscita.'),
    setLastDone: (id, date) => call('set_maintenance_last_done', { p_item: id, p_last_done: date }, 'Data non salvata.'),
    dismiss: (id, yes = true) => call('dismiss_maintenance', { p_item: id, p_dismiss: yes }, 'Operazione non riuscita.'),
    setTriage: (id, urgency, maintainer) => call('set_ticket_triage', { p_ticket: id, p_urgency: urgency, p_maintainer: maintainer || null }, 'Modifica non riuscita.'),
    closeTicket: async (id) => {
      const { data, error } = await createClient().from('condo_tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id).select('id')
      if (error || !data?.length) { console.error('[useMaintenance] close failed', error?.message); return { error: 'Chiusura non riuscita.' } }
      reload()
      return {}
    },
    triageWithCondor: async () => {
      const { data, error } = await createClient().functions.invoke('maintenance-ai', { body: { building_id: buildingId, mode: 'triage' } })
      if (error) {
        let code = null
        try { code = (await error.context?.json())?.error ?? null } catch { /* non JSON */ }
        console.error('[useMaintenance] condor failed', code || error.message)
        return { error: { pro_required: 'Condor non è attivo sul tuo account.', quota: 'Hai finito gli usi di Condor per oggi.', not_configured: 'Condor non è ancora configurato.' }[code] || 'Condor non è riuscito a smistare le segnalazioni.' }
      }
      reload()
      return { updated: data?.updated ?? 0 }
    },
  }
}
