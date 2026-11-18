import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Rendiconto mensile (amministratore e consiglieri), attestazioni dei pagamenti
// per il rogito e ripartizione proprietario/inquilino delle rate.

const s = () => createClient()
const logErr = (label, error) => { if (error) console.error(`[useCondoReports] ${label}`, error); return error }

async function invoke(fn, body) {
  const { data, error } = await s().functions.invoke(fn, { body })
  if (error) {
    let msg = null
    try { msg = (await error.context?.json?.())?.error } catch { /* risposta non JSON */ }
    console.error(`[useCondoReports] ${fn} failed`, error, msg)
    return { error: msg || 'Operazione non riuscita. Riprova.' }
  }
  return { data, error: null }
}

export function useMonthlyReports(buildingId, enabled) {
  const [state, setState] = useState({ loading: true, list: [], error: null })
  const load = useCallback(async () => {
    if (!buildingId || !enabled) { setState({ loading: false, list: [], error: null }); return }
    const { data, error } = await s().from('condo_monthly_reports').select('id, month, data, ai_comment, generated_at, emailed_at')
      .eq('building_id', buildingId).order('month', { ascending: false }).limit(24)
    logErr('reports', error)
    setState({ loading: false, list: data || [], error: error ? 'Non riesco a caricare i rendiconti.' : null })
  }, [buildingId, enabled])
  useEffect(() => { load() }, [load])

  async function generate(month, { send = false, regenerateComment = false } = {}) {
    const r = await invoke('monthly-reports', { building_id: buildingId, month, send, regenerate_comment: regenerateComment })
    await load()
    return r
  }
  return { ...state, reload: load, generate }
}

export function useCouncillors(buildingId, enabled) {
  const [list, setList] = useState([])
  const load = useCallback(async () => {
    if (!buildingId || !enabled) return
    const [m, n] = await Promise.all([
      s().from('condo_members').select('user_id, role, is_councillor').eq('building_id', buildingId),
      s().rpc('admin_member_balances', { p_building: buildingId }),
    ])
    logErr('councillors', m.error); logErr('names', n.error)
    const names = new Map((n.data || []).map((x) => [x.user_id, x.display_name]))
    setList((m.data || []).filter((x) => x.role !== 'admin').map((x) => ({ ...x, display_name: names.get(x.user_id) || 'Condomino' })))
  }, [buildingId, enabled])
  useEffect(() => { load() }, [load])
  async function toggle(userId, on) {
    const { error } = await s().rpc('set_councillor', { p_building: buildingId, p_user: userId, p_on: on })
    if (logErr('set councillor', error)) return { error: 'Non riesco a salvare.' }
    await load()
    return { error: null }
  }
  return { list, toggle, reload: load }
}

export function useCertificates(buildingId, userId, isAdmin) {
  const [list, setList] = useState([])
  const load = useCallback(async () => {
    if (!buildingId || (!isAdmin && !userId)) return
    let q = s().from('condo_payment_certificates').select('id, user_id, as_of, totals, created_at').eq('building_id', buildingId).order('created_at', { ascending: false }).limit(50)
    if (!isAdmin) q = q.eq('user_id', userId)
    const { data, error } = await q
    logErr('certificates', error)
    setList(data || [])
  }, [buildingId, userId, isAdmin])
  useEffect(() => { load() }, [load])

  async function create(v) {
    const r = await invoke('payment-certificate', { action: 'create', building_id: buildingId, user_id: v.user_id, as_of: v.as_of, notes: v.notes || null })
    await load()
    return r
  }
  async function download(id) {
    return invoke('payment-certificate', { action: 'download', certificate_id: id })
  }
  return { list, create, download, reload: load }
}

export async function loadTenantSplit(buildingId, userId, year) {
  const { data, error } = await s().rpc('tenant_split', { p_building: buildingId, p_user: userId, p_year: year })
  if (logErr('tenant split', error)) return { rows: [], error: 'Non riesco a calcolare la ripartizione.' }
  return { rows: data || [], error: null }
}

export async function amICouncillor(buildingId) {
  const { data, error } = await s().rpc('is_councillor', { p_building: buildingId })
  logErr('is councillor', error)
  return !!data
}
