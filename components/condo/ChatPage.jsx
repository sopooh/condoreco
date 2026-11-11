'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Building2, Wrench, UserRound, Pin, Plus, Search, X, UserPlus, Check } from 'lucide-react'
import { useCondoChat } from '@/hooks/useCondoChat'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useCondoThreads, useThreadMessages, loadDirectory, markGroupRead } from '@/hooks/useCondoThreads'
import { INTERVENTION_STATUS } from '@/hooks/useInterventions'
import ChatThreadView from '@/components/condo/chat/ChatThreadView'
import { Sheet } from '@/components/condo/InterventionsPage'
import { fuzzyFilter } from '@/lib/fuzzySearch'

// Chat del condominio: elenco conversazioni (gruppo, amministratore,
// interventi, private) e conversazione aperta (?c=gruppo | ?t=<id>).
// ?admin=1 e ?intervento=<id> aprono (o creano) la conversazione giusta.
export default function ChatPage({ building }) {
  return (
    <Suspense fallback={<p style={{ padding: 24, fontSize: 14, color: 'var(--text-3)' }}>Caricamento chat...</p>}>
      <ChatInner building={building} />
    </Suspense>
  )
}

function ChatInner({ building }) {
  const buildingId = building.id
  const base = `/edificio/${buildingId}/condominio/chat`
  const router = useRouter()
  const sp = useSearchParams()
  const threadsApi = useCondoThreads(buildingId)
  const [opening, setOpening] = useState(null)

  const openParam = sp.get('t')
  const groupOpen = sp.get('c') === 'gruppo'
  const adminParam = sp.get('admin')
  const interventoParam = sp.get('intervento')

  // risolve ?admin / ?intervento in una conversazione vera
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!threadsApi.userId) return
      if (adminParam) {
        setOpening('Apro la chat con l\'amministratore...')
        const r = await threadsApi.openAdmin()
        if (!cancelled) { setOpening(r.error); if (r.id) router.replace(`${base}?t=${r.id}`) }
      } else if (interventoParam) {
        setOpening('Apro la chat dell\'intervento...')
        const r = await threadsApi.openIntervention(interventoParam)
        if (!cancelled) { setOpening(r.error); if (r.id) router.replace(`${base}?t=${r.id}`) }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [adminParam, interventoParam, threadsApi.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => { threadsApi.reload(); router.push(base) }

  if (adminParam || interventoParam) {
    return <p style={{ padding: 24, fontSize: 14, color: opening && !opening.endsWith('...') ? '#B42318' : 'var(--text-3)' }}>{opening || 'Caricamento...'}</p>
  }
  if (groupOpen) return <GroupChat building={building} onBack={back} />
  if (openParam) {
    const meta = threadsApi.threads.find((t) => t.thread_id === openParam)
    return <ThreadChat key={openParam} building={building} threadId={openParam} meta={meta} onBack={back} />
  }
  return <Inbox building={building} base={base} {...threadsApi} />
}

/* ─────────────── Elenco conversazioni ─────────────── */

const FILTERS = [
  { id: 'all', label: 'Tutte' },
  { id: 'condo', label: 'Condominio', icon: Users },
  { id: 'direct', label: 'Privati', icon: UserRound },
  { id: 'intervention', label: 'Interventi', icon: Wrench },
]

function Inbox({ building, base, threads, loading, error, openDirect, reload }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [newChat, setNewChat] = useState(false)

  // l'amministratore c'è sempre, anche prima del primo messaggio
  const rows = useMemo(() => {
    const list = [...threads]
    if (!list.some((t) => t.kind === 'admin')) {
      list.push({ thread_id: null, kind: 'admin', title: 'Amministratore', virtual: true, unread: 0 })
    }
    const order = (t) => (t.kind === 'group' ? 0 : t.kind === 'admin' && t.title === 'Amministratore' ? 1 : 2)
    return list.sort((a, b) => order(a) - order(b) || new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
  }, [threads])

  const visible = fuzzyFilter(
    rows.filter((t) => filter === 'all'
      || (filter === 'condo' && (t.kind === 'group' || t.kind === 'admin'))
      || (filter === 'direct' && t.kind === 'direct')
      || (filter === 'intervention' && t.kind === 'intervention')),
    q,
    (t) => [{ text: t.title, weight: 3 }, { text: t.last_message_preview || '', weight: 1 }],
  )

  function open(t) {
    if (t.kind === 'group') router.push(`${base}?c=gruppo`)
    else if (t.virtual) router.push(`${base}?admin=1`)
    else router.push(`${base}?t=${t.thread_id}`)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Link href={`/edificio/${building.id}/condominio`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ flex: 1, fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Chat</h1>
        <button type="button" aria-label="Cerca nelle chat" onClick={() => { setSearching((s) => !s); setQ('') }} style={iconBtn(searching)}>
          <Search size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Nuova chat" onClick={() => setNewChat(true)} style={{ ...iconBtn(false), background: 'var(--teal)', color: '#fff', border: 'none' }}>
          <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      {searching && (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca una chat o un messaggio" type="search"
          style={{ height: 46, borderRadius: 14, border: '1px solid var(--border)', padding: '0 14px', fontSize: 16, background: 'var(--white)' }} />
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {FILTERS.map(({ id, label, icon: Icon }) => {
          const on = filter === id
          return (
            <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={on} style={{
              flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 0, height: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
              border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 14,
            }}>{Icon && <Icon size={17} strokeWidth={2} aria-hidden="true" />}{label}</button>
          )
        })}
      </div>

      {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>Non riesco a caricare le chat. Riprova tra poco.</p>}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', opacity: loading ? 0.6 : 1 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 14, color: 'var(--text-3)' }}>
            {filter === 'direct' ? 'Nessuna chat privata. Tocca + per scrivere a un vicino.'
              : filter === 'intervention' ? 'Nessuna chat di intervento. Si apre dalla scheda di un intervento con "Vai alla chat".'
              : 'Nessuna chat trovata.'}
          </div>
        ) : visible.map((t, i) => <InboxRow key={t.thread_id || `${t.kind}-${i}`} t={t} first={i === 0} onClick={() => open(t)} />)}
      </div>

      {newChat && (
        <Sheet onClose={() => setNewChat(false)} title="Nuova chat" subtitle="Scrivi all'amministratore o a un vicino">
          <PeoplePicker buildingId={building.id} mode="single"
            extraTop={(
              <button type="button" onClick={() => { setNewChat(false); router.push(`${base}?admin=1`) }} style={pickRow(false)}>
                <span style={avatarBox('#E6F1F1', 'var(--teal-dk)', 42)}><Building2 size={20} strokeWidth={1.9} aria-hidden="true" /></span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 800 }}>Amministratore</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>Sempre disponibile</span>
                </span>
              </button>
            )}
            onPick={async ([u]) => {
              const r = await openDirect(u)
              if (r.id) { setNewChat(false); reload(); router.push(`${base}?t=${r.id}`) }
              return r.error
            }} />
        </Sheet>
      )}
    </div>
  )
}

function InboxRow({ t, first, onClick }) {
  const st = t.kind === 'intervention' && t.intervention_status ? INTERVENTION_STATUS[t.intervention_status] : null
  const preview = t.virtual
    ? 'Scrivi all\'amministratore del condominio'
    : t.last_message_preview
      ? `${t.kind !== 'direct' && t.last_message_author ? `${t.last_message_author}: ` : ''}${t.last_message_preview}`
      : t.kind === 'intervention' ? 'Aggiungi i vicini con + e parlate dell\'intervento' : 'Nessun messaggio'
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 0, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
      border: 'none', borderTop: first ? 'none' : '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)',
    }}>
      <ThreadAvatar t={t} size={52} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
          {t.kind === 'group' && <Pin size={15} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-2)' }} />}
          {st && <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.tx }}>{st.label}</span>}
          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 12.5, color: 'var(--text-3)' }}>{t.last_message_at ? listTime(t.last_message_at) : ''}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: t.unread ? 'var(--text)' : 'var(--text-3)', fontWeight: t.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
          {t.unread > 0 && <span style={{ flexShrink: 0, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: 'var(--teal)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.unread > 99 ? '99+' : t.unread}</span>}
        </span>
      </span>
    </button>
  )
}

// 08:09 oggi, "Ieri", giorno della settimana nell'ultima settimana, poi la data
function listTime(iso) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  if (diff <= 0) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Ieri'
  if (diff < 7) { const w = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''); return w[0].toUpperCase() + w.slice(1) }
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '')
}

function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function ThreadAvatar({ t, size = 44 }) {
  if (t.kind === 'group') return <span style={avatarBox('#E6F1F1', 'var(--teal-dk)', size)}><Users size={size * 0.46} strokeWidth={1.8} aria-hidden="true" /></span>
  if (t.kind === 'admin') return <span style={avatarBox('#E6F1F1', 'var(--teal-dk)', size)}><Building2 size={size * 0.44} strokeWidth={1.8} aria-hidden="true" /></span>
  if (t.kind === 'intervention') return <span style={avatarBox('#FDE9DC', '#C2410C', size)}><Wrench size={size * 0.44} strokeWidth={1.8} aria-hidden="true" /></span>
  return <span style={{ ...avatarBox('#EEF0F2', 'var(--text-2)', size), fontSize: size * 0.32, fontWeight: 800 }}>{initials(t.title)}</span>
}

/* ─────────────── Conversazioni ─────────────── */

function GroupChat({ building, onBack }) {
  const { isCondoAdmin, userId } = useCondoRole(building.id)
  const { messages, sendMessage, hideMessage } = useCondoChat(building.id)
  useEffect(() => { markGroupRead(building.id, userId) }, [building.id, userId, messages.length])
  const names = useMemo(() => Object.fromEntries(messages.map((m) => [m.created_by, m.profiles || {}])), [messages])
  return (
    <ChatThreadView
      title="Chat del condominio"
      subtitle="Tutti i residenti verificati"
      avatar={<ThreadAvatar t={{ kind: 'group' }} size={38} />}
      messages={messages.filter((m) => !m.hidden)}
      names={names}
      userId={userId}
      onSend={sendMessage}
      onHide={isCondoAdmin ? hideMessage : null}
      onBack={onBack}
    />
  )
}

function ThreadChat({ building, threadId, meta, onBack }) {
  const { messages, members, names, userId, send, addMembers, loading } = useThreadMessages(threadId)
  const [adding, setAdding] = useState(false)
  const kind = meta?.kind
  const others = members.filter((m) => m.user_id !== userId).map((m) => names[m.user_id]?.display_name || 'Residente')
  const title = meta?.title || (loading ? 'Chat' : 'Conversazione')
  const subtitle = kind === 'intervention'
    ? (others.length ? `Con ${others.join(', ')}` : 'Solo tu: aggiungi i vicini con +')
    : kind === 'admin' ? (meta?.subtitle || (others.length ? `Amministratore: ${others.join(', ')}` : 'L\'amministratore non è ancora su Condoreco'))
    : null

  return (
    <>
      <ChatThreadView
        title={title}
        subtitle={subtitle}
        avatar={<ThreadAvatar t={meta || { kind: 'direct', title }} size={38} />}
        headerRight={kind === 'intervention' && (
          <button type="button" aria-label="Aggiungi vicini alla chat" onClick={() => setAdding(true)} style={{ ...iconBtn(false), width: 40, height: 40, background: 'var(--teal)', color: '#fff', border: 'none' }}>
            <UserPlus size={19} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        banner={kind === 'admin' && others.length === 0 && !loading ? (
          <div style={{ margin: '10px 12px 0', padding: '10px 12px', borderRadius: 12, background: '#FFF7E6', color: '#8A5A00', fontSize: 13 }}>
            L&apos;amministratore del condominio non è ancora iscritto a Condoreco. I messaggi restano qui e li leggerà appena entra.
          </div>
        ) : null}
        emptyText={kind === 'intervention' ? 'Scrivi qui per organizzare l\'intervento con i vicini che aggiungi con +.' : undefined}
        messages={messages}
        names={names}
        userId={userId}
        onSend={send}
        onBack={onBack}
      />
      {adding && (
        <Sheet onClose={() => setAdding(false)} title="Aggiungi vicini" subtitle="Vedranno questa chat dell'intervento">
          <PeoplePicker buildingId={building.id} mode="multi" exclude={members.map((m) => m.user_id)}
            onPick={async (ids) => { const r = await addMembers(ids); if (!r.error) setAdding(false); return r.error }} />
        </Sheet>
      )}
    </>
  )
}

/* ─────────────── Scelta persone ─────────────── */

function PeoplePicker({ buildingId, mode, exclude = [], extraTop, onPick }) {
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => { loadDirectory(buildingId).then(setPeople) }, [buildingId])
  const list = fuzzyFilter((people || []).filter((p) => !exclude.includes(p.user_id)), q,
    (p) => [{ text: p.display_name || '', weight: 3 }, { text: p.floor ? `piano ${p.floor}` : '', weight: 1 }])

  async function pick(ids) {
    setBusy(true); setErr(null)
    const e = await onPick(ids)
    setBusy(false)
    if (e) setErr(e)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {extraTop}
      <label style={{ position: 'relative', display: 'block' }}>
        <Search size={17} strokeWidth={2} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un vicino" type="search"
          style={{ width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px 0 38px', fontSize: 16 }} />
        {q && <button type="button" aria-label="Cancella" onClick={() => setQ('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', minHeight: 0, border: 'none', background: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-3)' }}><X size={16} aria-hidden="true" /></button>}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '46vh', overflowY: 'auto' }}>
        {people === null ? <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento...</p>
          : list.length === 0 ? <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '6px 2px' }}>{(people || []).length === 0 ? 'Non ci sono ancora altri residenti verificati.' : 'Nessun vicino trovato.'}</p>
          : list.map((p) => {
            const on = sel.includes(p.user_id)
            return (
              <button key={p.user_id} type="button" disabled={busy}
                onClick={() => (mode === 'single' ? pick([p.user_id]) : setSel((s) => (on ? s.filter((x) => x !== p.user_id) : [...s, p.user_id])))}
                style={pickRow(on)}>
                <span style={{ ...avatarBox('#EEF0F2', 'var(--text-2)', 42), fontSize: 14, fontWeight: 800 }}>{initials(p.display_name)}</span>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 800 }}>{p.display_name || 'Residente'}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>
                    {[p.role === 'admin' ? 'Amministratore' : 'Residente', p.floor ? (p.floor === 'T' ? 'piano terra' : `piano ${p.floor}`) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {mode === 'multi' && (
                  <span style={{ width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${on ? 'var(--teal)' : '#9CA3AF'}`, background: on ? 'var(--teal)' : 'var(--white)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Check size={15} strokeWidth={3} aria-hidden="true" />}
                  </span>
                )}
              </button>
            )
          })}
      </div>
      {err && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{err}</p>}
      {mode === 'multi' && (
        <button type="button" disabled={!sel.length || busy} onClick={() => pick(sel)} style={{
          minHeight: 0, height: 50, borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: sel.length ? 1 : 0.5,
        }}>{busy ? 'Aggiunta...' : sel.length ? `Aggiungi ${sel.length === 1 ? '1 vicino' : `${sel.length} vicini`}` : 'Scegli i vicini'}</button>
      )}
    </div>
  )
}

const iconBtn = (on) => ({ minHeight: 0, width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--border)', background: on ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 })
const avatarBox = (bg, fg, size) => ({ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg })
const pickRow = (on) => ({ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 0, padding: '10px 12px', borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--text)', fontSize: 15 })
