'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Building2, CalendarCheck, Check, ChevronRight, FileCheck2, Gavel, Inbox, Landmark, Lock, Scale, Users, X } from 'lucide-react'
import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'
import { euro, fmtDay } from '@/lib/accounting'

// Profilo amministratore: le cose da validare in tutti i condomini e l'elenco
// dei condomini gestiti, ognuno con lo stato dei pagamenti.

const TYPE = {
  poll: { label: 'Decisione approvata', icon: Gavel, tone: 'orange' },
  receipt: { label: 'Contabile da validare', icon: FileCheck2, tone: 'blue' },
  transfer: { label: 'Bonifico da confermare', icon: Landmark, tone: 'blue' },
  event: { label: 'Appuntamento da approvare', icon: CalendarCheck, tone: 'teal' },
  quote: { label: 'Preventivo ricevuto', icon: Scale, tone: 'violet' },
}
const ORDER = ['poll', 'receipt', 'transfer', 'event', 'quote']

export function AdminKpis({ buildings, inbox }) {
  const people = buildings.reduce((n, b) => n + b.members, 0)
  const overdue = buildings.reduce((n, b) => n + Number(b.overdue_total), 0)
  const due = buildings.reduce((n, b) => n + Number(b.due_total), 0)
  const paid = buildings.reduce((n, b) => n + Number(b.paid_total), 0)
  return (
    <div className="adm-kpis">
      <div><Building2 size={18} aria-hidden="true" /><b>{buildings.length}</b><small>{buildings.length === 1 ? 'Condominio' : 'Condomini'}</small></div>
      <div><Users size={18} aria-hidden="true" /><b>{people}</b><small>Condomini iscritti</small></div>
      <div className={inbox.length ? 'is-warn' : 'is-ok'}><Inbox size={18} aria-hidden="true" /><b>{inbox.length}</b><small>Da fare</small></div>
      <div className={overdue > 0 ? 'is-danger' : 'is-ok'}><AlertTriangle size={18} aria-hidden="true" /><b>{euro(overdue, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</b><small>Arretrati{due > 0 ? ` · incassato ${Math.round((paid / due) * 100)}%` : ''}</small></div>
    </div>
  )
}

export function AdminInbox({ admin, hideAddress = false }) {
  const router = useRouter()
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const items = [...admin.inbox].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))

  if (!items.length) {
    return (
      <div className="adm-card adm-empty">
        <span className="adm-empty-ico"><Check size={22} aria-hidden="true" /></span>
        <div><strong>Tutto in ordine</strong><small>Nessuna contabile, appuntamento o decisione da gestire.</small></div>
      </div>
    )
  }

  async function act(key, fn) {
    setBusy(key); setErr(null)
    const r = await fn()
    setBusy(null)
    if (r?.error) setErr(r.error)
    return r
  }

  return (
    <div className="adm-card" style={{ padding: 0 }}>
      {err && <p className="auth-err" style={{ margin: 12 }}>{err}</p>}
      <ul className="adm-inbox">
        {items.map((it) => {
          const t = TYPE[it.type]
          const base = `/edificio/${it.buildingId}/condominio`
          const key = `${it.type}-${it.id}`
          return (
            <li key={key}>
              <span className={`adm-ico is-${t.tone}`}><t.icon size={18} aria-hidden="true" /></span>
              <div className="adm-inbox-body">
                <small>{t.label}{hideAddress ? '' : ` · ${it.address}`}</small>
                <strong>{it.title}</strong>
                {it.type === 'event' && <small>{fmtDay(it.date)}{it.time ? ` · ${String(it.time).slice(0, 5)}` : ''}{it.location ? ` · ${it.location}` : ''}</small>}
                {it.type === 'quote' && it.amount && <small>{euro(it.amount)}</small>}
              </div>
              <div className="adm-inbox-act">
                {it.type === 'poll' && (
                  <button type="button" className="acc-btn is-primary" disabled={busy === key}
                    onClick={() => act(key, async () => { const r = await admin.takeCharge(it.id); if (r.id) router.push(`${base}/pratiche?p=${r.id}`); return r })}>
                    {busy === key ? 'Apertura…' : 'Prendi in carico'}
                  </button>
                )}
                {(it.type === 'receipt' || it.type === 'transfer') && (
                  <Link href={`${base}/contabilita?tab=panoramica`} className="acc-btn">Valida</Link>
                )}
                {it.type === 'event' && (
                  <>
                    <button type="button" className="acc-btn is-primary" disabled={busy === key} onClick={() => act(key, () => admin.approveEvent(it.id))}><Check size={16} aria-hidden="true" />Approva</button>
                    <button type="button" className="acc-btn is-danger" aria-label="Rifiuta" disabled={busy === key} onClick={() => act(key, () => admin.rejectEvent(it.id))}><X size={16} aria-hidden="true" /></button>
                  </>
                )}
                {it.type === 'quote' && <Link href={`${base}/pratiche?p=${it.practiceId}`} className="acc-btn">Confronta</Link>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AdminBuildingRow({ b }) {
  const router = useRouter()
  const base = `/edificio/${b.id}/condominio`
  const due = Number(b.due_total)
  const pct = due > 0 ? Math.round((Number(b.paid_total) / due) * 100) : null
  return (
    <div className="phome">
      <Link href={base} className="phome-preview" aria-hidden="true" tabIndex={-1}>
        <BuildingPreviewImage building={b} height="100%" radius={12} />
      </Link>
      <div className="phome-body">
        <Link href={base} className="phome-title">
          <span className="phome-addr">{b.address}{b.street_number ? `, ${b.street_number}` : ''}</span>
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="phome-meta">{[b.neighborhood, b.city].filter(Boolean).join(' · ')}</div>
        <div className="phome-chips">
          <Chip label="Condomini" value={b.members} />
          <Chip label="Incassato" value={pct == null ? 'N/D' : `${pct}%`} color={pct != null && pct < 80 ? '#C2410C' : undefined} />
          <Chip label="Arretrati" value={Number(b.overdue_total) > 0 ? euro(b.overdue_total, { maximumFractionDigits: 0, minimumFractionDigits: 0 }) : 'Nessuno'} color={Number(b.overdue_total) > 0 ? '#C4320A' : '#067647'} />
          {b.practices_open > 0 && <Chip label="Pratiche" value={b.practices_open} />}
        </div>
        <div className="phome-foot">
          {b.todo > 0
            ? <span className="phome-pill phome-pill-pending">{b.todo} da fare</span>
            : <span className="phome-pill phome-pill-ok">In ordine</span>}
          <button type="button" className="phome-enter" onClick={() => router.push(base)} aria-label={`Gestisci il condominio di ${b.address}`}>
            <Lock size={15} strokeWidth={2} aria-hidden="true" /> Gestisci
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
