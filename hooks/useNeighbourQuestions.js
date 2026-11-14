'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const friendly = (error) => {
  const m = error?.message || ''
  if (!m) return 'Qualcosa non ha funzionato. Riprova.'
  if (/forbidden|42501|permission/i.test(m) && !/residenti|Non puoi|chiusa/i.test(m)) return 'Non hai accesso a questa sezione.'
  return m
}

export const QUESTION_STATUS = {
  pending: { label: 'In attesa di risposta', tone: 'warn' },
  update_requested: { label: 'Richiesta di aggiornamento', tone: 'warn' },
  answered_resident: { label: 'Risposta da un residente', tone: 'ok' },
  answered_condor: { label: 'Risposta da Condor', tone: 'condor' },
  archived: { label: 'Archiviata', tone: 'grey' },
}

export const SUGGESTED_QUESTIONS = [
  'Com\'è l\'isolamento acustico?',
  'Il condominio è tranquillo?',
  'Come vengono gestite le manutenzioni?',
  'Ci sono problemi ricorrenti?',
  'Come sono le spese condominiali?',
  'Gli spazi comuni sono ben mantenuti?',
]

// Chi cerca casa: le proprie domande su un edificio
export function useMyNeighbourQuestions(buildingId, enabled) {
  const [questions, setQuestions] = useState(null)
  const load = useCallback(async () => {
    if (!enabled) return
    const { data, error } = await createClient().rpc('nq_my_questions', { p_building: buildingId })
    if (error) console.error('[nq_my_questions]', error)
    setQuestions(data || [])
  }, [buildingId, enabled])
  useEffect(() => { load() }, [load])

  const ask = async (question) => {
    const { data, error } = await createClient().functions.invoke('neighbour-ask', { body: { building_id: buildingId, question } })
    let msg = data?.error || null
    if (error && !msg) {
      try { msg = (await error.context?.json())?.error } catch { /* risposta non json */ }
      msg = msg || 'Non sono riuscito a inviare la domanda. Riprova.'
    }
    if (!msg) await load()
    return { error: msg, data }
  }
  const call = async (fn, args) => {
    const { error } = await createClient().rpc(fn, args)
    if (!error) await load()
    return { error: error ? friendly(error) : null }
  }
  return {
    questions, reload: load, ask,
    followup: (id, text) => call('nq_followup', { p_question: id, p_text: text }),
    askResidents: (id) => call('nq_followup', { p_question: id, p_text: null }),
    close: (id) => call('nq_close', { p_question: id }),
    markRead: () => createClient().rpc('nq_mark_read', { p_building: buildingId }),
  }
}

// Residenti: la sezione "Possibili nuovi vicini"
export function useResidentNeighbourQuestions(buildingId) {
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState(null)
  const [notify, setNotify] = useState(true)
  const load = useCallback(async () => {
    const s = createClient()
    const [{ data, error: e }, { data: n }] = await Promise.all([
      s.rpc('nq_resident_questions', { p_building: buildingId }),
      s.rpc('nq_my_notify', { p_building: buildingId }),
    ])
    setError(e ? friendly(e) : null)
    setQuestions(data || [])
    if (typeof n === 'boolean') setNotify(n)
  }, [buildingId])
  useEffect(() => { load() }, [load])

  const call = async (fn, args) => {
    const { error: e } = await createClient().rpc(fn, args)
    if (!e) await load()
    return { error: e ? friendly(e) : null }
  }
  return {
    questions, error, notify, reload: load,
    answer: (id, text, { save = true, mode = 'reply', knowledgeId = null } = {}) =>
      call('nq_answer', { p_question: id, p_text: text, p_save: save, p_mode: mode, p_knowledge: knowledgeId }),
    confirm: (id, knowledgeId) => call('nq_confirm', { p_question: id, p_knowledge: knowledgeId }),
    report: (id, reason) => call('nq_report', { p_question: id, p_reason: reason || null }),
    archive: (id) => call('nq_archive', { p_question: id }),
    setNotify: async (on) => { setNotify(on); await createClient().rpc('nq_set_notify', { p_building: buildingId, p_on: on }) },
  }
}

export function useNeighbourPendingCount(buildingId, enabled = true) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled || !buildingId) return
    let off = false
    createClient().rpc('nq_pending_count', { p_building: buildingId }).then(({ data }) => { if (!off) setCount(data || 0) })
    return () => { off = true }
  }, [buildingId, enabled])
  return count
}
