import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Notifiche personali (avvisi dai vicini). Si aggiornano all'apertura,
// quando la scheda torna in primo piano e ogni minuto.
export function useNotifications({ limit = 30 } = {}) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return }
    const { data, error } = await createClient()
      .from('notifications')
      .select('id, building_id, kind, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (!error) setItems(data || [])
    setLoading(false)
  }, [userId, limit])

  useEffect(() => {
    load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(load, 60000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t) }
  }, [load])

  async function markRead(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
    if (!list.length) return
    const now = new Date().toISOString()
    setItems((xs) => xs.map((n) => (list.includes(n.id) && !n.read_at ? { ...n, read_at: now } : n)))
    await createClient().from('notifications').update({ read_at: now }).in('id', list).is('read_at', null)
  }

  const unread = items.filter((n) => !n.read_at).length
  return { items, unread, loading, reload: load, markRead, markAllRead: () => markRead(items.filter((n) => !n.read_at).map((n) => n.id)) }
}
