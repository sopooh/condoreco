'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, CircleCheck, Copy, FileText, History, Info, MessageCircle, MoreHorizontal, RefreshCw, Sparkles, TriangleAlert, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Riassunto della chat del condominio fatto da Condor (edge function
// condor-chat-summary). Il pulsante va nell'header della chat, la scheda
// sopra i messaggi. Se la chat non e' cambiata torna l'ultimo riassunto
// salvato (non consuma usi); "Aggiorna riassunto" lo rifa' da capo.
const ERRORS = {
  quota: 'Hai usato tutti i riassunti di oggi. Riprova domani.',
  not_configured: 'Condor non è ancora attivo.',
  ai_error: 'Condor non è riuscito a fare il riassunto. Riprova tra poco.',
}

export function useCondorSummary(buildingId) {
  const [state, setState] = useState(null) // null | { loading, data? } | { data } | { error, pro }

  async function run(refresh = false) {
    setState((s) => ({ loading: true, data: s?.data }))
    const { data, error } = await createClient().functions.invoke('condor-chat-summary', { body: { building_id: buildingId, refresh } })
    if (error) {
      let code = null
      try { code = (await error.context?.json())?.error ?? null } catch { /* risposta non JSON */ }
      console.error('[CondorSummary] failed', code || error.message)
      if (code === 'pro_required') return setState({ pro: true })
      return setState((s) => ({ error: ERRORS[code] || code || 'Riassunto non riuscito. Riprova.', data: s?.data }))
    }
    setState({ data })
  }

  return { state, run: () => run(false), refresh: () => run(true), close: () => setState(null) }
}

export function CondorSummaryButton({ loading, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} aria-label="Riassumi la chat con Condor" className="cs-btn">
      <Sparkles size={17} aria-hidden="true" />Riassunto
    </button>
  )
}

const TONES = {
  calm: { cls: 'is-calm', Icon: CircleCheck },
  attention: { cls: 'is-attention', Icon: TriangleAlert },
  urgent: { cls: 'is-urgent', Icon: TriangleAlert },
}

export function CondorSummaryPanel({ state, onClose, onRefresh }) {
  if (!state) return null
  const d = state.data
  return (
    <div className="cs-wrap">
      <section className="cs-card" aria-live="polite" aria-label="Riassunto di Condor">
        <div className="cs-top">
          <span className="cs-brand"><Sparkles size={18} aria-hidden="true" />Condor AI <span className="cs-beta">Beta</span></span>
          <CardMenu d={d} onClose={onClose} />
        </div>
        <h3 className="cs-title">Riassunto chat</h3>
        <p className="cs-sub">Analisi degli ultimi messaggi{d?.generated_at ? ` · ${when(d.generated_at)}` : ''}</p>

        {state.pro && (
          <p className="cs-text">I riassunti di Condor sono inclusi nel piano Pro.{' '}
            <Link href="/piani/checkout?piano=resident_pro" className="cs-link">Scopri Pro</Link></p>
        )}
        {state.error && <p role="alert" className="cs-error">{state.error}</p>}
        {state.loading && !d && <Skeleton />}

        {d && <SummaryBody d={d} />}

        {!state.pro && (
          <div className="cs-foot">
            <span className="cs-updated"><History size={17} aria-hidden="true" />{d?.generated_at ? `Ultimo aggiornamento: ${when(d.generated_at).toLowerCase()}` : 'In preparazione'}</span>
            <button type="button" className="cs-refresh" onClick={onRefresh} disabled={state.loading}>
              <RefreshCw size={17} aria-hidden="true" className={state.loading ? 'cs-spin' : ''} />{state.loading ? 'Aggiorno…' : 'Aggiorna riassunto'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryBody({ d }) {
  const tone = TONES[d.tone] || TONES.calm
  const stats = [
    { Icon: MessageCircle, n: d.message_count ?? 0, label: 'Messaggi' },
    { Icon: Users, n: d.decisions?.length ?? 0, label: 'Decisioni' },
    { Icon: TriangleAlert, n: d.issues?.length ?? 0, label: 'Segnalazioni' },
    { Icon: CalendarDays, n: d.dates?.length ?? 0, label: 'Scadenze' },
  ]
  return (
    <>
      <div className={`cs-status ${tone.cls}`}>
        <tone.Icon size={22} aria-hidden="true" /><span>{d.headline}</span>
      </div>

      <div className="cs-stats">
        {stats.map(({ Icon, n, label }) => (
          <div key={label} className="cs-stat">
            <span className="cs-stat-n"><Icon size={20} aria-hidden="true" />{n}</span>
            <span className="cs-stat-l">{label}</span>
          </div>
        ))}
      </div>

      {d.points?.length > 0 && (
        <Block Icon={FileText} title="In sintesi"><ul className="cs-list">{d.points.map((p, i) => <li key={i}>{p}</li>)}</ul></Block>
      )}
      {d.decisions?.length > 0 && (
        <Block Icon={Users} title="Decisioni"><ul className="cs-list">{d.decisions.map((p, i) => <li key={i}>{p}</li>)}</ul></Block>
      )}
      {d.issues?.length > 0 && (
        <Block Icon={TriangleAlert} title="Segnalazioni"><ul className="cs-list">{d.issues.map((p, i) => <li key={i}>{p}</li>)}</ul></Block>
      )}

      <div className="cs-dates">
        <div className="cs-dates-head">
          <span><CalendarDays size={20} aria-hidden="true" />Date da ricordare</span>
          <span title="Scadenze, assemblee e interventi citati in chat" aria-label="Scadenze, assemblee e interventi citati in chat"><Info size={20} aria-hidden="true" /></span>
        </div>
        {d.dates?.length ? d.dates.map((x, i) => (
          <div key={i} className="cs-date-row">
            <span className="cs-date-badge">{x.date ? <><b>{new Date(x.date).getDate()}</b><small>{new Date(x.date).toLocaleDateString('it-IT', { month: 'short' })}</small></> : <CalendarDays size={18} aria-hidden="true" />}</span>
            <span><b>{x.title}</b>{x.detail && <small>{x.detail}</small>}</span>
          </div>
        )) : (
          <div className="cs-date-row">
            <span className="cs-date-ok"><Check size={20} aria-hidden="true" /></span>
            <span><b>Nessuna data da ricordare</b><small>Non sono state menzionate scadenze, assemblee o interventi.</small></span>
          </div>
        )}
      </div>
    </>
  )
}

function Block({ Icon, title, children }) {
  return (
    <div className="cs-block">
      <h4><Icon size={20} aria-hidden="true" />{title}</h4>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div aria-label="Condor sta leggendo la chat" style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0 4px' }}>
      <div className="cs-sk" style={{ height: 44 }} />
      <div className="cs-sk" style={{ height: 70 }} />
      <div className="cs-sk" style={{ height: 90 }} />
    </div>
  )
}

function CardMenu({ d, onClose }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', off)
    return () => document.removeEventListener('pointerdown', off)
  }, [open])
  async function copy() {
    setOpen(false)
    if (!d) return
    const text = [d.headline, ...(d.points || []).map((p) => `• ${p}`),
      ...(d.dates?.length ? ['', 'Date da ricordare:', ...d.dates.map((x) => `• ${x.date ? new Date(x.date).toLocaleDateString('it-IT') + ' ' : ''}${x.title}${x.detail ? ` (${x.detail})` : ''}`)] : [])].join('\n')
    try { await navigator.clipboard.writeText(text) } catch { /* non supportato */ }
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="cs-more" aria-label="Altre azioni" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={22} aria-hidden="true" /></button>
      {open && (
        <div className="cs-menu" role="menu">
          {d && <button type="button" role="menuitem" onClick={copy}><Copy size={17} aria-hidden="true" />Copia riassunto</button>}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onClose() }}><X size={17} aria-hidden="true" />Chiudi</button>
        </div>
      )}
    </div>
  )
}

function when(iso) {
  const d = new Date(iso)
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = Math.round((today - day) / 86400000)
  if (diff === 0) return `Oggi, ${t}`
  if (diff === 1) return `Ieri, ${t}`
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}, ${t}`
}
