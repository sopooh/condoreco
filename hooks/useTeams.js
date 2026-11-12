'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Livelli del team, dal più basso al più alto.
export const TEAM_ROLES = [
  { id: 'viewer',   label: 'Visualizzatore', hint: 'Vede attività e persone, non modifica nulla' },
  { id: 'editor',   label: 'Editor',         hint: 'Crea e assegna attività, le porta fino a "Da approvare"' },
  { id: 'approver', label: 'Approvatore',    hint: 'In più approva le attività e le chiude o le riapre' },
  { id: 'admin',    label: 'Amministratore', hint: 'In più gestisce persone, livelli e inviti' },
]
export const ROLE_LABEL = Object.fromEntries(TEAM_ROLES.map((r) => [r.id, r.label]))
const RANK = { viewer: 1, editor: 2, approver: 3, admin: 4 }
export const canRole = (role, min) => (RANK[role] || 0) >= RANK[min]

export const TASK_STATUS = [
  { id: 'todo',   label: 'Da fare' },
  { id: 'doing',  label: 'In corso' },
  { id: 'review', label: 'Da approvare' },
  { id: 'done',   label: 'Fatta' },
]
export const STATUS_LABEL = Object.fromEntries(TASK_STATUS.map((s) => [s.id, s.label]))

export function friendlyTeamError(error) {
  const m = error?.message || ''
  if (!m) return 'Qualcosa non ha funzionato. Riprova.'
  if (/forbidden|42501|permission/i.test(m) && !/Serve|livello|Solo|titolare/i.test(m)) return 'Non hai il livello per farlo.'
  if (/check constraint/i.test(m)) return 'Controlla i campi: alcuni sono troppo corti o troppo lunghi.'
  return m
}

// I team di cui faccio parte (miei o in cui sono stato invitato)
export function useMyTeams(enabled = true) {
  const [teams, setTeams] = useState(null)
  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc('my_teams')
    if (error) console.error('[my_teams]', error)
    setTeams(data || [])
  }, [])
  useEffect(() => { if (enabled) load() }, [enabled, load])
  const ensure = async (kind) => {
    const { data, error } = await createClient().rpc('ensure_my_team', { p_kind: kind })
    if (!error) await load()
    return { id: data, error: error ? friendlyTeamError(error) : null }
  }
  return { teams, reload: load, ensure }
}

// Persone e attività di un team
export function useTeamData(teamId) {
  const [members, setMembers] = useState(null)
  const [tasks, setTasks] = useState(null)
  const load = useCallback(async () => {
    if (!teamId) return
    const s = createClient()
    const [m, t] = await Promise.all([
      s.from('team_members').select('id, user_id, name, job, phone, role, created_at').eq('team_id', teamId).order('created_at'),
      s.from('team_tasks').select('*, buildings(address, street_number, city)').eq('team_id', teamId).order('created_at', { ascending: false }),
    ])
    if (m.error) console.error('[team_members]', m.error)
    if (t.error) console.error('[team_tasks]', t.error)
    setMembers(m.data || [])
    setTasks(t.data || [])
  }, [teamId])
  useEffect(() => { load() }, [load])

  const call = async (fn, args) => {
    const { data, error } = await createClient().rpc(fn, args)
    if (!error) await load()
    return { data, error: error ? friendlyTeamError(error) : null }
  }
  return {
    members, tasks, reload: load,
    saveMember: (v) => call('team_save_member', { p_team: teamId, p_id: v.id || null, p_name: v.name, p_job: v.job || null, p_phone: v.phone || null, p_role: v.role }),
    removeMember: (id) => call('team_remove_member', { p_id: id }),
    createInvite: (role, memberId) => call('team_create_invite', { p_team: teamId, p_role: role, p_member: memberId || null }),
    saveTask: (v) => call('team_save_task', {
      p_team: teamId, p_id: v.id || null, p_title: v.title, p_description: v.description || null,
      p_assignee: v.assignee_id || null, p_due: v.due_date || null, p_priority: v.priority || 'normal', p_building: v.building_id || null,
    }),
    setStatus: (id, status, note) => call('team_set_task_status', { p_id: id, p_status: status, p_note: note ?? null }),
    deleteTask: (id) => call('team_delete_task', { p_id: id }),
  }
}
