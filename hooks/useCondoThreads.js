import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Elenco conversazioni del condominio (gruppo, amministratore, private,
// interventi) con ultimo messaggio e non letti.
export function useCondoThreads(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!buildingId || !userId) return
    const { data, error } = await createClient().rpc('my_condo_threads', { p_building: buildingId })
    if (error) { console.error('[useCondoThreads]', error); setError(error.message) }
    else { setThreads(data || []); setError(null) }
    setLoading(false)
  }, [buildingId, userId])

  useEffect(() => {
    load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(load, 20000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t) }
  }, [load])

  const rpc = async (fn, args) => {
    const { data, error } = await createClient().rpc(fn, args)
    if (error) { console.error(`[${fn}]`, error); return { error: 'Non riesco ad aprire la chat. Riprova.' } }
    return { id: data, error: null }
  }

  return {
    threads, loading, error, userId, reload: load,
    openAdmin: () => rpc('open_admin_thread', { p_building: buildingId }),
    openDirect: (other) => rpc('open_direct_thread', { p_building: buildingId, p_other: other }),
    openIntervention: (interventionId) => rpc('open_intervention_thread', { p_intervention: interventionId }),
  }
}

// Rubrica dei residenti del condominio (per avviare o allargare una chat)
export async function loadDirectory(buildingId) {
  const { data } = await createClient().rpc('condo_directory', { p_building: buildingId })
  return data || []
}

// Messaggi di una conversazione, in tempo reale
export function useThreadMessages(threadId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [names, setNames] = useState({})

  const fetchProfiles = useCallback(async (ids) => {
    const missing = ids.filter(Boolean)
    if (!missing.length) return {}
    const { data } = await createClient().from('profiles').select('id, display_name, avatar_url, role').in('id', missing)
    const map = Object.fromEntries((data || []).map((p) => [p.id, p]))
    setNames((n) => ({ ...n, ...map }))
    return map
  }, [])

  const load = useCallback(async () => {
    if (!threadId || !userId) return
    const supabase = createClient()
    const [{ data: msgs }, { data: mem }] = await Promise.all([
      supabase.from('condo_thread_messages').select('id, content, created_at, created_by, kind, attachment, ref_id, meta').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(300),
      supabase.from('condo_thread_members').select('user_id, joined_at').eq('thread_id', threadId),
    ])
    setMessages(msgs || [])
    setMembers(mem || [])
    await fetchProfiles([...new Set([...(msgs || []).map((m) => m.created_by), ...(mem || []).map((m) => m.user_id)])])
    setLoading(false)
    supabase.rpc('mark_thread_read', { p_thread: threadId })
  }, [threadId, userId, fetchProfiles])

  useEffect(() => {
    if (!threadId) return
    load()
    const supabase = createClient()
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'condo_thread_messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
        fetchProfiles([payload.new.created_by])
        supabase.rpc('mark_thread_read', { p_thread: threadId })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [threadId, load, fetchProfiles])

  async function send(content, extra = {}) {
    const text = content.trim()
    if (!text) return { error: 'Messaggio vuoto' }
    const { data, error } = await createClient().from('condo_thread_messages')
      .insert({ thread_id: threadId, created_by: userId, content: text.slice(0, 2000), kind: extra.kind || 'text', attachment: extra.attachment || null, meta: extra.meta || null })
      .select('id, content, created_at, created_by, kind, attachment, ref_id, meta').single()
    if (error) return { error: 'Messaggio non inviato. Riprova.' }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    return { error: null }
  }

  async function addMembers(userIds) {
    const { error } = await createClient().rpc('add_thread_members', { p_thread: threadId, p_users: userIds })
    if (error) return { error: 'Non riesco ad aggiungere le persone.' }
    await load()
    return { error: null }
  }

  return { messages, members, names, loading, userId, send, addMembers }
}

export async function markGroupRead(buildingId, userId) {
  if (!buildingId || !userId) return
  await createClient().from('condo_group_reads').upsert({ building_id: buildingId, user_id: userId, last_read_at: new Date().toISOString() })
}
