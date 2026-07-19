'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'

// Prima implementazione: l'invio aggiunge il messaggio solo allo stato
// locale (mock), nessuna chiamata al backend.
export default function ChatPreviewCard({ messages }) {
  const [items, setItems] = useState(messages)
  const [draft, setDraft] = useState('')

  function send(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setItems(list => [...list, {
      id: `local-${Date.now()}`, sender: 'Tu', role: 'resident', verified: false,
      text, timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      read: true,
    }])
    setDraft('')
  }

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Chat del condominio</div>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 700, color: 'var(--teal-dk)' }}>
          Apri chat <ChevronRightIcon />
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {items.slice(-3).map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
            <Avatar userId={msg.sender} role={msg.role === 'admin' ? 'condoranked' : 'condoranker'} size={32} showRole={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{msg.sender}</span>
                {msg.verified && <VerifiedIcon />}
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto', flexShrink: 0 }}>{msg.timestamp}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', overflowWrap: 'break-word' }}>{msg.text}</div>
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

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function VerifiedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}
