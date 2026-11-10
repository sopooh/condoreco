'use client'

import Link from 'next/link'
import { useCondoChat } from '@/hooks/useCondoChat'
import { useCondoRole } from '@/hooks/useCondoRole'
import ChatPreviewCard from '@/components/condo/ChatPreviewCard'

// Chat del condominio a pagina intera (tutti i messaggi caricati).
export default function ChatPage({ building }) {
  const buildingId = building.id
  const { isCondoAdmin } = useCondoRole(buildingId)
  const { messages, loading, sendMessage, hideMessage } = useCondoChat(buildingId)
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={`/edificio/${buildingId}/condominio`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Chat del condominio</h1>
      {loading
        ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento chat...</p>
        : <ChatPreviewCard messages={messages} isCondoAdmin={isCondoAdmin} onSend={sendMessage} onHide={hideMessage} limit={Infinity} />}
    </div>
  )
}
