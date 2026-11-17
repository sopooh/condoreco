'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Briefcase, Building2, CalendarDays, ChevronLeft, Mail, MapPin, MessageSquarePlus, Phone, Share2, Star } from 'lucide-react'
import ScoreBar from '@/components/ui/ScoreBar'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewsSection from '@/components/reviews/ReviewsSection'
import { ADMIN_RESIDENT_TYPES, ADMIN_REVIEW_CATEGORIES } from '@/lib/reviewOptions'
import { scoreColor } from '@/lib/score'

// Pagina di presentazione di un amministratore, sullo stesso schema della
// pagina fornitore. I palazzi amministrati restano in fondo (fuori dalle tab).
export default function AdminProfileView({ admin: a, reviews, buildingsCount, children }) {
  const [tab, setTab] = useState('panoramica')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [shared, setShared] = useState(false)

  const tabs = [
    { id: 'panoramica', label: 'Panoramica' },
    { id: 'recensioni', label: `Recensioni (${a.review_count ?? reviews.length})` },
  ]

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: a.name, url })
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1500) }
    } catch { /* annullato */ }
  }

  const fee = a.avg_monthly_fee != null ? `${Math.round(a.avg_monthly_fee)} €/mese` : null
  const hasContact = a.phone || a.email

  return (
    <div className="sp-page">
      <div className="sp-top">
        <Link href="/amministratori" className="sp-icon" aria-label="Torna agli amministratori"><ChevronLeft size={26} aria-hidden="true" /></Link>
        <button type="button" className="sp-icon" onClick={share} aria-label="Condividi">{shared ? <span style={{ fontSize: 12, fontWeight: 700 }}>Copiato</span> : <Share2 size={22} aria-hidden="true" />}</button>
      </div>

      <header className="sp-head">
        <span className="sp-logo"><Briefcase size={38} aria-hidden="true" /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{a.name}{a.verified && <BadgeCheck size={24} fill="var(--teal)" color="#fff" aria-label="Verificato" />}</h1>
          <div className="sp-cats">{a.studio_name || 'Amministratore di condominio'}</div>
          <div className="sp-meta">
            <span><Star size={15} fill="currentColor" aria-hidden="true" style={{ color: scoreColor(a.score) }} />
              <b style={{ color: scoreColor(a.score) }}>{a.score?.toFixed(1) ?? 'N/D'}</b>&nbsp;({a.review_count ?? 0} {a.review_count === 1 ? 'recensione' : 'recensioni'})</span>
            {a.active_since && <span><CalendarDays size={15} aria-hidden="true" />Dal {a.active_since}</span>}
            <span><MapPin size={15} aria-hidden="true" />{a.city}</span>
          </div>
        </div>
      </header>

      <div className="sp-actions">
        <button type="button" className="sp-btn is-main" onClick={() => setReviewOpen(true)}><MessageSquarePlus size={18} aria-hidden="true" />Recensisci</button>
        {a.phone
          ? <a className="sp-btn" href={`tel:${a.phone}`} style={{ textDecoration: 'none' }}><Phone size={18} aria-hidden="true" />Chiama</a>
          : <button type="button" className="sp-btn" disabled><Phone size={18} aria-hidden="true" />Chiama</button>}
        {a.email
          ? <a className="sp-btn" href={`mailto:${a.email}`} style={{ textDecoration: 'none' }}><Mail size={18} aria-hidden="true" />Email</a>
          : <button type="button" className="sp-btn" disabled><Mail size={18} aria-hidden="true" />Email</button>}
      </div>
      {hasContact && (
        <button type="button" className="sp-more" onClick={() => setContactOpen((v) => !v)} style={{ marginTop: 10 }}>
          {contactOpen ? 'Nascondi contatti' : 'Mostra contatti'}
        </button>
      )}
      {contactOpen && (
        <div className="sp-text" style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {a.phone && <a href={`tel:${a.phone}`} style={{ color: 'var(--teal-dk)', fontWeight: 600 }}>{a.phone}</a>}
          {a.email && <a href={`mailto:${a.email}`} style={{ color: 'var(--teal-dk)', fontWeight: 600 }}>{a.email}</a>}
        </div>
      )}

      <nav className="sp-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <a href="#palazzi" className="sp-tab-link">Palazzi ({buildingsCount})</a>
      </nav>

      {tab === 'panoramica' && (
        <>
          <section className="sp-sec">
            <h2>Valutazioni dei residenti</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ScoreBar label="Reperibilità" value={a.score_availability} />
              <ScoreBar label="Trasparenza" value={a.score_transparency} />
              <ScoreBar label="Velocità" value={a.score_speed} />
              <ScoreBar label="Assemblee" value={a.score_assemblies} />
              <ScoreBar label="Qualità/prezzo" value={a.score_value} />
            </div>
          </section>
          <section className="sp-sec">
            <h2>Su Condoreco</h2>
            <div className="sp-stats">
              <div><b style={{ color: scoreColor(a.score) }}>{a.score?.toFixed(1) ?? 'N/D'}</b><span>rating medio</span></div>
              <div><b>{a.building_count ?? buildingsCount}</b><span>condomini gestiti</span></div>
              <div><b>{fee || (a.review_count ?? 0)}</b><span>{fee ? 'spese medie' : 'recensioni'}</span></div>
            </div>
          </section>
          {a.address && (
            <section className="sp-sec">
              <h2>Studio</h2>
              <p className="sp-text"><MapPin size={15} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 4 }} />{[a.address, a.city].filter(Boolean).join(', ')}</p>
            </section>
          )}
          {reviews.length > 0 && (
            <section className="sp-sec">
              <div className="sp-sec-head"><h2>Recensioni</h2><button type="button" className="sp-more" onClick={() => setTab('recensioni')}>Vedi tutte ({reviews.length})</button></div>
              <div className="sp-recent">
                {reviews.slice(0, 2).map((r) => (
                  <div key={r.id} className="sp-job" style={{ alignItems: 'flex-start' }}>
                    <span className="sp-job-ico">{(r.profiles?.display_name || 'R')[0].toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{r.profiles?.display_name || 'Residente'} <span style={{ float: 'right', color: scoreColor(r.score) }}>★ {Number(r.score).toFixed(1)}</span></b>
                      {r.body && <small style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{r.body.length > 160 ? `${r.body.slice(0, 160).trim()}…` : r.body}</small>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'recensioni' && (
        <section className="sp-sec">
          <ReviewsSection
            reviews={reviews}
            table="admin_reviews"
            column="administrator_id"
            entityId={a.id}
            subtitle={a.name}
            residentTypes={ADMIN_RESIDENT_TYPES}
            categories={ADMIN_REVIEW_CATEGORIES}
            extras={{}}
            emptyTitle="Ancora nessuna recensione"
            emptyText="Sii il primo a raccontare la tua esperienza con questo amministratore."
          />
        </section>
      )}

      <div id="palazzi" style={{ scrollMarginTop: 70 }}>{children}</div>

      <div className="sp-bar">
        <div className="sp-price"><small>{a.building_count ?? buildingsCount} condomini</small><b style={{ color: scoreColor(a.score) }}>★ {a.score?.toFixed(1) ?? 'N/D'}</b></div>
        <button type="button" className="sp-btn is-main is-wide" onClick={() => setReviewOpen(true)}>
          <Building2 size={18} aria-hidden="true" />Scrivi una recensione
        </button>
      </div>

      <ReviewForm
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        table="admin_reviews"
        column="administrator_id"
        entityId={a.id}
        subtitle={a.name}
        residentTypes={ADMIN_RESIDENT_TYPES}
        categories={ADMIN_REVIEW_CATEGORIES}
        extras={{}}
      />
    </div>
  )
}
