'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, Check, ChevronRight, ClipboardList, FileText, Wallet, Wrench } from 'lucide-react'
import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'
import { euro } from '@/hooks/useInterventionFiles'
import { workStats } from '@/hooks/useSupplierWork'

// Profilo Recofixer: come per l'amministratore, "Da fare" con i numeri del
// lavoro e i lavori che chiedono un'azione, poi i condomini clienti.

export function SupplierKpis({ work }) {
  const s = workStats(work.items, work.invoices)
  return (
    <div className="cadm-kpis">
      <div><ClipboardList size={18} aria-hidden="true" /><b>{s.active}</b><small>Ticket attivi</small></div>
      <div className={s.toPlan ? 'is-warn' : 'is-ok'}><CalendarClock size={18} aria-hidden="true" /><b>{s.toPlan}</b><small>Da programmare</small></div>
      <div className={s.toBill ? 'is-warn' : 'is-ok'}><FileText size={18} aria-hidden="true" /><b>{s.toBill}</b><small>Da fatturare</small></div>
      <div className={s.due > 0 ? 'is-danger' : 'is-ok'}><Wallet size={18} aria-hidden="true" /><b>{euro(s.due) || '€ 0'}</b><small>Da incassare</small></div>
    </div>
  )
}

export function SupplierInbox({ work }) {
  const billed = new Set(work.invoices.map((f) => f.intervention_id))
  const todo = work.items
    .map((i) => {
      if (i.status === 'requested' && !i.proposed_date) return { i, label: 'Proponi un appuntamento', tone: 'teal', icon: CalendarClock }
      if (i.status === 'scheduled' && !i.tech_id) return { i, label: 'Assegna un tecnico', tone: 'blue', icon: Wrench }
      if (i.status === 'done' && !billed.has(i.id) && i.invoice_cents == null) return { i, label: 'Carica la fattura', tone: 'violet', icon: FileText }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => (b.i.urgent - a.i.urgent))

  if (!todo.length) {
    return (
      <div className="cadm-card cadm-empty">
        <span className="cadm-empty-ico"><Check size={22} aria-hidden="true" /></span>
        <div><strong>Tutto in ordine</strong><small>Nessun intervento da programmare, assegnare o fatturare.</small></div>
      </div>
    )
  }
  return (
    <div className="cadm-card" style={{ padding: 0 }}>
      <ul className="cadm-inbox">
        {todo.slice(0, 6).map(({ i, label, tone, icon: Icon }) => (
          <li key={i.id}>
            <Link href={`/fornitore?i=${i.id}`} className="sp-inbox-row">
              <span className={`cadm-ico is-${tone}`}><Icon size={17} aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <small style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)' }}>{label}</small>
                <strong style={{ display: 'block', fontSize: 15 }}>
                  {i.urgent && <AlertTriangle size={14} aria-hidden="true" style={{ color: '#B42318', marginRight: 4, verticalAlign: -2 }} />}{i.title}
                </strong>
                <small style={{ display: 'block', fontSize: 13, color: 'var(--text-3)' }}>{(i.building_address || '').split(' · ')[0]}{i.ref_number ? ` · #IT-${i.ref_number}` : ''}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--text-4)', flexShrink: 0 }} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SupplierBuildingRow({ b, work }) {
  const router = useRouter()
  const mine = work.items.filter((i) => i.building_id === b.id)
  const active = mine.filter((i) => i.status === 'requested' || i.status === 'scheduled').length
  const done = mine.filter((i) => i.status === 'done').length
  const due = workStats(work.items, work.invoices).dueFor(new Set(mine.map((i) => i.id)))
  const page = `/edificio/${b.id}`
  return (
    <div className="phome">
      <Link href={page} className="phome-preview" aria-hidden="true" tabIndex={-1}>
        <BuildingPreviewImage building={b} height="100%" radius={12} />
      </Link>
      <div className="phome-body">
        <Link href={page} className="phome-title">
          <span className="phome-addr">{b.address}{b.street_number ? `, ${b.street_number}` : ''}</span>
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="phome-meta">{[b.neighborhood, b.city].filter(Boolean).join(' · ')}</div>
        <div className="phome-chips">
          <Chip label="Attivi" value={active} />
          <Chip label="Completati" value={done} />
          <Chip label="Da incassare" value={due > 0 ? euro(due) : 'Nulla'} color={due > 0 ? '#C4320A' : '#067647'} />
        </div>
        <div className="phome-foot">
          {active > 0
            ? <span className="phome-pill phome-pill-pending">{active} {active === 1 ? 'in corso' : 'in corso'}</span>
            : <span className="phome-pill phome-pill-ok">In ordine</span>}
          <button type="button" className="phome-enter" onClick={() => router.push('/fornitore')} aria-label={`Lavora sugli interventi di ${b.address}`}>
            <Wrench size={15} strokeWidth={2} aria-hidden="true" /> Lavora
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div className="phome-chip">
      <span>{label}</span>
      <strong style={{ color: color || 'var(--teal-dk)' }}>{value}</strong>
    </div>
  )
}
