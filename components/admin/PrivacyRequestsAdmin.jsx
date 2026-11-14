'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Richieste degli interessati (artt. 15-22 GDPR): vanno evase entro 30 giorni.
// La cancellazione account si esegue da qui con admin_erase_user.
export const PRIVACY_KIND_LABELS = {
  erasure: 'Cancellazione account',
  rectification: 'Rettifica dati',
  objection: 'Opposizione al trattamento',
  restriction: 'Limitazione del trattamento',
  access: 'Accesso ai dati',
  other: 'Altra richiesta',
}

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

export default function PrivacyRequestsAdmin() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notes, setNotes] = useState({})

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick(t => t + 1), [])
  useEffect(() => {
    let cancelled = false
    createClient().rpc('admin_privacy_requests').then(({ data, error: err }) => {
      if (cancelled) return
      if (err) { console.error('[privacy admin] load failed', err.message); setError('Impossibile caricare le richieste.'); setRows([]); return }
      setRows(data || [])
    })
    return () => { cancelled = true }
  }, [tick])

  async function setStatus(r, status) {
    setBusy(r.id); setError(null)
    const { error: err } = await createClient().rpc('handle_privacy_request', {
      p_request: r.id, p_status: status, p_response: notes[r.id] || null,
    })
    setBusy(null)
    if (err) { console.error('[privacy admin] update failed', err.message); setError('Aggiornamento non riuscito.'); return }
    load()
  }

  async function erase(r) {
    if (!r.user_id) return
    if (!window.confirm(`Cancellare definitivamente l'account di ${r.display_name || r.email || 'questo utente'}? L'operazione non si può annullare.`)) return
    setBusy(r.id); setError(null)
    const { error: err } = await createClient().rpc('admin_erase_user', { p_user: r.user_id })
    setBusy(null)
    if (err) { console.error('[privacy admin] erase failed', err.message); setError(err.message); return }
    load()
  }

  const open = (rows || []).filter(r => r.status === 'open')
  const closed = (rows || []).filter(r => r.status !== 'open')

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Richieste privacy</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 16px' }}>
        Termine di legge: 30 giorni dalla richiesta (art. 12 GDPR). L&apos;utente riceve una notifica quando chiudi la richiesta.
      </p>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 14 }}>{error}</p>}
      {rows === null ? <p style={{ color: 'var(--text-4)' }}>Caricamento…</p> : (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Da gestire ({open.length})</h2>
          {open.length === 0 && <p style={{ color: 'var(--text-3)' }}>Nessuna richiesta aperta.</p>}
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {open.map(r => {
              const late = new Date(r.due_at) < new Date()
              return (
                <li key={r.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{PRIVACY_KIND_LABELS[r.kind] || r.kind}</strong>
                    <span style={{ fontSize: 13, fontWeight: 700, color: late ? '#B42318' : 'var(--text-3)' }}>
                      Scadenza {fmt(r.due_at)}{late ? ' (scaduta)' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 8px' }}>
                    {r.display_name || 'Utente'}{r.email ? ` · ${r.email}` : ''} · ricevuta il {fmt(r.created_at)}
                  </div>
                  {r.message && <p style={{ fontSize: 14, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{r.message}</p>}
                  <textarea aria-label="Risposta all'utente" value={notes[r.id] || ''} maxLength={1000}
                    onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Risposta all'utente (facoltativa, la riceve in notifica)"
                    style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {r.kind === 'erasure' && r.user_id && (
                      <button type="button" className="acc-btn" style={{ color: '#B42318' }} disabled={busy === r.id} onClick={() => erase(r)}>
                        Cancella account
                      </button>
                    )}
                    <button type="button" className="acc-btn is-primary" disabled={busy === r.id} onClick={() => setStatus(r, 'done')}>Segna come evasa</button>
                    <button type="button" className="acc-btn" disabled={busy === r.id} onClick={() => setStatus(r, 'rejected')}>Respingi</button>
                  </div>
                </li>
              )
            })}
          </ul>
          {closed.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 24 }}>Chiuse</h2>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 14 }}>
                {closed.map(r => (
                  <li key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    {PRIVACY_KIND_LABELS[r.kind] || r.kind} · {r.display_name || r.email || 'Account cancellato'} · {r.status === 'done' ? 'evasa' : 'respinta'} il {fmt(r.handled_at)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
