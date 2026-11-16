'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Riassunto della chat del condominio fatto da Condor (edge function
// condor-chat-summary). Il pulsante va nell'header della chat, il pannello
// sopra i messaggi. Limite di 20 riassunti al giorno per utente.
const ERRORS = {
  quota: 'Hai usato tutti i riassunti di oggi. Riprova domani.',
  not_configured: 'Condor non è ancora attivo.',
  ai_error: 'Condor non è riuscito a fare il riassunto. Riprova tra poco.',
}

export function useCondorSummary(buildingId) {
  const [state, setState] = useState(null) // null | { loading } | { summary, remaining } | { error, pro }

  async function run() {
    setState({ loading: true })
    const { data, error } = await createClient().functions.invoke('condor-chat-summary', { body: { building_id: buildingId } })
    if (error) {
      let code = null
      try { code = (await error.context?.json())?.error ?? null } catch { /* risposta non JSON */ }
      console.error('[CondorSummary] failed', code || error.message)
      if (code === 'pro_required') return setState({ pro: true })
      return setState({ error: ERRORS[code] || code || 'Riassunto non riuscito. Riprova.' })
    }
    setState({ summary: data?.summary || '', remaining: data?.remaining })
  }

  return { state, run, close: () => setState(null) }
}

export function CondorSummaryButton({ loading, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} aria-label="Riassumi la chat con Condor"
      style={{ minHeight: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--teal-dk)', fontSize: 13.5, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
      <Sparkles size={16} aria-hidden="true" />Riassunto
    </button>
  )
}

export function CondorSummaryPanel({ state, onClose }) {
  if (!state) return null
  const box = { position: 'relative', maxWidth: 760, width: '100%', margin: '12px auto 0', boxSizing: 'border-box', padding: '12px 40px 12px 14px', borderRadius: 12, background: '#EAF4F5', border: '1px solid #CFE4E6', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text)' }
  return (
    <div style={{ padding: '0 12px' }}>
      <section style={box} aria-live="polite" aria-label="Riassunto di Condor">
        <button type="button" onClick={onClose} aria-label="Chiudi il riassunto"
          style={{ minHeight: 0, position: 'absolute', top: 8, right: 8, width: 28, height: 28, border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}>
          <X size={18} aria-hidden="true" />
        </button>
        <p style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} aria-hidden="true" />Condor
        </p>
        {state.loading && <p style={{ margin: 0, color: 'var(--text-3)' }}>Sto leggendo la chat…</p>}
        {state.error && <p role="alert" style={{ margin: 0, color: '#B42318' }}>{state.error}</p>}
        {state.pro && (
          <p style={{ margin: 0 }}>
            I riassunti di Condor sono inclusi nel piano Pro.{' '}
            <Link href="/piani/checkout?piano=resident_pro" style={{ color: 'var(--teal-dk)', fontWeight: 700 }}>Scopri Pro</Link>
          </p>
        )}
        {state.summary != null && !state.loading && !state.error && !state.pro && (
          <>
            <div style={{ whiteSpace: 'pre-wrap' }}>{state.summary}</div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
              Riassunto automatico degli ultimi messaggi: controlla sempre i dettagli in chat.
              {typeof state.remaining === 'number' ? ` Riassunti rimasti oggi: ${state.remaining}.` : ''}
            </p>
          </>
        )}
      </section>
    </div>
  )
}
