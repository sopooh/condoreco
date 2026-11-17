'use client'

import { useState } from 'react'
import { BadgeCheck, Building2, CalendarDays, FileText, Info, MapPin, MessageCircle, Phone, Wrench, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { maintenanceCategory, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import ContactSheet from '@/components/directory/ContactSheet'
import { AboutCard, ProfileCard, RATING_ICONS, RatingsCard, ReviewMini, StatsRow } from '@/components/profiles/ProfileParts'

// Pagina di presentazione di un Recofixer (o di un fornitore di esempio).
// Stesso schema della pagina amministratore; peculiarità: servizi, lavori,
// prezzo indicativo e richiesta di intervento.
export default function SupplierProfileView({ supplier: s }) {
  const session = useSession()
  const [tab, setTab] = useState('panoramica')
  const [contact, setContact] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const cat = maintenanceCategory(s.categories[0])
  const since = new Date(s.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const zones = s.zones.length ? s.zones.join(', ') : 'Tutte le zone'
  const services = s.services?.length ? s.services : s.categories.map(maintenanceCategoryLabel)
  const reviews = s.reviews || []
  const reviewCount = s.reviewCount ?? reviews.length
  const r = s.ratings || {}
  const ratingItems = [
    { key: 'availability', label: 'Reperibilità', value: r.availability, icon: RATING_ICONS.availability },
    { key: 'transparency', label: 'Trasparenza', value: r.transparency, icon: RATING_ICONS.transparency },
    { key: 'speed', label: 'Velocità', value: r.speed, icon: RATING_ICONS.speed },
    { key: 'professionalism', label: 'Professionalità', value: r.professionalism, icon: RATING_ICONS.people },
    { key: 'value', label: 'Qualità/prezzo', value: r.value, icon: RATING_ICONS.value },
  ]

  const tabs = [
    { id: 'panoramica', label: 'Panoramica' },
    { id: 'recensioni', label: `Recensioni (${reviewCount})` },
    { id: 'lavori', label: `Lavori${s.recent?.length ? ` (${s.recent.length})` : ''}` },
    { id: 'servizi', label: 'Servizi' },
  ]

  async function openContact() {
    if (s.demo) return
    if (!session) {
      window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: `/fornitori/${s.id}` } }))
      return
    }
    if (!contact) {
      setBusy(true)
      const { data } = await createClient().from('suppliers').select('phone, email').eq('id', s.id).maybeSingle()
      setContact(data || { phone: null, email: null })
      setBusy(false)
    }
    setOpen(true)
  }

  const noContact = contact && !contact.phone && !contact.email

  return (
    <div className="sp-page">
      {s.demo && (
        <div className="sp-demo"><Info size={16} aria-hidden="true" />Fornitore di esempio: mostra come apparirà la pagina di un Recofixer. Voti, recensioni e lavori sono inventati e non si può contattare.</div>
      )}

      <header className="sp-head">
        <span className="sp-logo"><MaintenanceIcon name={cat.icon} size={38} /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{s.company_name}{s.verified && <BadgeCheck size={24} fill="var(--teal)" color="#fff" aria-label="Verificato" />}</h1>
          <div className="sp-cats">{s.categories.map(maintenanceCategoryLabel).join(' · ')}</div>
          <div className="sp-meta">
            <span><Wrench size={15} aria-hidden="true" />{s.jobs} {s.jobs === 1 ? 'intervento' : 'interventi'}</span>
            {s.founded ? <span><CalendarDays size={15} aria-hidden="true" />Dal {s.founded}</span> : null}
            <span><MapPin size={15} aria-hidden="true" />{zones}</span>
          </div>
        </div>
      </header>

      <div className="sp-actions">
        <button type="button" className="sp-btn is-main" onClick={openContact} disabled={s.demo || busy}><MessageCircle size={18} aria-hidden="true" />{busy ? 'Carico…' : 'Scrivi'}</button>
        <button type="button" className="sp-btn" onClick={openContact} disabled={s.demo || busy}><Phone size={18} aria-hidden="true" />Chiama</button>
        <button type="button" className="sp-btn" onClick={openContact} disabled={s.demo || busy}><FileText size={18} aria-hidden="true" />Preventivo</button>
      </div>

      <nav className="sp-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {tab === 'panoramica' && (
        <>
          <RatingsCard items={ratingItems} score={s.score} count={reviewCount} recommendPct={s.recommendPct}
            emptyText="Ancora nessuna valutazione: le daranno i residenti dopo un intervento." />
          <ProfileCard title="Servizi principali">
            <div className="sp-chips">
              {s.categories.map((c) => {
                const k = maintenanceCategory(c)
                return <span key={c} className="sp-chip"><MaintenanceIcon name={k.icon} size={18} />{k.label}</span>
              })}
              {(s.perks || []).map((p) => <span key={p} className="sp-chip is-soft"><Zap size={16} aria-hidden="true" />{p}</span>)}
            </div>
          </ProfileCard>
          <AboutCard text={s.description} />
          <ProfileCard title="Su Condoreco">
            <StatsRow stats={[
              { value: s.jobs, label: 'interventi conclusi' },
              { value: s.condos, label: s.condos === 1 ? 'condominio seguito' : 'condomini seguiti' },
              { value: <span style={{ textTransform: 'capitalize' }}>{since}</span>, label: 'iscritto da' },
            ]} />
          </ProfileCard>
          {reviews.length > 0 && (
            <ProfileCard title={`Recensioni (${reviewCount})`} action={<button type="button" className="pf-more" style={{ marginTop: 0 }} onClick={() => setTab('recensioni')}>Vedi tutte</button>}>
              <ReviewMini {...reviews[0]} />
            </ProfileCard>
          )}
        </>
      )}

      {tab === 'recensioni' && (
        <ProfileCard title={`Recensioni (${reviewCount})`}>
          {reviews.length ? reviews.map((x) => <ReviewMini key={x.id} {...x} />) : (
            <p className="pf-text">Ancora nessuna recensione. I residenti potranno recensire il fornitore dopo un intervento concluso su Condoreco.</p>
          )}
        </ProfileCard>
      )}

      {tab === 'lavori' && (
        <ProfileCard title="Lavori su Condoreco">
          {s.recent?.length ? (
            <div className="sp-recent" style={{ marginTop: 0 }}>
              {s.recent.map((j) => (
                <div key={j.title} className="sp-job">
                  <span className="sp-job-ico"><Wrench size={18} aria-hidden="true" /></span>
                  <div><b>{j.title}</b><small>{j.when} · {j.where}</small></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="pf-text">{s.jobs ? `${s.jobs} interventi conclusi con i condomini su Condoreco. Il dettaglio resta riservato ai condomini che li hanno affidati.` : 'Ancora nessun intervento concluso su Condoreco.'}</p>
          )}
        </ProfileCard>
      )}

      {tab === 'servizi' && (
        <>
          <ProfileCard title="Servizi">
            <ul className="sp-list">{services.map((x) => <li key={x}><Wrench size={16} aria-hidden="true" />{x}</li>)}</ul>
          </ProfileCard>
          <ProfileCard title="Zone servite">
            <p className="pf-text"><MapPin size={15} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 4 }} />{zones}</p>
          </ProfileCard>
        </>
      )}

      <div className="sp-bar">
        {s.priceFrom && <div className="sp-price"><small>A partire da</small><b>{s.priceFrom}</b></div>}
        <button type="button" className="sp-btn is-main is-wide" onClick={openContact} disabled={s.demo || busy}>
          <Building2 size={18} aria-hidden="true" />{s.demo ? 'Fornitore di esempio' : 'Richiedi intervento'}
        </button>
      </div>

      {!s.demo && (
        <ContactSheet open={open} onClose={() => setOpen(false)} name={s.company_name}
          phone={contact?.phone} email={contact?.email}
          note={noContact ? 'Nessun contatto pubblico. Aggiungilo ai fornitori del tuo condominio (Interventi, Cerca fornitori) e scrivigli nella chat dell’intervento.' : 'Per affidargli un lavoro aggiungilo ai fornitori del tuo condominio: così potete usare la chat dell’intervento.'} />
      )}
    </div>
  )
}
