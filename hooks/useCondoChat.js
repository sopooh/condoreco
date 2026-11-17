import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CHAT_BUCKET } from '@/lib/chatFiles'
import { useSession } from '@/components/providers/SessionProvider'

// Gruppi del condominio: carica lo storico, si sottoscrive ai nuovi
// messaggi via Realtime, espone sendMessage.
// channel 'all' = gruppo Condominio (con amministratore),
// channel 'residents' = gruppo Tra vicini (solo condomini).
// RLS: se l'utente non e' membro del building, le query tornano vuote.
export function useCondoChat(buildingId, chatChannel = 'all') {
  const [messages, setMessages] = useState([])
  const session = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadMessages = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .select('id, content, created_at, created_by, hidden, kind, attachment, ref_id, meta, edited_at, deleted_at, channel, profiles:created_by(display_name, avatar_url, role)')
      .eq('building_id', buildingId)
      .eq('channel', chatChannel)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setError(error.message)
    } else {
      setMessages(data.reverse()) // dal piu' vecchio al piu' recente
    }
    setLoading(false)
  }, [buildingId, chatChannel])

  useEffect(() => {
    if (!buildingId) return
    loadMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${buildingId}-${chatChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `building_id=eq.${buildingId}`,
        },
        async (payload) => {
          if ((payload.new.channel || 'all') !== chatChannel) return
          // Il payload Realtime non contiene la join col profilo: la recuperiamo
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, role')
            .eq('id', payload.new.created_by)
            .single()

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, { ...payload.new, profiles: profile }]
          })
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `building_id=eq.${buildingId}` }, (payload) => {
        if ((payload.new.channel || 'all') !== chatChannel) return
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new, profiles: m.profiles } : m)))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [buildingId, chatChannel, loadMessages])

  const sendMessage = useCallback(
    // extra: { kind, attachment, ref_id, meta } per allegati, contatti, eventi
    async (content, extra = {}) => {
      const trimmed = content?.trim()
      if (!trimmed) return { error: 'Messaggio vuoto' }
      if (!session?.user?.id) return { error: 'Devi essere autenticato' }

      const supabase = createClient()
      const { data, error } = await supabase.from('messages').insert({
        building_id: buildingId,
        channel: chatChannel,
        created_by: session.user.id, // la RLS verifica che coincida con auth.uid()
        content: trimmed.slice(0, 2000),
        kind: extra.kind || 'text',
        attachment: extra.attachment || null,
        ref_id: extra.ref_id || null,
        meta: extra.meta || null,
      }).select('id, content, created_at, created_by, hidden, kind, attachment, ref_id, meta, edited_at, deleted_at, channel').single()

      if (error) {
        console.error('[useCondoChat] send failed', error.message)
        return { error: 'Messaggio non inviato. Riprova.' }
      }
      // subito visibile anche se Realtime arriva in ritardo
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, { ...data, profiles: null }]))
      return { error: null }
    },
    [buildingId, chatChannel, session?.user?.id]
  )

  // Solo per admin condominiale: nasconde un messaggio (moderazione)
  const hideMessage = useCallback(async (messageId) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .update({ hidden: true })
      .eq('id', messageId)
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
    return { error: error?.message ?? null }
  }, [])

  // Modifica di un proprio messaggio di testo
  const editMessage = useCallback(async (messageId, content) => {
    const { data, error } = await createClient().rpc('edit_chat_message', { p_id: messageId, p_content: content, p_thread: false })
    if (error) return { error: 'Messaggio non modificato. Riprova.' }
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: content.trim().slice(0, 2000), edited_at: data } : m)))
    return { error: null }
  }, [])

  // Elimina per tutti un proprio messaggio (entro 2 minuti dall'invio)
  const deleteMessage = useCallback(async (messageId) => {
    const supabase = createClient()
    const { data: path, error } = await supabase.rpc('delete_chat_message', { p_id: messageId, p_thread: false })
    if (error) {
      console.error('[useCondoChat] delete failed', error.message)
      return { error: 'Puoi eliminare un messaggio solo nei primi 2 minuti.' }
    }
    if (path) supabase.storage.from(CHAT_BUCKET).remove([path]).then(({ error: e }) => e && console.error('[useCondoChat] file delete', e.message))
    setMessages((prev) => prev.map((m) => (m.id === messageId
      ? { ...m, content: 'Cancellato per tutti', kind: 'text', attachment: null, ref_id: null, meta: null, edited_at: null, deleted_at: new Date().toISOString() }
      : m)))
    return { error: null }
  }, [])

  return { messages, loading, error, sendMessage, hideMessage, editMessage, deleteMessage, reload: loadMessages }
}
