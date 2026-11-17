'use client'

import { ChevronDown, Eye, Layers, ShieldCheck, Star, ThumbsUp, Users, Zap } from 'lucide-react'
import { useState } from 'react'

// Pezzi comuni alle pagine profilo di amministratori e fornitori.

export const RATING_ICONS = { availability: ShieldCheck, transparency: Eye, speed: Zap, people: Users, value: Layers }

const fmt = (v) => (v == null ? 'N/D' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

export function ProfileCard({ title, action, children }) {
  return (
    <section className="pf-card">
      {(title || action) && <div className="pf-card-head">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  )
}

// Barre delle valutazioni con icone, voto medio e % consigliato
export function RatingsCard({ items, score, count, recommendPct, emptyText }) {
  const any = items.some((i) => i.value != null)
  return (
    <ProfileCard title="Valutazioni dei residenti">
      {!any ? <p className="pf-text">{emptyText || 'Ancora nessuna valutazione.'}</p> : (
        <>
          <div className="pf-bars">
            {items.map(({ key, label, value, icon: Icon }) => (
              <div key={key} className="pf-bar">
                <Icon size={18} aria-hidden="true" />
                <span className="pf-bar-label">{label}</span>
                <span className="pf-bar-track"><span style={{ width: `${Math.max(0, Math.min(1, (value || 0) / 5)) * 100}%` }} /></span>
                <b>{fmt(value)}</b>
              </div>
            ))}
          </div>
          <div className="pf-sum">
            <div className="pf-sum-score">
              <span><Star size={24} fill="currentColor" aria-hidden="true" /><b>{fmt(score)}</b></span>
              <small>{count} {count === 1 ? 'recensione' : 'recensioni'}</small>
            </div>
            {recommendPct != null && (
              <span className="pf-reco"><ThumbsUp size={18} aria-hidden="true" />{recommendPct}% consigliato</span>
            )}
          </div>
        </>
      )}
    </ProfileCard>
  )
}

export function AboutCard({ text, limit = 180 }) {
  const [more, setMore] = useState(false)
  if (!text) return null
  const long = text.length > limit
  return (
    <ProfileCard title="Chi siamo">
      <p className="pf-text">{long && !more ? `${text.slice(0, limit).trim()}…` : text}</p>
      {long && (
        <button type="button" className="pf-more" onClick={() => setMore((v) => !v)}>
          {more ? 'Leggi di meno' : 'Leggi di più'}<ChevronDown size={16} aria-hidden="true" style={{ transform: more ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}
    </ProfileCard>
  )
}

export function StatsRow({ stats }) {
  return (
    <div className="sp-stats">
      {stats.map((s) => <div key={s.label}><b style={s.color ? { color: s.color } : undefined}>{s.value}</b><span>{s.label}</span></div>)}
    </div>
  )
}

export function ReviewMini({ name, context, score, body }) {
  return (
    <div className="pf-review">
      <span className="pf-review-av" aria-hidden="true">{(name || 'R')[0].toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pf-review-top"><b>{name || 'Residente'}</b><span><Star size={14} fill="currentColor" aria-hidden="true" />{fmt(score)}</span></div>
        {context && <small>{context}</small>}
        {body && <p>{body.length > 180 ? `${body.slice(0, 180).trim()}…` : body}</p>}
      </div>
    </div>
  )
}

// % di recensioni con voto almeno 4
export function recommendFrom(reviews) {
  const scored = (reviews || []).filter((r) => r.score != null)
  if (!scored.length) return null
  return Math.round((scored.filter((r) => Number(r.score) >= 4).length / scored.length) * 100)
}
