'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, Banknote, CalendarClock, ChevronRight, CircleCheck, ClipboardList, FileText, MapPin,
  MessageCircle, Receipt, Wallet, Wrench,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { euro } from '@/hooks/useInterventionFiles'
import { STAGE, stageOf, fmtDay } from '@/components/suppliers/workspace/RecofixerWorkspace'

// Area "Lavora" del Recofixer: solo quello che serve per portare a termine i
// lavori. Panoramica (ticket attivi, da programmare, da fatturare, da
// incassare), elenco lavori, scheda del singolo ticket con avanzamento,
// chat e pagamenti, archivio fatture.

const ACTIVE = (i) => i.status === 'requested' || i.status === 'scheduled'

export default function WorkTab({ list, loading, demo, onManage, onChat }) {
  const [files, setFiles] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [paying, setPaying] = useState(null)
  const ids = list.map((i) => i.id).join(',')

  const loadFiles = useCallback(async () => {
    if (demo || !ids) { setFiles([]); return }
    const { data } = await createClient().from('condo_intervention_files')
      .select('id, intervention_id, kind, amount_cents, paid_cents, paid_at, file_path, file_name, created_at')
      .in('intervention_id', ids.split(',')).in('kind', ['quote', 'invoice']).order('created_at', { ascending: false })
    setFiles(data || [])
  }, [ids, demo])
  useEffect(() => { loadFiles() }, [loadFiles])

  const invoices = useMemo(() => (files || []).filter((f) => f.kind === 'invoice'), [files])
  const byInt = useMemo(() => {
    const m = {}
    invoices.forEach((f) => { (m[f.intervention_id] ||= []).push(f) })
    return m
  }, [invoices])
  const money = (i) => {
    const inv = byInt[i.id] || []
    const billed = inv.reduce((n, f) => n + (f.amount_cents || 0), 0)
    const paid = inv.reduce((n, f) => n + (f.paid_cents || 0), 0)
    return { billed, paid, invoices: inv }
  }

  const kpi = useMemo(() => {
    const active = list.filter(ACTIVE).length
    const toPlan = list.filter((i) => stageOf(i) === 'todo').length
    const toBill = list.filter((i) => i.status === 'done' && !(byInt[i.id]?.length) && i.invoice_cents == null).length
    const due = invoices.reduce((n, f) => n + Math.max(0, (f.amount_cents || 0) - (f.paid_cents || 0)), 0)
    return { active, toPlan, toBill, due }
  }, [list, byInt, invoices])

  const open = list.find((i) => i.id === openId) || null
  if (open) {
    return (
      <>
        <Ticket i={open} m={money(open)} demo={demo} onBack={() => setOpenId(null)} onManage={() => onManage(open.id)} onChat={() => onChat(open)} onPay={setPaying} />
        {paying && <PaySheet f={paying} onClose={() => setPaying(null)} onSaved={async () => { setPaying(null); await loadFiles() }} />}
      </>
    )
  }

  const sorted = [...list].sort((a, b) => (ACTIVE(b) - ACTIVE(a)) || (b.urgent - a.urgent) || String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))

  return (
    <>
      <section className="rfx-card wk-card">
        <div className="wk-head">
          <div>
            <small>Bentornato nella tua attività</small>
            <h1 className="rfx-h1" style={{ margin: 0 }}>Panoramica lavori</h1>
          </div>
          <span className="wk-pill is-ok">Operativo</span>
        </div>
        <div className="wk-kpis">
          <Kpi icon={ClipboardList} value={kpi.active} label="Ticket attivi" />
          <Kpi icon={CalendarClock} value={kpi.toPlan} label="Da programmare" />
          <Kpi icon={FileText} value={kpi.toBill} label="Da fatturare" />
          <Kpi icon={Wallet} value={euro(kpi.due) || '€ 0'} label="Da incassare" />
        </div>
      </section>

      <section className="rfx-card wk-card">
        <h2 className="wk-h2">Lavori</h2>
        {loading ? <p className="rfx-muted">Caricamento…</p> : sorted.length === 0 ? (
          <div className="rfx-empty"><Wrench size={26} aria-hidden="true" /><strong>Nessun lavoro</strong><span>Quando un condominio ti sceglie per un intervento, lo trovi qui.</span></div>
        ) : (
          <ul className="wk-list">
            {sorted.slice(0, 12).map((i) => {
              const st = STAGE[stageOf(i)]
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => setOpenId(i.id)}>
                    <span className="wk-list-main">
                      <strong>{i.urgent && <AlertTriangle size={14} aria-hidden="true" style={{ color: '#B42318', marginRight: 4, verticalAlign: -2 }} />}{i.title}</strong>
                      <small>{(i.building_address || '').split(' · ')[0]}{i.ref_number ? ` · #IT-${i.ref_number}` : ''}</small>
                    </span>
                    <span className="rfx-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    <ChevronRight size={18} aria-hidden="true" className="wk-chev" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rfx-card wk-card">
        <h2 className="wk-h2">Archivio fatture</h2>
        <InvoiceList invoices={invoices} loading={files === null} list={list} onOpenTicket={setOpenId} onPay={setPaying} demo={demo} />
      </section>

      {paying && <PaySheet f={paying} onClose={() => setPaying(null)} onSaved={async () => { setPaying(null); await loadFiles() }} />}
    </>
  )
}

function Kpi({ icon: Icon, value, label }) {
  return (
    <div className="wk-kpi">
      <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

function Ticket({ i, m, demo, onBack, onManage, onChat, onPay }) {
  const st = STAGE[stageOf(i)]
  const quoted = i.quote_cents != null
  const billed = m.billed || i.invoice_cents || 0
  const fullyPaid = billed > 0 && m.paid >= billed
  const steps = [
    { label: 'Richiesta ricevuta', sub: new Date(i.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }), done: true },
    { label: quoted ? 'Preventivo inviato' : 'Preventivo', sub: quoted ? euro(i.quote_cents) : 'Non ancora inviato', done: quoted },
    {
      label: i.status === 'done' ? 'Intervento eseguito' : i.status === 'scheduled' ? 'Intervento programmato' : 'Da programmare',
      sub: [i.scheduled_date ? fmtDay(i.scheduled_date) : i.proposed_date ? `Proposto ${fmtDay(i.proposed_date)}` : null, i.tech_name ? `Tecnico: ${i.tech_name}` : null].filter(Boolean).join(' · ') || 'Proponi un appuntamento',
      done: i.status === 'scheduled' || i.status === 'done',
    },
    { label: 'Verifica e chiusura', sub: i.completed_at ? `Completato il ${new Date(i.completed_at).toLocaleDateString('it-IT')}` : 'Da completare', done: i.status === 'done' },
    { label: 'Fatturazione e pagamento', sub: billed ? (fullyPaid ? 'Pagato' : `Fatturato ${euro(billed)}`) : 'Nessuna fattura', done: fullyPaid },
  ]
  const current = steps.findIndex((s) => !s.done)

  return (
    <section className="rfx-card wk-card">
      <button type="button" className="wk-back" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Lavori</button>
      <small className="wk-ref">{i.ref_number ? `Intervento #IT-${i.ref_number}` : 'Intervento'}</small>
      <h1 className="rfx-h1" style={{ margin: '2px 0 4px' }}>{i.title}</h1>
      <p className="wk-addr"><MapPin size={15} aria-hidden="true" />{i.building_address}{i.location ? ` · ${i.location}` : ''}</p>
      <div className="wk-tags">
        <span className="rfx-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
        {i.urgent && <span className="wk-urgent">Priorità alta</span>}
      </div>

      <h2 className="wk-h2" style={{ marginTop: 18 }}>Avanzamento intervento</h2>
      <ol className="wk-steps">
        {steps.map((s, n) => (
          <li key={s.label} className={s.done ? 'is-done' : n === current ? 'is-current' : ''}>
            <span className="wk-step-n">{s.done ? <CircleCheck size={18} aria-hidden="true" /> : n + 1}</span>
            <div><b>{s.label}</b><small>{s.sub}</small></div>
          </li>
        ))}
      </ol>

      <div className="wk-money">
        <div><span>{billed ? 'Importo fatturato' : 'Importo preventivato'}</span><b>{euro(billed || i.quote_cents) || '€ 0,00'}</b></div>
        <div className={fullyPaid ? 'is-ok' : ''}><span>Pagamento ricevuto</span><b>{euro(m.paid) || '€ 0,00'}</b></div>
      </div>

      <div className="wk-actions">
        <button type="button" className="rfx-btn is-primary" onClick={onManage} disabled={demo}><Wrench size={17} aria-hidden="true" />Aggiorna lavoro</button>
        <button type="button" className="rfx-btn" onClick={onChat} disabled={demo || !i.thread_id}><MessageCircle size={17} aria-hidden="true" />Apri chat{i.message_count ? ` (${i.message_count})` : ''}</button>
      </div>
      <p className="rfx-muted" style={{ marginTop: 8 }}>In chat scrivi con chi ha aperto l&apos;intervento e con l&apos;amministrazione del condominio.</p>

      <h2 className="wk-h2" style={{ marginTop: 18 }}>Fatture</h2>
      <InvoiceList invoices={m.invoices} loading={false} list={[i]} onPay={onPay} demo={demo} compact />
    </section>
  )
}

function InvoiceList({ invoices, loading, list, onOpenTicket, onPay, demo, compact }) {
  const byId = Object.fromEntries(list.map((x) => [x.id, x]))
  async function openDoc(d) {
    const w = window.open('', '_blank')
    const { data } = await createClient().storage.from('intervention-files').createSignedUrl(d.file_path, 300)
    if (data?.signedUrl && w) w.location.replace(data.signedUrl); else w?.close()
  }
  if (loading) return <p className="rfx-muted">Caricamento…</p>
  if (!invoices.length) {
    return <p className="rfx-muted">{compact ? 'Nessuna fattura caricata: la carichi da "Aggiorna lavoro".' : 'Nessuna fattura. Le carichi dalla scheda di ogni intervento, in "Aggiorna lavoro".'}</p>
  }
  return (
    <ul className="wk-inv">
      {invoices.map((f) => {
        const i = byId[f.intervention_id]
        const due = Math.max(0, (f.amount_cents || 0) - (f.paid_cents || 0))
        const paid = f.amount_cents != null && due === 0 && f.paid_cents != null
        return (
          <li key={f.id}>
            <span className="wk-inv-ico"><Receipt size={18} aria-hidden="true" /></span>
            <button type="button" className="wk-inv-main" onClick={() => openDoc(f)}>
              <strong>{euro(f.amount_cents) || 'Fattura'}</strong>
              <small>{f.file_name} · {new Date(f.created_at).toLocaleDateString('it-IT')}{!compact && i ? ` · ${i.title}` : ''}</small>
            </button>
            <span className="wk-inv-side">
              <span className={`wk-pill ${paid ? 'is-ok' : f.paid_cents ? 'is-part' : 'is-due'}`}>{paid ? 'Pagata' : f.paid_cents ? `Mancano ${euro(due)}` : 'Da incassare'}</span>
              {!demo && <button type="button" className="rfx-link" onClick={() => onPay(f)}>{f.paid_cents != null ? 'Modifica' : 'Registra pagamento'}</button>}
              {!compact && i && onOpenTicket && <button type="button" className="rfx-link" onClick={() => onOpenTicket(i.id)}>Ticket</button>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PaySheet({ f, onClose, onSaved }) {
  const [v, setV] = useState(((f.paid_cents ?? f.amount_cents ?? 0) / 100).toFixed(2).replace('.', ','))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function save(clear = false) {
    const cents = clear ? null : Math.round(Number(String(v).replace(/\./g, '').replace(',', '.')) * 100)
    if (!clear && !(cents >= 0)) { setErr('Scrivi un importo valido.'); return }
    setBusy(true); setErr(null)
    const { error } = await createClient().rpc('set_invoice_paid', { p_file: f.id, p_cents: cents })
    setBusy(false)
    if (error) { setErr('Non sono riuscito a salvare. Riprova.'); return }
    onSaved()
  }
  return (
    <div className="sx-overlay" role="dialog" aria-modal="true" aria-label="Pagamento ricevuto" onClick={onClose}>
      <div className="sx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sx-sheet-head"><h3>Pagamento ricevuto</h3></div>
        <p>Fattura {euro(f.amount_cents)} · {f.file_name}. Quanto ti ha pagato il condominio?</p>
        <label className="wk-amount"><Banknote size={18} aria-hidden="true" /><input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Importo pagato in euro" /><span>€</span></label>
        {err && <p className="sx-err">{err}</p>}
        <button type="button" className="sx-btn is-main is-wide" disabled={busy} onClick={() => save(false)}>{busy ? 'Salvo…' : 'Salva pagamento'}</button>
        {f.paid_cents != null && <button type="button" className="sx-link" onClick={() => save(true)} disabled={busy}>Segna come non pagata</button>}
      </div>
    </div>
  )
}
