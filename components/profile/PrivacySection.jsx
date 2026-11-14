'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// "Privacy e dati" nel profilo: export immediato (artt. 15 e 20 GDPR) e
// richieste agli interessati gestite dallo staff entro 30 giorni
// (cancellazione, rettifica, opposizione, limitazione).
const KINDS = [
  { id: 'erasure', label: 'Cancellazione dell\'account', hint: 'Cancelliamo account e dati personali entro 30 giorni. Restano solo i dati che la legge ci obbliga a tenere.' },
  { id: 'rectification', label: 'Rettifica di dati', hint: 'Indica quali dati sono sbagliati. Nome, zona e foto puoi cambiarli da solo da Modifica profilo.' },
  { id: 'objection', label: 'Opposizione al trattamento', hint: 'Per i trattamenti basati sul nostro legittimo interesse.' },
  { id: 'restriction', label: 'Limitazione del trattamento', hint: 'Sospendiamo il trattamento mentre verifichiamo la tua richiesta.' },
  { id: 'other', label: 'Altra richiesta', hint: '' },
]
const LABEL = Object.fromEntries(KINDS.map(k => [k.id, k.label]))

export default function PrivacySection() {
  const [requests, setRequests] = useState([])
  const [kind, setKind] = useState('erasure')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick(t => t + 1), [])
  useEffect(() => {
    let cancelled = false
    createClient().from('privacy_requests')
      .select('id, kind, status, created_at, due_at, response').order('created_at', { ascending: false }).limit(10)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('[privacy] load failed', error.message); return }
        setRequests(data || [])
      })
    return () => { cancelled = true }
  }, [tick])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('sezione') === 'privacy') {
      document.getElementById('privacy-e-dati')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  async function exportData() {
    setBusy(true); setErr(null); setMsg(null)
    const { data, error } = await createClient().rpc('export_my_data')
    setBusy(false)
    if (error) { console.error('[privacy] export failed', error.message); setErr('Export non riuscito. Riprova.'); return }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `condoreco-i-miei-dati-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setMsg('File scaricato.')
  }

  async function submit(e) {
    e.preventDefault()
    if (kind === 'erasure' && !window.confirm('Vuoi davvero chiedere la cancellazione del tuo account? Perderai recensioni, accesso ai condomini e chat.')) return
    setBusy(true); setErr(null); setMsg(null)
    const { error } = await createClient().rpc('submit_privacy_request', { p_kind: kind, p_message: message || null })
    setBusy(false)
    if (error) {
      console.error('[privacy] submit failed', error.message)
      setErr(error.code === '23505' ? 'Hai già una richiesta di questo tipo aperta.' : 'Invio non riuscito. Riprova o scrivi a hello@condoreco.com.')
      return
    }
    setMessage('')
    setMsg('Richiesta inviata. Ti rispondiamo entro 30 giorni con una notifica.')
    load()
  }

  const hint = KINDS.find(k => k.id === kind)?.hint

  return (
    <section id="privacy-e-dati">
      <h2 className="profile-section-title">
        <span className="profile-section-icon"><ShieldCheck size={16} strokeWidth={2} aria-hidden="true" /></span>
        Privacy e dati
      </h2>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <button type="button" className="acc-btn" onClick={exportData} disabled={busy} style={{ width: '100%' }}>
            <Download size={16} aria-hidden="true" />Scarica i miei dati
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0' }}>Un file JSON con tutti i dati collegati al tuo account.</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="privacy-kind" style={{ fontSize: 14, fontWeight: 700 }}>Fai una richiesta</label>
          <select id="privacy-kind" value={kind} onChange={e => setKind(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}>
            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          {hint && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{hint}</p>}
          <textarea aria-label="Dettagli della richiesta" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000}
            placeholder="Dettagli (facoltativo)"
            style={{ minHeight: 64, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
          <button type="submit" className="acc-btn is-primary" disabled={busy}>Invia richiesta</button>
        </form>

        {msg && <p role="status" style={{ fontSize: 13, color: 'var(--teal-dk)', margin: 0 }}>{msg}</p>}
        {err && <p role="alert" style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{err}</p>}

        {requests.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {requests.map(r => (
              <li key={r.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <strong>{LABEL[r.kind] || 'Richiesta'}</strong>{' · '}
                {r.status === 'open' ? `in gestione, entro il ${new Date(r.due_at).toLocaleDateString('it-IT')}` : r.status === 'done' ? 'evasa' : 'non accolta'}
                {r.response && <div style={{ color: 'var(--text-3)' }}>{r.response}</div>}
              </li>
            ))}
          </ul>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
          <Link href="/privacy-policy" style={{ color: 'var(--teal)' }}>Privacy policy</Link>{' · '}
          <Link href="/cookie-policy" style={{ color: 'var(--teal)' }}>Cookie policy</Link>{' · '}
          hello@condoreco.com
        </p>
      </div>
    </section>
  )
}
