'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Building2, CalendarDays, ChevronDown, ChevronLeft, FileText, Info, MapPin, MessageCircle, Phone, Share2, Wrench, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { maintenanceCategory, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import ContactSheet from '@/components/directory/ContactSheet'

const TABS = [
  { id: 'panoramica', label: 'Panoramica' },
  { id: 'lavori', label: 'Lavori' },
  { id: 'servizi', label: 'Servizi' },
]

// Pagina di presentazione di un Recofixer (o di un fornitore di esempio).
export default function SupplierProfileView({ supplier: s }) {
  const session = useSession()
  const [tab, setTab] = useState('panoramica')
  const [more, setMore] = useState(false)
  const [contact, setContact] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shared, setShared] = useState(false)

  const cat = maintenanceCategory(s.categories[0])
  const since = new Date(s.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const zones = s.zones.length ? s.zones.join(', ') : 'Tutte le zone'
  const services = s.services?.length ? s.services : s.categories.map(maintenanceCategoryLabel)
  const desc = s.description || ''
  const long = desc.length > 180

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

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: s.company_name, url })
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1500) }
    } catch { /* annullato */ }
  }

  const noContact = contact && !contact.phone && !contact.email

  return (
    <div className="sp-page">
      <div className="sp-top">
        <Link href="/fornitori" className="sp-icon" aria-label="Torna ai fornitori"><ChevronLeft size={26} aria-hidden="true" /></Link>
        <button type="button" className="sp-icon" onClick={share} aria-label="Condividi">{shared ? <span style={{ fontSize: 12, fontWeight: 700 }}>Copiato</span> : <Share2 size={22} aria-hidden="true" />}</button>
      </div>

      {s.demo && (
        <div className="sp-demo"><Info size={16} aria-hidden="true" />Questo è un fornitore di esempio: mostra come apparirà la pagina di un Recofixer. Non si può contattare.</div>
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
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            {t.label}{t.id === 'lavori' && s.recent?.length ? ` (${s.recent.length})` : ''}
          </button>
        ))}
      </nav>

      {tab === 'panoramica' && (
        <>
          {desc && (
            <section className="sp-sec">
              <h2>Chi siamo</h2>
              <p className="sp-text">{long && !more ? `${desc.slice(0, 180).trim()}…` : desc}</p>
              {long && (
                <button type="button" className="sp-more" onClick={() => setMore((v) => !v)}>
                  {more ? 'Leggi di meno' : 'Leggi di più'}<ChevronDown size={16} aria-hidden="true" style={{ transform: more ? 'rotate(180deg)' : 'none' }} />
                </button>
              )}
            </section>
          )}
          <section className="sp-sec">
            <h2>Servizi principali</h2>
            <div className="sp-chips">
              {s.categories.map((c) => {
                const k = maintenanceCategory(c)
                return <span key={c} className="sp-chip"><MaintenanceIcon name={k.icon} size={18} />{k.label}</span>
              })}
            </div>
            {s.perks?.length > 0 && (
              <div className="sp-chips" style={{ marginTop: 10 }}>
                {s.perks.map((p) => <span key={p} className="sp-chip is-soft"><Zap size={16} aria-hidden="true" />{p}</span>)}
              </div>
            )}
          </section>
          <section className="sp-sec">
            <h2>Su Condoreco</h2>
            <div className="sp-stats">
              <div><b>{s.jobs}</b><span>interventi conclusi</span></div>
              <div><b>{s.condos}</b><span>{s.condos === 1 ? 'condominio seguito' : 'condomini seguiti'}</span></div>
              <div><b style={{ textTransform: 'capitalize' }}>{since}</b><span>iscritto da</span></div>
            </div>
          </section>
          {s.recent?.length > 0 && (
            <section className="sp-sec">
              <div className="sp-sec-head"><h2>Lavori recenti</h2><button type="button" className="sp-more" onClick={() => setTab('lavori')}>Vedi tutti ({s.recent.length})</button></div>
              <RecentList items={s.recent.slice(0, 2)} />
            </section>
          )}
        </>
      )}

      {tab === 'lavori' && (
        <section className="sp-sec">
          <h2>Lavori su Condoreco</h2>
          {s.recent?.length ? <RecentList items={s.recent} /> : (
            <p className="sp-text">{s.jobs ? `${s.jobs} interventi conclusi con i condomini su Condoreco. Il dettaglio dei lavori resta riservato ai condomini che li hanno affidati.` : 'Ancora nessun intervento concluso su Condoreco.'}</p>
          )}
        </section>
      )}

      {tab === 'servizi' && (
        <section className="sp-sec">
          <h2>Servizi</h2>
          <ul className="sp-list">{services.map((x) => <li key={x}><Wrench size={16} aria-hidden="true" />{x}</li>)}</ul>
          <h2 style={{ marginTop: 18 }}>Zone servite</h2>
          <p className="sp-text"><MapPin size={15} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 4 }} />{zones}</p>
        </section>
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

function RecentList({ items }) {
  return (
    <div className="sp-recent">
      {items.map((r) => (
        <div key={r.title} className="sp-job">
          <span className="sp-job-ico"><Wrench size={18} aria-hidden="true" /></span>
          <div><b>{r.title}</b><small>{r.when} · {r.where}</small></div>
        </div>
      ))}
    </div>
  )
}
