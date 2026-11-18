import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'

// Assemblee del condominio. RLS: l'amministratore vede e gestisce tutto;
// i condomini vedono le assemblee convocate, rispondono al consenso per la
// videoconferenza, presentano deleghe e leggono verbale e riassunto.

const s = () => createClient()

function logErr(label, error) {
  if (error) console.error(`[useAssemblies] ${label}`, error)
  return error
}

export function useAssemblyList(buildingId) {
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(buildingId)
  const [state, setState] = useState({ loading: true, error: null, list: [] })
  const load = useCallback(async () => {
    if (!buildingId || roleLoading) return
    const { data, error } = await s().from('condo_assemblies')
      .select('id, title, kind, mode, status, first_call_at, second_call_at, opened_at, closed_at')
      .eq('building_id', buildingId).order('first_call_at', { ascending: false, nullsFirst: true })
    logErr('list', error)
    setState({ loading: false, error: error ? 'Non riesco a caricare le assemblee.' : null, list: data || [] })
  }, [buildingId, roleLoading])
  useEffect(() => { load() }, [load])

  async function create(v) {
    const { data, error } = await s().from('condo_assemblies').insert({
      building_id: buildingId, title: v.title.trim(), kind: v.kind, mode: v.mode,
      location: v.location?.trim() || null, video_link: v.video_link?.trim() || null,
      first_call_at: v.first_call_at || null, second_call_at: v.second_call_at || null,
    }).select('id').single()
    if (logErr('create', error)) return { error: 'Non riesco a creare l\'assemblea.' }
    await load()
    return { error: null, id: data.id }
  }
  return { ...state, isCondoAdmin, roleLoading, reload: load, create }
}

export function useAssembly(buildingId, assemblyId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(buildingId)
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async () => {
    if (!assemblyId || roleLoading) return
    const c = s()
    const base = await Promise.all([
      c.from('condo_assemblies').select('*').eq('id', assemblyId).maybeSingle(),
      c.from('condo_assembly_items').select('*').eq('assembly_id', assemblyId).order('position'),
      c.from('condo_assembly_video_consents').select('unit_id, consent, answered_at').eq('assembly_id', assemblyId),
      c.from('condo_assembly_proxies').select('*').eq('assembly_id', assemblyId).order('created_at'),
      c.from('condo_assembly_minutes').select('*').eq('assembly_id', assemblyId).maybeSingle(),
      c.from('condo_assembly_recipients').select('*').eq('assembly_id', assemblyId).order('full_name'),
      c.from('condo_units').select('id, code, floor').eq('building_id', buildingId).order('code'),
      c.from('condo_unit_people').select('id, unit_id, user_id, full_name, role, pec, postal_address, postal_cap, postal_city, postal_province, until').eq('building_id', buildingId),
      c.from('condo_millesimi_tables').select('id, code, name, kind, total').eq('building_id', buildingId).order('code'),
    ])
    const [a, items, consents, proxies, minutes, recipients, units, people, tables] = base
    const err = base.find((r) => r.error)?.error
    logErr('load', err)
    let extra = { attendance: [], votes: [], recordings: [], tally: null, consentStatus: null, proxyWarnings: [], unitMill: [] }
    const status = a.data?.status
    if (a.data && (isCondoAdmin || ['closed', 'minutes_final'].includes(status))) {
      const r = await Promise.all([
        c.from('condo_assembly_attendance').select('*').eq('assembly_id', assemblyId),
        c.from('condo_assembly_votes').select('item_id, unit_id, vote').eq('assembly_id', assemblyId),
        isCondoAdmin ? c.from('condo_assembly_recordings').select('id, segment, status, error, size_bytes, created_at').eq('assembly_id', assemblyId).order('segment') : Promise.resolve({ data: [] }),
        c.rpc('assembly_tally', { p_assembly: assemblyId }),
        isCondoAdmin ? c.rpc('assembly_video_consent_status', { p_assembly: assemblyId }) : Promise.resolve({ data: null }),
        isCondoAdmin ? c.rpc('assembly_proxy_warnings', { p_assembly: assemblyId }) : Promise.resolve({ data: [] }),
        c.from('condo_unit_millesimi').select('table_id, unit_id, value').eq('building_id', buildingId),
      ])
      r.forEach((x, i) => logErr(`extra ${i}`, x.error))
      extra = { attendance: r[0].data || [], votes: r[1].data || [], recordings: r[2].data || [], tally: r[3].data || null, consentStatus: r[4].data || null, proxyWarnings: r[5].data || [], unitMill: r[6].data || [] }
    }
    setState({
      loading: false, error: err ? 'Non riesco a caricare l\'assemblea.' : null,
      assembly: a.data, items: items.data || [], consents: consents.data || [], proxies: proxies.data || [],
      minutes: minutes.data, recipients: recipients.data || [], units: units.data || [], people: people.data || [],
      tables: tables.data || [], ...extra,
    })
    if (a.data && !isCondoAdmin && a.data.status !== 'draft') c.rpc('assembly_mark_read', { p_assembly: assemblyId }).then(({ error }) => logErr('mark read', error))
  }, [assemblyId, buildingId, isCondoAdmin, roleLoading])
  useEffect(() => { load() }, [load])

  const run = async (label, q, msg = 'Salvataggio non riuscito. Riprova.') => {
    const { error } = await q
    if (logErr(label, error)) return { error: msg }
    await load()
    return { error: null }
  }

  const api = {
    update: (patch) => run('update', s().from('condo_assemblies').update(patch).eq('id', assemblyId)),
    remove: () => run('delete', s().from('condo_assemblies').delete().eq('id', assemblyId)),
    saveItem: (it) => {
      const row = { assembly_id: assemblyId, building_id: buildingId, title: it.title.trim(), description: it.description?.trim() || null, majority_rule: it.majority_rule, millesimi_table_id: it.millesimi_table_id || null, position: it.position, source: it.source || {}, ai_generated: !!it.ai_generated }
      return it.id ? run('update item', s().from('condo_assembly_items').update(row).eq('id', it.id)) : run('insert item', s().from('condo_assembly_items').insert(row))
    },
    addItems: (list) => run('insert items', s().from('condo_assembly_items').insert(list.map((it) => ({ assembly_id: assemblyId, building_id: buildingId, ...it })))),
    deleteItem: (id) => run('delete item', s().from('condo_assembly_items').delete().eq('id', id)),
    setItemNote: (id, outcome_note) => run('item note', s().from('condo_assembly_items').update({ outcome_note }).eq('id', id)),
    answerConsent: (unitId, consent) => run('consent', s().from('condo_assembly_video_consents').upsert({ assembly_id: assemblyId, building_id: buildingId, unit_id: unitId, consent, answered_at: new Date().toISOString() })),
    submitProxy: (p) => run('proxy', s().from('condo_assembly_proxies').insert({ assembly_id: assemblyId, building_id: buildingId, unit_id: p.unit_id, grantor_name: p.grantor_name.trim(), delegate_name: p.delegate_name.trim(), delegate_user_id: p.delegate_user_id || null, document_id: p.document_id || null, note: p.note?.trim() || null })),
    withdrawProxy: (id) => run('withdraw proxy', s().from('condo_assembly_proxies').delete().eq('id', id)),
    setProxyStatus: (id, status) => run('proxy status', s().from('condo_assembly_proxies').update({ status }).eq('id', id)),
    setAttendance: (unitId, v) => v
      ? run('attendance', s().from('condo_assembly_attendance').upsert({ assembly_id: assemblyId, building_id: buildingId, unit_id: unitId, attendee_name: v.attendee_name, via: v.via, proxy_id: v.proxy_id || null, present: true, left_at: null }))
      : run('leave', s().from('condo_assembly_attendance').update({ present: false, left_at: new Date().toISOString() }).eq('assembly_id', assemblyId).eq('unit_id', unitId)),
    vote: (itemId, unitId, vote) => vote
      ? run('vote', s().from('condo_assembly_votes').upsert({ item_id: itemId, unit_id: unitId, assembly_id: assemblyId, building_id: buildingId, vote }))
      : run('unvote', s().from('condo_assembly_votes').delete().eq('item_id', itemId).eq('unit_id', unitId)),
    voteAll: (itemId, unitIds, vote) => run('vote all', s().from('condo_assembly_votes').upsert(unitIds.map((u) => ({ item_id: itemId, unit_id: u, assembly_id: assemblyId, building_id: buildingId, vote })))),
    setRecipient: (id, patch) => run('recipient', s().from('condo_assembly_recipients').update(patch).eq('id', id)),
    prepareRecipients: (purpose) => run('prepare', s().rpc('assembly_prepare_recipients', { p_assembly: assemblyId, p_purpose: purpose })),
    saveMinutes: (draft, finalize) => run('minutes', s().from('condo_assembly_minutes').upsert({ assembly_id: assemblyId, building_id: buildingId, draft, ...(finalize ? { finalized_at: new Date().toISOString() } : {}) })),
    unfinalize: () => run('unfinalize', s().from('condo_assembly_minutes').update({ finalized_at: null }).eq('assembly_id', assemblyId)),
  }

  async function invoke(fn, body) {
    const { data, error } = await s().functions.invoke(fn, { body: { assembly_id: assemblyId, ...body } })
    if (error) {
      let msg = null
      try { msg = (await error.context?.json?.())?.error } catch { /* risposta non JSON */ }
      console.error(`[useAssemblies] ${fn} failed`, error, msg)
      return { error: humanError(msg) }
    }
    await load()
    return { data, error: null }
  }

  async function uploadSegment(segment, blob) {
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
    const path = `${buildingId}/${assemblyId}/seg-${String(segment).padStart(3, '0')}-${Date.now()}.${ext}`
    const c = s()
    const { error: upErr } = await c.storage.from('assembly-audio').upload(path, blob, { contentType: blob.type || 'audio/webm' })
    if (logErr('upload audio', upErr)) return { error: 'Caricamento dell\'audio non riuscito.' }
    const { error } = await c.from('condo_assembly_recordings').upsert({ assembly_id: assemblyId, building_id: buildingId, segment, file_path: path, mime_type: blob.type || 'audio/webm', size_bytes: blob.size, status: 'uploaded', attempts: 0, transcript: null, error: null }, { onConflict: 'assembly_id,segment' })
    if (logErr('recording row', error)) return { error: 'Caricamento dell\'audio non riuscito.' }
    c.functions.invoke('assembly-worker', { body: { assembly_id: assemblyId } }).then(({ error: e }) => logErr('worker', e))
    return { error: null }
  }

  return { ...state, userId, isCondoAdmin, roleLoading, reload: load, ...api, invoke, uploadSegment }
}

function humanError(code) {
  if (!code) return 'Operazione non riuscita. Riprova.'
  if (code === 'pro_required') return 'Condor AI non è attivo per il tuo account.'
  if (code === 'quota') return 'Hai usato tutte le richieste a Condor di oggi.'
  if (code === 'not_configured') return 'Condor AI non è ancora configurato.'
  if (code === 'ai_error') return 'Condor non ha risposto. Riprova tra poco.'
  return code
}

export async function loadSendingSettings() {
  const { data, error } = await s().from('admin_sending_settings').select('*').maybeSingle()
  logErr('sending settings', error)
  return data
}

export async function saveSendingSettings(v) {
  const { error } = await s().rpc('save_sending_settings', {
    p_sender_name: v.sender_name || '', p_sender_address: v.sender_address || '', p_sender_cap: v.sender_cap || '',
    p_sender_city: v.sender_city || '', p_sender_province: v.sender_province || '', p_sender_email: v.sender_email || '',
    p_pec_address: v.pec_address || '', p_pec_username: v.pec_username || '', p_pec_password: v.pec_password || '',
  })
  if (logErr('save sending', error)) return { error: 'Salvataggio non riuscito. Controlla CAP (5 cifre) e provincia (2 lettere).' }
  return { error: null }
}

export const MAJORITY_RULES = [
  { value: 'ordinary', label: 'Ordinaria', hint: 'Maggioranza degli intervenuti con almeno 500 millesimi in prima convocazione, 334 in seconda (art. 1136 c. 2 e 3)' },
  { value: 'art1136_c4', label: 'Rafforzata (500 millesimi)', hint: 'Nomina o revoca dell\'amministratore, liti, riparazioni straordinarie di notevole entità (art. 1136 c. 4)' },
  { value: 'innov_1120_c2', label: 'Innovazioni agevolate', hint: 'Sicurezza, barriere architettoniche, risparmio energetico, parcheggi: maggioranza degli intervenuti e 500 millesimi (art. 1120 c. 2)' },
  { value: 'innov_1120_c1', label: 'Innovazioni', hint: 'Maggioranza dei condomini e 2/3 del valore (art. 1120 c. 1, art. 1136 c. 5)' },
  { value: 'unanimity', label: 'Unanimità', hint: 'Tutti i condomini e 1000 millesimi' },
  { value: 'info', label: 'Solo informativo', hint: 'Comunicazione senza votazione' },
]
export const majorityLabel = (v) => MAJORITY_RULES.find((m) => m.value === v)?.label || v

export const STATUS_LABEL = {
  draft: 'Bozza', consent: 'Raccolta consensi', convened: 'Convocata', in_session: 'In corso',
  closed: 'Chiusa, verbale da fare', minutes_final: 'Verbale pubblicato', cancelled: 'Annullata',
}
export const MODE_LABEL = { in_person: 'In presenza', video: 'In videoconferenza', mixed: 'In presenza e in video' }
