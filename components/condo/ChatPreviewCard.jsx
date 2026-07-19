'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'

function formatTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPreviewCard({ messages, isCondoAdmin, onSend, onHide }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  async function send(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    const { error } = await onSend(text)
    setSending(false)
    if (!error) setDraft('')
  }

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>Chat del condominio</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Ancora nessun messaggio.</p>
        )}
        {messages.slice(-3).map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
            <Avatar
              userId={msg.created_by}
              avatarId={msg.profiles?.avatar_url && !msg.profiles.avatar_url.startsWith('http') && !msg.profiles.avatar_url.startsWith('data:')
                ? msg.profiles.avatar_url.replace('/avatars/', '').replace('.png', '')
                : null}
              photoUrl={msg.profiles?.avatar_url?.startsWith('http') || msg.profiles?.avatar_url?.startsWith('data:') ? msg.profiles.avatar_url : null}
              role={msg.profiles?.role}
              size={32}
              showRole={false}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{msg.profiles?.display_name ?? 'Utente'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto', flexShrink: 0 }}>{formatTime(msg.created_at)}</span>
                {isCondoAdmin && (
                  <button
                    onClick={() => onHide(msg.id)}
                    aria-label="Nascondi messaggio"
                    style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Nascondi
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', overflowWrap: 'break-word' }}>{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Scrivi un messaggio…"
          style={{
            flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: 100,
            padding: '10px 16px', fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          aria-label="Invia messaggio"
          disabled={sending}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'var(--teal)', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SendIcon />
        </button>
      </form>
    </Card>
  )
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}
