'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowRight, ArrowUpDown, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, ChartColumn, CheckCircle2, ChevronRight, ClipboardList, FireExtinguisher, Flame, Phone, Plus, RotateCcw, ShieldCheck, Sparkles, TriangleAlert, Users, Wrench, Zap } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useMaintenance, URGENCY } from '@/hooks/useMaintenance'
import Sheet from '@/components/condo/admin/Sheet'
import BoardPage from '@/components/condo/BoardPage'
import { maintenanceCategoryLabel } from '@/lib/maintenanceCategories'

// Manutenzione programmata ed emergenze: scadenze di legge (fermaposto che
// l'amministratore approva per programmarle per tutti) e segnalazioni
// smistate per urgenza con il fornitore suggerito.

const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const todayIso = () => new Date().toISOString().slice(0, 10)
const daysTo = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(todayIso() + 'T00:00:00')) / 86400000)
const every = (m) => (m % 12 === 0 ? (m === 12 ? 'ogni anno' : `ogni ${m / 12} anni`) : `ogni ${m} mesi`)

const TABS = [
  ['calendario', 'Calendario', CalendarDays],
  ['segnalazioni', 'Segnalazioni', TriangleAlert],
  ['fornitori', 'Fornitori', Users],
  ['panoramica', 'Panoramica', ChartColumn],
]

export default function MaintenancePage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(building.id)
  const m = useMaintenance(building.id, isCondoAdmin)
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = TABS.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : 'calendario'
  const setTab = (t) => router.replace(`${pathname}${t === 'calendario' ? '' : `?tab=${t}`}`, { scroll: false })
  const [open, setOpen] = useState(() => sp.get('item'))
  const [plan, setPlan] = useState(0)
  // ?item= anche quando arriva dal calendario della stessa pagina
  const itemParam = sp.get('item')
  const [lastItem, setLastItem] = useState(itemParam)
  if (itemParam !== lastItem) { setLastItem(itemParam); if (itemParam) setOpen(itemParam) }

  if (!roleLoading && !isCondoAdmin) {
    return (
      <div className="acc-wrap" style={{ maxWidth: 760 }}>
        <Link href={base} className="acc-back">‹ Torna al condominio</Link>
        <div className="acc-card"><div className="acc-empty"><Wrench size={28} aria-hidden="true" /><strong>Solo per l&apos;amministratore</strong><p>Le manutenzioni programmate compaiono nel calendario del condominio.</p></div></div>
      </div>
    )
  }

  const openTickets = m.tickets.length
  const item = open ? m.items.find((x) => x.id === open) : null

  return (
    <div className="acc-wrap mnt-wrap" style={{ maxWidth: 1180 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header style={{ marginBottom: 14 }}>
        <h1 className="acc-h1">Manutenzione</h1>
        <p className="rc-muted" style={{ margin: 0 }}>Programmate, emergenze e scadenze di legge.</p>
      </header>

      <div className="mnt-tabs" role="tablist">
        {TABS.map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            <Icon size={18} aria-hidden="true" />{l}
            {k === 'segnalazioni' && openTickets > 0 && <span className="mnt-badge">{openTickets}</span>}
          </button>
        ))}
      </div>

      {m.error && <p className="acc-msg" style={{ color: '#B42318' }}>{m.error}</p>}

      {tab === 'calendario' && (
        <>
          <CondorBanner m={m} onTickets={() => setTab('segnalazioni')} />
          <div className="acc-card mnt-cal">
            <BoardPage buildingId={building.id} embedded createSignal={plan} createType="maintenance" />
          </div>
          <NextDeadlines m={m} onOpen={setOpen} onAll={() => setTab('panoramica')} />
          <div className="mnt-actions">
            <Link href={`${base}/bacheca`} className="acc-btn is-primary"><Plus size={18} aria-hidden="true" />Nuova segnalazione</Link>
            <button type="button" className="acc-btn" onClick={() => setPlan((n) => n + 1)}><CalendarPlus size={18} aria-hidden="true" />Pianifica manutenzione</button>
          </div>
        </>
      )}
      {tab === 'segnalazioni' && (m.loading ? <p className="rc-muted">Caricamento…</p> : <Tickets m={m} />)}
      {tab === 'fornitori' && (m.loading ? <p className="rc-muted">Caricamento…</p> : <Suppliers m={m} base={base} />)}
      {tab === 'panoramica' && (m.loading ? <p className="rc-muted">Caricamento…</p> : <><Overview m={m} /><Deadlines m={m} onOpen={setOpen} /></>)}

      {item && <ScheduleSheet item={item} m={m} onClose={() => setOpen(null)} />}
    </div>
  )
}

// Icona e colore per tipo di scadenza
const KIND_STYLE = {
  lift: { Icon: ArrowUpDown, color: 'var(--teal-dk)', bg: 'var(--teal-lt)' },
  heating: { Icon: Flame, color: '#C4320A', bg: '#FEF0C7' },
  extinguishers: { Icon: FireExtinguisher, color: '#B42318', bg: '#FEE4E2' },
  fire: { Icon: ShieldCheck, color: '#067647', bg: '#ECFDF3' },
  earthing: { Icon: Zap, color: '#6941C6', bg: '#F4F3FF' },
}
const kindStyle = (kind) => KIND_STYLE[
  kind.startsWith('lift') ? 'lift' : kind.startsWith('heating') ? 'heating' : kind === 'extinguishers' ? 'extinguishers' : kind.startsWith('fire') ? 'fire' : 'earthing']
const SHORT = {
  lift_maintenance: ['Ascensore', 'Manutenzione semestrale'], lift_inspection: ['Ascensore', 'Verifica periodica'],
  heating_maintenance: ['Caldaia', 'Manutenzione annuale'], heating_efficiency: ['Caldaia', 'Controllo di efficienza'],
  extinguishers: ['Estintori', 'Controllo semestrale'], fire_hydrants: ['Antincendio', 'Idranti e naspi'],
  fire_doors: ['Antincendio', 'Porte tagliafuoco'], fire_cpi: ['Antincendio', 'Rinnovo CPI'], earthing: ['Impianto elettrico', 'Messa a terra'],
}

function dueChip(x) {
  if (x.status === 'scheduled') return { text: `Il ${new Date(x.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`, cls: 'is-ok' }
  const d = daysTo(x.next_due)
  if (d < 0) return { text: `Scaduta da ${-d} ${d === -1 ? 'giorno' : 'giorni'}`, cls: 'is-late' }
  if (d === 0) return { text: 'Oggi', cls: 'is-late' }
  return { text: `Tra ${d} ${d === 1 ? 'giorno' : 'giorni'}`, cls: d <= 30 ? 'is-soon' : 'is-later' }
}

function CondorBanner({ m, onTickets }) {
  const toTriage = m.tickets.filter((t) => t.triaged_by !== 'ai' && t.triaged_by !== 'admin').length
  return (
    <div className="mnt-condor">
      <span className="mnt-condor-icon"><Sparkles size={24} aria-hidden="true" /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong>Condor AI</strong>
        <p>Smista le segnalazioni, propone il fornitore più adatto e ti ricorda le scadenze di legge.</p>
      </div>
      {toTriage > 0 && <button type="button" className="acc-btn" onClick={onTickets}>Smista {toTriage}</button>}
    </div>
  )
}

function NextDeadlines({ m, onOpen, onAll }) {
  const list = m.items
    .filter((x) => x.status === 'placeholder' || x.status === 'scheduled')
    .sort((a, b) => (a.scheduled_date || a.next_due).localeCompare(b.scheduled_date || b.next_due))
    .slice(0, 4)
  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Prossime scadenze obbligatorie</h2>
        <button type="button" onClick={onAll} className="mnt-link">Vedi tutte <ArrowRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="acc-card" style={{ padding: 0 }}>
        {m.loading ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Caricamento…</p> : list.length === 0 ? (
          <div className="acc-empty"><CheckCircle2 size={28} aria-hidden="true" /><strong>Nessuna scadenza aperta</strong></div>
        ) : (
          <ul className="ppl-list mnt-due">
            {list.map((x) => {
              const st = kindStyle(x.kind)
              const [name, what] = SHORT[x.kind] || [x.title, '']
              const chip = dueChip(x)
              return (
                <li key={x.id} className="is-link">
                  <button type="button" className="ppl-row-link" onClick={() => onOpen(x.id)} aria-label={`Apri ${x.title}`} style={{ background: 'none', border: 'none', padding: 0 }} />
                  <span className="mnt-kind" style={{ background: st.bg, color: st.color, border: x.status === 'placeholder' ? `1.5px dashed ${st.color}` : 'none' }}><st.Icon size={22} aria-hidden="true" /></span>
                  <span className="ppl-main">
                    <strong>{name}</strong>
                    <small>{what}{x.legal_basis ? ` (${x.legal_basis.split(',')[0].split(' e ')[0]})` : ''}</small>
                  </span>
                  <span className={`mnt-chip ${chip.cls}`}>{chip.text}</span>
                  <ChevronRight size={18} aria-hidden="true" className="ppl-chev" style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function Suppliers({ m, base }) {
  return (
    <>
      <div className="acc-card" style={{ padding: 0 }}>
        {m.suppliers.length === 0 ? (
          <div className="acc-empty"><Users size={28} aria-hidden="true" /><strong>Nessun fornitore in rubrica</strong><p>Aggiungili per ricevere da Condor la ditta giusta per ogni segnalazione e scadenza.</p></div>
        ) : (
          <ul className="ppl-list">
            {m.suppliers.map((s) => (
              <li key={s.id}>
                <span className="ppl-avatar"><Wrench size={18} aria-hidden="true" /></span>
                <span className="ppl-main">
                  <strong>{s.company || s.name}</strong>
                  <small>{[maintenanceCategoryLabel(s.category), s.company && s.name !== s.company ? s.name : null].filter(Boolean).join(' · ')}</small>
                </span>
                {s.phone && <a className="acc-btn" href={`tel:${s.phone.replace(/\s/g, '')}`} aria-label={`Chiama ${s.company || s.name}`}><Phone size={15} aria-hidden="true" />Chiama</a>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={`${base}/fornitori-condominio`} className="mnt-link" style={{ marginTop: 12, display: 'inline-flex' }}>Contratti, DURC e polizze <ArrowRight size={16} aria-hidden="true" /></Link>
    </>
  )
}

function Overview({ m }) {
  const active = m.items.filter((x) => x.status === 'placeholder' || x.status === 'scheduled')
  const overdue = active.filter((x) => x.status === 'placeholder' && x.next_due < todayIso()).length
  const soon = active.filter((x) => x.status === 'placeholder' && x.next_due >= todayIso() && daysTo(x.next_due) <= 30).length
  const scheduled = active.filter((x) => x.status === 'scheduled').length
  const year = String(new Date().getFullYear())
  const doneYear = m.items.filter((x) => x.status === 'done' && (x.done_at || '').startsWith(year)).length
  const urgent = m.tickets.filter((t) => t.urgency === 'emergency' || t.urgency === 'high').length
  const kpis = [
    ['Scadenze superate', overdue, overdue ? '#B42318' : null],
    ['In scadenza entro 30 giorni', soon, soon ? '#B54708' : null],
    ['Programmate', scheduled, null],
    [`Fatte nel ${year}`, doneYear, null],
    ['Segnalazioni aperte', m.tickets.length, null],
    ['Urgenti o emergenze', urgent, urgent ? '#B42318' : null],
  ]
  return (
    <div className="mnt-kpis">
      {kpis.map(([l, v, c]) => (
        <div key={l} className="acc-card mnt-kpi"><b style={c ? { color: c } : undefined}>{v}</b><small>{l}</small></div>
      ))}
    </div>
  )
}

function StatusLine({ x }) {
  if (x.status === 'scheduled') {
    const late = x.scheduled_date < todayIso()
    return <span style={{ color: late ? '#B54708' : 'var(--teal-dk)', fontWeight: 700 }}>{late ? 'Da confermare: era il ' : 'Programmata il '}{fmt(x.scheduled_date)}{x.time_start ? ` alle ${x.time_start.slice(0, 5)}` : ''}</span>
  }
  if (x.status === 'done') return <span className="rc-muted">Fatta il {fmt(x.done_at)}</span>
  if (x.status === 'dismissed') return <span className="rc-muted">Non presente in questo condominio</span>
  const d = daysTo(x.next_due)
  const color = d < 0 ? '#B42318' : d <= 30 ? '#B54708' : 'var(--text-3)'
  return (
    <span style={{ color, fontWeight: 700 }}>
      {d < 0 ? `Scaduta il ${fmt(x.next_due)}` : `Entro il ${fmt(x.next_due)}`}
      {!x.last_done_known && <span className="rc-muted" style={{ fontWeight: 500 }}> · data provvisoria: indica l&apos;ultima volta</span>}
    </span>
  )
}

function Deadlines({ m, onOpen }) {
  const groups = useMemo(() => ({
    active: m.items.filter((x) => x.status === 'placeholder' || x.status === 'scheduled'),
    done: m.items.filter((x) => x.status === 'done').slice(0, 10),
    dismissed: m.items.filter((x) => x.status === 'dismissed'),
  }), [m.items])
  const [showOther, setShowOther] = useState(false)

  return (
    <>
      <p className="rc-muted" style={{ fontSize: 13.5, margin: '0 0 12px' }}>
        Le scadenze in attesa sono già nel tuo calendario come fermaposto tratteggiati, visibili solo a te. Quando ne approvi una con data e ditta, diventa un evento per tutti e i condomini ricevono l&apos;avviso. Ti mandiamo un promemoria 30 giorni prima.
      </p>
      <div className="acc-card" style={{ padding: 0 }}>
        {groups.active.length === 0 ? (
          <div className="acc-empty"><CheckCircle2 size={28} aria-hidden="true" /><strong>Nessuna scadenza aperta</strong></div>
        ) : (
          <ul className="ppl-list">
            {groups.active.map((x) => (
              <li key={x.id} className="is-link">
                <button type="button" className="ppl-row-link" onClick={() => onOpen(x.id)} aria-label={`Apri ${x.title}`} style={{ background: 'none', border: 'none', padding: 0 }} />
                <span className="ppl-avatar" style={x.status === 'placeholder' ? { background: 'transparent', border: '1.5px dashed var(--teal)' } : undefined}>
                  {x.status === 'scheduled' ? <CalendarCheck size={19} aria-hidden="true" /> : <CalendarClock size={19} aria-hidden="true" />}
                </span>
                <span className="ppl-main">
                  <strong>{x.title}</strong>
                  <small><StatusLine x={x} /></small>
                  <small>{[x.legal_basis, every(x.frequency_months), x.maintainer_name || (x.suggested_maintainer_name ? `ditta suggerita: ${x.suggested_maintainer_name}` : null)].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="acc-btn" style={{ flexShrink: 0, pointerEvents: 'none' }}>{x.status === 'placeholder' ? 'Approva' : 'Gestisci'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(groups.done.length > 0 || groups.dismissed.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <button type="button" onClick={() => setShowOther(!showOther)} aria-expanded={showOther}
            style={{ minHeight: 0, padding: 0, border: 'none', background: 'none', font: 'inherit', fontWeight: 800, color: 'var(--teal-dk)', cursor: 'pointer' }}>
            {showOther ? '▾' : '▸'} Fatte e non presenti
          </button>
          {showOther && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 8 }}>
              {[...groups.done, ...groups.dismissed].map((x) => (
                <li key={x.id} className="acc-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                  <span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 14.5 }}>{x.title}</strong><small><StatusLine x={x} /></small></span>
                  {x.status === 'dismissed' && (
                    <button type="button" className="acc-btn" onClick={() => m.dismiss(x.id, false)}><RotateCcw size={15} aria-hidden="true" />Ripristina</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function ScheduleSheet({ item: x, m, onClose }) {
  const [v, setV] = useState({
    date: x.scheduled_date || (x.next_due >= todayIso() ? x.next_due : todayIso()),
    start: x.time_start?.slice(0, 5) || '', end: x.time_end?.slice(0, 5) || '',
    maintainer: x.maintainer_id || x.suggested_maintainer_id || '', notes: '',
  })
  const [last, setLast] = useState(x.last_done || '')
  const [doneDate, setDoneDate] = useState(x.scheduled_date && x.scheduled_date <= todayIso() ? x.scheduled_date : todayIso())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function run(fn) {
    setBusy(true); setErr(null)
    const r = await fn()
    setBusy(false)
    if (r?.error) setErr(r.error)
    else onClose()
  }

  return (
    <Sheet title={x.title} kicker={x.status === 'placeholder' ? 'Fermaposto da approvare' : 'Manutenzione programmata'} onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <p className="rc-muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45 }}>
          {x.legal_basis} · {every(x.frequency_months)}{x.note ? `. ${x.note}` : ''}
        </p>

        {x.status === 'placeholder' && (
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="acc-label">Ultima volta che è stata fatta</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={last} max={todayIso()} onChange={(e) => setLast(e.target.value)} className="acc-input" style={{ flex: 1 }} />
              <button type="button" className="acc-btn" disabled={!last || busy} onClick={() => run(() => m.setLastDone(x.id, last))}>Ricalcola</button>
            </div>
            <small className="rc-muted">La prossima scadenza si calcola da qui. Senza questa data il fermaposto è provvisorio.</small>
          </div>
        )}

        <fieldset style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, margin: 0, display: 'grid', gap: 10 }}>
          <legend style={{ fontWeight: 800, padding: '0 6px' }}>{x.status === 'placeholder' ? 'Approva e programma per tutti' : 'Riprogramma'}</legend>
          <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Giorno</span>
            <input type="date" value={v.date} min={todayIso()} onChange={(e) => setV({ ...v, date: e.target.value })} className="acc-input" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Dalle</span><input type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} className="acc-input" /></label>
            <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Alle</span><input type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} className="acc-input" /></label>
          </div>
          <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Ditta</span>
            <select value={v.maintainer} onChange={(e) => setV({ ...v, maintainer: e.target.value })} className="acc-input">
              <option value="">Da definire</option>
              {m.suppliers.map((s) => <option key={s.id} value={s.id}>{s.company || s.name}{s.id === x.suggested_maintainer_id ? ' (suggerita)' : ''}</option>)}
            </select>
            {m.suppliers.length === 0 && <small className="rc-muted">Aggiungi le ditte in Fornitori e contratti per averle qui.</small>}
          </label>
          <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Nota per i condomini (facoltativa)</span>
            <input value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={300} placeholder="Es. ascensore fermo dalle 9 alle 12" className="acc-input" /></label>
          <button type="button" className="acc-btn is-primary" disabled={!v.date || busy} onClick={() => run(() => m.schedule(x.id, v))}>
            <CalendarCheck size={16} aria-hidden="true" />{x.status === 'placeholder' ? 'Approva e avvisa tutti' : 'Salva e avvisa tutti'}
          </button>
        </fieldset>

        {(x.status === 'scheduled' || x.status === 'placeholder') && (
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="acc-label">Già fatta</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={doneDate} max={todayIso()} onChange={(e) => setDoneDate(e.target.value)} className="acc-input" style={{ flex: 1 }} />
              <button type="button" className="acc-btn" disabled={!doneDate || busy} onClick={() => run(() => m.complete(x.id, doneDate))}><CheckCircle2 size={16} aria-hidden="true" />Segna fatta</button>
            </div>
            <small className="rc-muted">Chiude questa scadenza e mette il fermaposto della prossima.</small>
          </div>
        )}

        {err && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14 }}>{err}</p>}
        <button type="button" className="acc-btn" disabled={busy} onClick={() => run(() => m.dismiss(x.id, true))} style={{ justifySelf: 'start' }}>
          Non presente in questo condominio
        </button>
      </div>
    </Sheet>
  )
}

function Tickets({ m }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [edit, setEdit] = useState(null)

  async function condor() {
    setBusy(true); setNote(null)
    const r = await m.triageWithCondor()
    setBusy(false)
    setNote(r.error ? { error: r.error } : { ok: r.updated ? `Condor ha smistato ${r.updated} ${r.updated === 1 ? 'segnalazione' : 'segnalazioni'}.` : 'Niente da smistare.' })
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
        <p className="rc-muted" style={{ fontSize: 13.5, margin: 0, flex: '1 1 260px' }}>
          Ogni segnalazione viene smistata appena arriva; le emergenze ti arrivano subito come notifica. Condor può rileggerle e proporre la ditta giusta.
        </p>
        <button type="button" className="acc-btn is-primary" disabled={busy || m.tickets.length === 0} onClick={condor}><Sparkles size={16} aria-hidden="true" />{busy ? 'Condor sta leggendo…' : 'Smista con Condor'}</button>
      </div>
      {note && <p className="acc-msg" style={note.error ? { color: '#B42318' } : undefined}>{note.error || note.ok}</p>}

      {m.tickets.length === 0 ? (
        <div className="acc-card"><div className="acc-empty"><ClipboardList size={28} aria-hidden="true" /><strong>Nessuna segnalazione aperta</strong></div></div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {m.tickets.map((t) => {
            const u = URGENCY[t.urgency] || URGENCY.normal
            return (
              <li key={t.id} className="acc-card" style={{ padding: 14, borderLeft: `4px solid ${u.color}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: u.color, background: u.bg, borderRadius: 999, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {t.urgency === 'emergency' && <AlertTriangle size={13} aria-hidden="true" />}{u.label}
                  </span>
                  <small className="rc-muted">{t.triaged_by === 'ai' ? 'smistata da Condor' : t.triaged_by === 'admin' ? 'impostata da te' : 'smistata in automatico'} · {new Date(t.created_at).toLocaleDateString('it-IT')}{t.author ? ` · ${t.author}` : ''}</small>
                </div>
                <strong style={{ display: 'block', fontSize: 15.5 }}>{t.title}</strong>
                {t.description && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{t.description.length > 280 ? `${t.description.slice(0, 280)}…` : t.description}</p>}
                {t.urgency_reason && <p className="rc-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{t.urgency_reason}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                  {t.suggested_maintainer_name ? (
                    <span style={{ fontSize: 13.5 }}><Wrench size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Ditta: <strong>{t.suggested_maintainer_name}</strong></span>
                  ) : <span className="rc-muted" style={{ fontSize: 13.5 }}>Nessuna ditta adatta in rubrica</span>}
                  {t.suggested_maintainer_phone && <a className="acc-btn" href={`tel:${t.suggested_maintainer_phone.replace(/\s/g, '')}`}><Phone size={15} aria-hidden="true" />Chiama</a>}
                  <button type="button" className="acc-btn" onClick={() => setEdit(edit === t.id ? null : t.id)}>Modifica</button>
                  <button type="button" className="acc-btn" onClick={() => m.closeTicket(t.id)}><CheckCircle2 size={15} aria-hidden="true" />Risolta</button>
                </div>
                {edit === t.id && <TriageEditor t={t} m={m} onDone={() => setEdit(null)} />}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function TriageEditor({ t, m, onDone }) {
  const [urgency, setUrgency] = useState(t.urgency || 'normal')
  const [maint, setMaint] = useState(t.suggested_maintainer_id || '')
  const [err, setErr] = useState(null)
  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
      <label style={{ display: 'grid', gap: 4 }}><span className="acc-label">Urgenza</span>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="acc-input">
          {Object.entries(URGENCY).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
        </select></label>
      <label style={{ display: 'grid', gap: 4, flex: '1 1 180px' }}><span className="acc-label">Ditta</span>
        <select value={maint} onChange={(e) => setMaint(e.target.value)} className="acc-input">
          <option value="">Nessuna</option>
          {m.suppliers.map((s) => <option key={s.id} value={s.id}>{s.company || s.name}</option>)}
        </select></label>
      <button type="button" className="acc-btn is-primary" onClick={async () => { const r = await m.setTriage(t.id, urgency, maint); if (r.error) setErr(r.error); else onDone() }}>Salva</button>
      {err && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14, width: '100%' }}>{err}</p>}
    </div>
  )
}
