'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Briefcase, Building2, CalendarDays, ChevronRight, Info, Mail, MapPin, MessageSquarePlus, Phone } from 'lucide-react'
import { maintenanceCategory, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewsSection from '@/components/reviews/ReviewsSection'
import { ADMIN_RESIDENT_TYPES, ADMIN_REVIEW_CATEGORIES } from '@/lib/reviewOptions'
import { scoreColor } from '@/lib/score'
import { AboutCard, ProfileCard, RATING_ICONS, RatingsCard, ReviewMini, StatsRow, recommendFrom } from '@/components/profiles/ProfileParts'

// Pagina di presentazione di un amministratore, stesso schema della pagina
// fornitore. Peculiarità: recensioni dei residenti con form, contatti dello
// studio e palazzi amministrati in fondo (fuori dalle tab).
export default function AdminProfileView({ admin: a, reviews, buildingsCount, suppliers = [], children }) {
  const demo = Boolean(a.demo)
  const [tab, setTab] = useState('panoramica')
  const [reviewOpen, setReviewOpen] = useState(false)

  const reviewCount = a.review_count ?? reviews.length
  const condos = a.building_count ?? buildingsCount
  const fee = a.avg_monthly_fee != null ? `${Math.round(a.avg_monthly_fee)} €` : null
  const ratingItems = [
    { key: 'availability', label: 'Reperibilità', value: a.score_availability, icon: RATING_ICONS.availability },
    { key: 'transparency', label: 'Trasparenza', value: a.score_transparency, icon: RATING_ICONS.transparency },
    { key: 'speed', label: 'Velocità', value: a.score_speed, icon: RATING_ICONS.speed },
    { key: 'assemblies', label: 'Assemblee', value: a.score_assemblies, icon: RATING_ICONS.people },
    { key: 'value', label: 'Qualità/prezzo', value: a.score_value, icon: RATING_ICONS.value },
  ]
  const tabs = [
    { id: 'panoramica', label: 'Panoramica' },
    { id: 'recensioni', label: `Recensioni (${reviewCount})` },
    { id: 'fornitori', label: `Fornitori (${suppliers.length})` },
  ]
  const mini = (r) => ({ name: r.profiles?.display_name, context: r.resident_type === 'former_resident' ? 'Ex residente' : r.resident_type === 'evaluating' ? 'Sta valutando' : 'Residente', score: r.score, body: r.body })

  return (
    <div className="sp-page">
      {demo && (
        <div className="sp-demo"><Info size={16} aria-hidden="true" />Amministratore di esempio: mostra come apparirà il profilo. Voti, recensioni, palazzi e dati sono inventati; non si può recensire né contattare.</div>
      )}
      <header className="sp-head">
        <span className="sp-logo"><Briefcase size={38} aria-hidden="true" /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{a.name}{a.verified && <BadgeCheck size={24} fill="var(--teal)" color="#fff" aria-label="Verificato" />}</h1>
          <div className="sp-cats">{a.studio_name || 'Amministratore di condominio'}</div>
          <div className="sp-meta">
            <span><Building2 size={15} aria-hidden="true" />{condos} {condos === 1 ? 'condominio' : 'condomini'}</span>
            {a.active_since && <span><CalendarDays size={15} aria-hidden="true" />Dal {a.active_since}</span>}
            <span><MapPin size={15} aria-hidden="true" />{a.city}</span>
          </div>
        </div>
      </header>

      <div className="sp-actions">
        <button type="button" className="sp-btn is-main" disabled={demo} onClick={() => setReviewOpen(true)}><MessageSquarePlus size={18} aria-hidden="true" />Recensisci</button>
        {a.phone && !demo
          ? <a className="sp-btn" href={`tel:${a.phone}`} style={{ textDecoration: 'none' }}><Phone size={18} aria-hidden="true" />Chiama</a>
          : <button type="button" className="sp-btn" disabled><Phone size={18} aria-hidden="true" />Chiama</button>}
        {a.email && !demo
          ? <a className="sp-btn" href={`mailto:${a.email}`} style={{ textDecoration: 'none' }}><Mail size={18} aria-hidden="true" />Email</a>
          : <button type="button" className="sp-btn" disabled><Mail size={18} aria-hidden="true" />Email</button>}
      </div>

      <nav className="sp-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <a href="#palazzi" className="sp-tab-link">Palazzi ({buildingsCount})</a>
      </nav>

      {tab === 'panoramica' && (
        <>
          <RatingsCard items={ratingItems} score={a.score} count={reviewCount} recommendPct={recommendFrom(reviews)}
            emptyText="Ancora nessuna valutazione: sii il primo a recensire questo amministratore." />
          <AboutCard text={a.description} />
          <ProfileCard title="Lo studio">
            <div className="sp-chips">
              <span className="sp-chip"><Briefcase size={17} aria-hidden="true" />{a.studio_name || 'Amministratore'}</span>
              {a.address && <span className="sp-chip"><MapPin size={17} aria-hidden="true" />{[a.address, a.city].filter(Boolean).join(', ')}</span>}
              {a.phone && !demo && <a className="sp-chip is-soft" href={`tel:${a.phone}`} style={{ textDecoration: 'none' }}><Phone size={16} aria-hidden="true" />{a.phone}</a>}
              {a.email && !demo && <a className="sp-chip is-soft" href={`mailto:${a.email}`} style={{ textDecoration: 'none' }}><Mail size={16} aria-hidden="true" />{a.email}</a>}
            </div>
          </ProfileCard>
          <ProfileCard title="Su Condoreco">
            <StatsRow stats={[
              { value: a.score != null ? a.score.toFixed(1) : 'N/D', label: 'rating medio', color: scoreColor(a.score) },
              { value: condos, label: condos === 1 ? 'condominio gestito' : 'condomini gestiti' },
              fee ? { value: fee, label: 'spese medie al mese' } : { value: reviewCount, label: 'recensioni' },
            ]} />
          </ProfileCard>
          {reviews.length > 0 && (
            <ProfileCard title={`Recensioni (${reviewCount})`} action={<button type="button" className="pf-more" style={{ marginTop: 0 }} onClick={() => setTab('recensioni')}>Vedi tutte</button>}>
              {reviews.slice(0, 2).map((r) => <ReviewMini key={r.id} {...mini(r)} />)}
            </ProfileCard>
          )}
        </>
      )}

      {tab === 'fornitori' && (
        <ProfileCard title="Fornitori con cui lavora">
          <p className="pf-text" style={{ marginBottom: 10 }}>Recofixer nella rubrica dei condomini che amministra. Tocca per vedere il profilo.</p>
          {suppliers.length === 0 ? <p className="pf-text">Nessun fornitore iscritto a Condoreco nei suoi condomini, per ora.</p> : (
            <div className="sp-recent" style={{ marginTop: 0 }}>
              {suppliers.map((f) => (
                <Link key={f.id} href={`/fornitori/${f.id}`} className="sp-job" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="sp-job-ico"><MaintenanceIcon name={maintenanceCategory(f.categories?.[0]).icon} size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{f.company_name}{f.verified && <BadgeCheck size={16} fill="var(--teal)" color="#fff" aria-label="Verificato" />}</b>
                    <small>{(f.categories || []).map(maintenanceCategoryLabel).join(' · ')}{f.condos ? ` · ${f.condos} ${f.condos === 1 ? 'condominio' : 'condomini'}` : ''}</small>
                  </div>
                  <ChevronRight size={20} aria-hidden="true" style={{ color: 'var(--text-4)' }} />
                </Link>
              ))}
            </div>
          )}
        </ProfileCard>
      )}

      {tab === 'recensioni' && demo && (
        <ProfileCard title={`Recensioni (${reviewCount})`}>
          {reviews.map((r) => <ReviewMini key={r.id} {...mini(r)} />)}
        </ProfileCard>
      )}

      {tab === 'recensioni' && !demo && (
        <section className="pf-card">
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
        <div className="sp-price"><small>{reviewCount} {reviewCount === 1 ? 'recensione' : 'recensioni'}</small><b style={{ color: scoreColor(a.score) }}>★ {a.score != null ? a.score.toFixed(1) : 'N/D'}</b></div>
        <button type="button" className="sp-btn is-main is-wide" disabled={demo} onClick={() => setReviewOpen(true)}>
          <MessageSquarePlus size={18} aria-hidden="true" />{demo ? 'Amministratore di esempio' : 'Scrivi una recensione'}
        </button>
      </div>

      {!demo && <ReviewForm
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        table="admin_reviews"
        column="administrator_id"
        entityId={a.id}
        subtitle={a.name}
        residentTypes={ADMIN_RESIDENT_TYPES}
        categories={ADMIN_REVIEW_CATEGORIES}
        extras={{}}
      />}
    </div>
  )
}
