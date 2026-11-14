'use client'

import { useState } from 'react'
import { ui } from './ui.jsx'

const OBJECTIVES = [
  ['traffic', 'Visite al sito', 'Porta persone su condoreco.com. Consigliato per crescere.'],
  ['engagement', 'Interazioni', 'Più like, salvataggi e commenti sul post.'],
  ['awareness', 'Copertura', 'Mostra il post al maggior numero di persone.'],
]

export default function BoostPanel({ post, adsReady, onBoosted }) {
  const [form, setForm] = useState({ objective: 'traffic', dailyBudgetEur: 5, days: 7, city: 'Milano', radiusKm: 15, ageMin: 25, ageMax: 50 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const total = (Number(form.dailyBudgetEur) || 0) * (Number(form.days) || 0)

  if (post.boost?.ad_id) {
    const b = post.boost
    return (
      <div style={ui.card}>
        <h2 style={ui.h2}>Sponsorizzazione</h2>
        <p style={ui.muted}>
          Creata in pausa: {b.daily_budget_eur}€ al giorno per {b.days} giorni (massimo {b.total_max_eur}€)
          {b.city ? `, ${b.city}` : ', tutta Italia'}. Non spende nulla finché non la attivi.
        </p>
        <a href={b.manager_url} target="_blank" rel="noreferrer" style={{ ...ui.orangeBtn, display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>
          Apri Gestione inserzioni
        </a>
      </div>
    )
  }

  async function boost() {
    setBusy(true); setError(null)
    const res = await fetch('/api/instagram/boost', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, ...form }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(body.error || 'Errore'); return }
    onBoosted?.()
  }

  return (
    <div style={ui.card}>
      <h2 style={ui.h2}>Sponsorizza questo post</h2>
      {!adsReady && (
        <p style={ui.muted}>Prima configura l&apos;account pubblicitario (vedi guida in docs/instagram.md).</p>
      )}
      <label style={ui.label}>Obiettivo</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {OBJECTIVES.map(([v, l, d]) => (
          <button key={v} type="button" onClick={() => set('objective', v)} style={{
            ...ui.ghostBtn, textAlign: 'left',
            ...(form.objective === v ? { borderColor: 'var(--teal)', background: 'var(--teal-lt)' } : {}),
          }}>
            <b style={{ color: 'var(--text)' }}>{l}</b><br /><span style={{ fontSize: 12, color: 'var(--text-3)' }}>{d}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={ui.label}>€ al giorno</label><input type="number" inputMode="decimal" style={ui.input} value={form.dailyBudgetEur} onChange={(e) => set('dailyBudgetEur', e.target.value)} /></div>
        <div><label style={ui.label}>Giorni</label><input type="number" inputMode="numeric" style={ui.input} value={form.days} onChange={(e) => set('days', e.target.value)} /></div>
        <div><label style={ui.label}>Città (vuoto = Italia)</label><input style={ui.input} value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div><label style={ui.label}>Raggio km</label><input type="number" inputMode="numeric" style={ui.input} value={form.radiusKm} onChange={(e) => set('radiusKm', e.target.value)} /></div>
        <div><label style={ui.label}>Età da</label><input type="number" inputMode="numeric" style={ui.input} value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} /></div>
        <div><label style={ui.label}>Età fino a</label><input type="number" inputMode="numeric" style={ui.input} value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} /></div>
      </div>
      <p style={{ ...ui.muted, marginTop: 10 }}>
        Spesa massima {total}€. La campagna viene creata <b>in pausa</b>: la attivi tu da Gestione inserzioni.
      </p>
      {error && <div style={ui.error}>{error}</div>}
      <button type="button" style={{ ...ui.orangeBtn, width: '100%', marginTop: 10 }} disabled={busy || !adsReady} onClick={boost}>
        {busy ? 'Creazione...' : 'Crea sponsorizzazione in pausa'}
      </button>
    </div>
  )
}
