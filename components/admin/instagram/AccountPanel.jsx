'use client'

import { useState } from 'react'
import { ui } from './ui.jsx'

export default function AccountPanel({ account, onChange }) {
  const [token, setToken] = useState('')
  const [igUserId, setIgUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function connect() {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/instagram/account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token, igUserId }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ error: body.error || 'Errore' }); return }
    setToken('')
    setMsg({ ok: `Collegato @${body.username} (${body.accountType || 'professionale'})` })
    onChange?.()
  }

  return (
    <div style={ui.card}>
      <h2 style={ui.h2}>Account Instagram</h2>
      {account?.connected ? (
        <p style={ui.muted}>
          Collegato a <b>@{account.username}</b>.
          {account.expiresAt ? ` Il token si rinnova da solo, scadenza attuale ${new Date(account.expiresAt).toLocaleDateString('it-IT')}.` : ' Token utente di sistema, non scade.'}
        </p>
      ) : (
        <p style={ui.muted}>
          Incolla il token dell&apos;utente di sistema (inizia con EAA) generato con la configurazione
          Unified login dell&apos;app Meta, oppure un token Instagram (IGAA).
        </p>
      )}
      <label style={ui.label} htmlFor="ig-token">{account?.connected ? 'Sostituisci token' : 'Token di accesso'}</label>
      <input id="ig-token" style={ui.input} value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA..." autoComplete="off" />
      <label style={ui.label} htmlFor="ig-id">ID account Instagram (consigliato con token EAA)</label>
      <input id="ig-id" style={ui.input} value={igUserId} onChange={(e) => setIgUserId(e.target.value)} placeholder="1784..." inputMode="numeric" autoComplete="off" />
      <button type="button" style={{ ...ui.primaryBtn, marginTop: 10 }} disabled={busy || !token.trim()} onClick={connect}>
        {busy ? 'Verifica...' : 'Collega'}
      </button>
      {msg?.error && <div style={ui.error}>{msg.error}</div>}
      {msg?.ok && <div style={ui.ok}>{msg.ok}</div>}

      <h2 style={{ ...ui.h2, marginTop: 20 }}>Sponsorizzazioni</h2>
      {account?.ads?.ready ? (
        <p style={ui.muted}>Account pubblicitario configurato.</p>
      ) : (
        <p style={ui.muted}>
          Non ancora configurate. Mancano su Vercel: {(account?.ads?.missing || []).join(', ') || '...'}
        </p>
      )}
    </div>
  )
}
