'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, CalendarClock, MapPin, MessageCircle, Pencil, CircleCheck, Wrench, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { getMySupplier, saveMySupplier } from '@/lib/suppliers'
import { maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import { INTERVENTION_STATUS } from '@/hooks/useInterventions'
import { useThreadMessages } from '@/hooks/useCondoThreads'
import SupplierProfileForm from '@/components/suppliers/SupplierProfileForm'
import InterventionFiles from '@/components/suppliers/InterventionFiles'
import ChatThreadView from '@/components/condo/chat/ChatThreadView'
import { Sheet } from '@/components/condo/InterventionsPage'
import { useViewAs } from '@/hooks/useViewAs'

// Anteprima "vedi come Recofixer" per l'admin del sito senza profilo fornitore
const DEMO_SUPPLIER = { company_name: 'Idraulica Esempio srl', verified: true, categories: ['plumbing', 'heating'] }
const demoDay = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const DEMO_ITEMS = [
  { id: 'demo-1', title: 'Perdita colonna acqua scala B', status: 'requested', category: 'plumbing', building_address: 'Via Ripamonti 120, Milano', location: 'Scala B, 3° piano', requester: 'Amministrazione', ref_number: 1042, description: 'Macchia di umidità sul soffitto del pianerottolo, probabile perdita dalla colonna.', thread_id: null },
  { id: 'demo-2', title: 'Manutenzione caldaia centralizzata', status: 'scheduled', category: 'heating', building_address: 'Via Tortona 8, Milano', location: 'Locale caldaia', requester: 'Giulia B.', ref_number: 1038, scheduled_date: demoDay(3), time_start: '09:00:00', thread_id: null },
  { id: 'demo-3', title: 'Sostituzione rubinetto cortile', status: 'done', category: 'plumbing', building_address: 'Via Ripamonti 120, Milano', requester: 'Marco C.', ref_number: 1012, completion_notes: 'Sostituito rubinetto a sfera, garanzia 24 mesi.', thread_id: null },
]

const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const hhmm = (t) => (t ? t.slice(0, 5) : '')

// Area del Recofixer: profilo attività e interventi in cui è stato scelto.
export default function SupplierDashboard() {
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id
  const [supplier, setSupplier] = useState(undefined)
  const [items, setItems] = useState(null)
  const [tab, setTab] = useState('todo')
  const [open, setOpen] = useState(null)
  const [chat, setChat] = useState(null)
  const [editing, setEditing] = useState(false)
  const { viewAs } = useViewAs()

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc('supplier_interventions')
    if (!error) setItems(data || [])
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!userId) { setSupplier(null); return }
    getMySupplier(userId).then((s) => { setSupplier(s); if (s) load() })
  }, [ready, userId, load])

  if (!ready || supplier === undefined) return <Wrap><p style={muted}>Caricamento...</p></Wrap>
  if (!userId) {
    return (
      <Wrap>
        <h1 style={h1}>Area Recofixer</h1>
        <p style={muted}>Accedi per vedere gli interventi dei condomini che ti hanno scelto.</p>
        <button type="button" style={primary} onClick={() => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: '/fornitore' } }))}>Accedi</button>
      </Wrap>
    )
  }
  const demo = viewAs === 'recofixer' && !supplier && !editing
  if (demo) return <SupplierView supplier={DEMO_SUPPLIER} items={DEMO_ITEMS} demo tab={tab} setTab={setTab} open={open} setOpen={setOpen} onChat={() => {}} onEdit={() => {}} />
  if (!supplier || editing) {
    return (
      <Wrap>
        <h1 style={h1}>{supplier ? 'Modifica il profilo' : 'Diventa Recofixer'}</h1>
        {!supplier && <p style={muted}>Crea il profilo della tua attività: i condomini potranno trovarti, sceglierti per i loro interventi e scriverti in chat.</p>}
        <SupplierProfileForm initial={supplier} submitLabel={supplier ? 'Salva' : 'Crea profilo'} onCancel={supplier ? () => setEditing(false) : undefined}
          onSubmit={async (v) => {
            const r = await saveMySupplier(userId, v, !!supplier)
            if (r.error) return r.error
            setSupplier(await getMySupplier(userId)); setEditing(false); load()
            return null
          }} />
      </Wrap>
    )
  }

  if (chat) return <SupplierChat item={chat} onBack={() => { setChat(null); load() }} />

  return (
    <SupplierView supplier={supplier} items={items} tab={tab} setTab={setTab} open={open} setOpen={setOpen}
      onChat={setChat} onEdit={() => setEditing(true)}
      onChanged={async () => { const { data } = await createClient().rpc('supplier_interventions'); setItems(data || []); setOpen((data || []).find((x) => x.id === open?.id) || null) }} />
  )
}

function SupplierView({ supplier, items, tab, setTab, open, setOpen, onChat, onEdit, onChanged, demo = false }) {
  const todo = (items || []).filter((i) => i.status === 'requested' || i.status === 'scheduled')
  const done = (items || []).filter((i) => i.status === 'done' || i.status === 'cancelled')
  const list = tab === 'todo' ? todo : done
  const setChat = onChat
  const setEditing = () => onEdit()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '22px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {demo && (
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#5B21B6', borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.45 }}>
          <strong>Anteprima con dati di esempio.</strong> Non hai un profilo Recofixer, quindi vedi interventi finti: le azioni non salvano nulla.
        </div>
      )}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={26} strokeWidth={1.9} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.company_name}</span>
            {supplier.verified && <BadgeCheck size={18} strokeWidth={2} aria-label="Verificato" style={{ color: 'var(--teal)', flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Recofixer · {supplier.categories.map(maintenanceCategoryLabel).join(', ')}</div>
        </div>
        <button type="button" onClick={() => setEditing(true)} aria-label="Modifica profilo" style={{ minHeight: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Pencil size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <h1 style={{ ...h1, fontSize: 26 }}>I miei interventi</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14 }}>
        {[['todo', `Da fare (${todo.length})`], ['done', `Chiusi (${done.length})`]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ minHeight: 0, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14,
            background: tab === k ? 'var(--teal)' : 'transparent', color: tab === k ? '#fff' : 'var(--text-2)' }}>{l}</button>
        ))}
      </div>

      {items === null ? <p style={muted}>Caricamento...</p> : list.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 18px', textAlign: 'center' }}>
          <p style={{ ...muted, margin: 0 }}>{tab === 'todo' ? 'Nessun intervento da fare. Quando un condominio ti sceglie, lo trovi qui.' : 'Nessun intervento chiuso.'}</p>
        </div>
      ) : list.map((i) => <SupplierCard key={i.id} i={i} onOpen={() => setOpen(i)} onChat={() => setChat(i)} />)}

      {open && (
        <SupplierDetail i={open} onClose={() => setOpen(null)} onChat={() => { setOpen(null); setChat(open) }}
          onChanged={demo ? () => {} : onChanged} />
      )}
    </div>
  )
}

function SupplierCard({ i, onOpen, onChat }) {
  const st = INTERVENTION_STATUS[i.status]
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={onOpen} style={{ minHeight: 0, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16.5, fontWeight: 800, flex: 1 }}>{i.title}</span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: st.bg, color: st.tx, flexShrink: 0 }}>{st.label}</span>
        </span>
        <span style={row}><MapPin size={15} aria-hidden="true" />{i.building_address}{i.location ? ` · ${i.location}` : ''}</span>
        <span style={row}><UserRound size={15} aria-hidden="true" />{i.requester || 'Residente'}{i.ref_number ? ` · #IT-${i.ref_number}` : ''}</span>
        {i.scheduled_date && i.status === 'scheduled' && <span style={{ ...row, color: 'var(--teal-dk)', fontWeight: 700 }}><CalendarClock size={15} aria-hidden="true" />{fmtDay(i.scheduled_date)}{i.time_start ? ` · ${hhmm(i.time_start)}` : ''}</span>}
        {i.proposed_date && <span style={{ ...row, color: '#9A5B00', fontWeight: 700 }}><CalendarClock size={15} aria-hidden="true" />Proposta: {fmtDay(i.proposed_date)}{i.proposed_time_start ? ` · ${hhmm(i.proposed_time_start)}` : ''} · in attesa di conferma</span>}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" onClick={onChat} disabled={!i.thread_id} style={{ ...ghost, opacity: i.thread_id ? 1 : 0.5 }}><MessageCircle size={17} aria-hidden="true" /> Chat</button>
        <button type="button" onClick={onOpen} style={{ ...ghost, background: 'var(--teal)', color: '#fff', border: 'none' }}>Gestisci</button>
      </div>
    </div>
  )
}

function SupplierDetail({ i, onClose, onChat, onChanged }) {
  const active = i.status === 'requested' || i.status === 'scheduled'
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)

  async function rpc(fn, args, ok) {
    setBusy(true); setErr(null); setMsg(null)
    const { error } = await createClient().rpc(fn, args)
    setBusy(false)
    if (error) { setErr(/past/.test(error.message) ? 'La data non può essere nel passato.' : 'Operazione non riuscita. Riprova.'); return }
    setMsg(ok)
    onChanged()
  }

  return (
    <Sheet onClose={onClose} title={i.title} subtitle={`${maintenanceCategoryLabel(i.category)} · ${i.building_address}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {i.description && <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{i.description}</p>}
        <button type="button" onClick={onChat} disabled={!i.thread_id} style={{ ...primary, marginTop: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MessageCircle size={19} aria-hidden="true" /> Vai alla chat
        </button>

        {active && (
          <section style={box}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Proponi la data</div>
            {i.status === 'scheduled' && i.scheduled_date && <p style={muted}>Già fissato: {fmtDay(i.scheduled_date)}{i.time_start ? ` alle ${hhmm(i.time_start)}` : ''}. Puoi proporne un&apos;altra.</p>}
            <label style={{ display: 'block' }}><span style={mini}>Giorno</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fld} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
              <label style={{ display: 'block', minWidth: 0 }}><span style={mini}>Dalle</span><input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={fld} /></label>
              <label style={{ display: 'block', minWidth: 0 }}><span style={mini}>Alle (facoltativo)</span><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={fld} /></label>
            </div>
            <button type="button" disabled={!date || busy} onClick={() => rpc('supplier_propose_date', { p_intervention: i.id, p_date: date, p_start: start || null, p_end: end || null }, 'Proposta inviata: il residente la conferma dalla scheda dell\'intervento.')}
              style={{ ...ghost, background: 'var(--teal)', color: '#fff', border: 'none', opacity: date ? 1 : 0.5 }}>Invia proposta</button>
          </section>
        )}

        <section style={box}><InterventionFiles interventionId={i.id} /></section>

        {active ? (
          <section style={box}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Lavoro finito?</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Note per il residente: cosa hai fatto, ricambi, garanzia..." style={{ ...fld, minHeight: 80, resize: 'vertical' }} />
            <button type="button" disabled={busy} onClick={() => { if (confirm('Segnare l\'intervento come completato?')) rpc('supplier_complete', { p_intervention: i.id, p_notes: notes }, 'Intervento completato.') }}
              style={{ ...ghost, background: '#15803D', color: '#fff', border: 'none' }}><CircleCheck size={18} aria-hidden="true" /> Segna completato</button>
          </section>
        ) : i.completion_notes ? (
          <section style={box}><div style={{ fontSize: 15, fontWeight: 800 }}>Note di chiusura</div><p style={{ ...muted, whiteSpace: 'pre-wrap' }}>{i.completion_notes}</p></section>
        ) : null}

        {msg && <p style={{ fontSize: 13.5, color: 'var(--teal-dk)', margin: 0, fontWeight: 600 }}>{msg}</p>}
        {err && <p style={{ fontSize: 13.5, color: '#B42318', margin: 0 }}>{err}</p>}
      </div>
    </Sheet>
  )
}

function SupplierChat({ item, onBack }) {
  const { messages, members, names, userId, send } = useThreadMessages(item.thread_id)
  const others = members.filter((m) => m.user_id !== userId).map((m) => names[m.user_id]?.display_name || 'Residente')
  return (
    <ChatThreadView
      title={`Intervento: ${item.title}`}
      subtitle={others.length ? `Con ${others.join(', ')}` : item.building_address}
      avatar={<span style={{ width: 38, height: 38, borderRadius: '50%', background: '#FDE9DC', color: '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={17} aria-hidden="true" /></span>}
      messages={messages} names={names} userId={userId} onSend={send} onBack={onBack}
    />
  )
}

function Wrap({ children }) {
  return <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 16px 64px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
}

const h1 = { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }
const muted = { fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }
const mini = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }
const row = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--text-3)' }
const box = { display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--white)' }
const fld = { width: '100%', minWidth: 0, boxSizing: 'border-box', height: 46, border: '1px solid var(--border)', borderRadius: 12, padding: '0 10px', fontSize: 16, fontFamily: 'inherit', background: 'var(--white)' }
const primary = { minHeight: 0, height: 52, borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', marginTop: 6 }
const ghost = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 0, height: 44, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }
