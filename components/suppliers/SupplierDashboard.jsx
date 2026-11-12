'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { getMySupplier, saveMySupplier } from '@/lib/suppliers'
import { useThreadMessages } from '@/hooks/useCondoThreads'
import SupplierProfileForm from '@/components/suppliers/SupplierProfileForm'
import ChatThreadView from '@/components/condo/chat/ChatThreadView'
import { useViewAs } from '@/hooks/useViewAs'
import RecofixerWorkspace, { useTeam } from '@/components/suppliers/workspace/RecofixerWorkspace'

// Anteprima "vedi come Recofixer" per l'admin del sito senza profilo fornitore
const DEMO_SUPPLIER = { company_name: 'Idraulica Esempio srl', verified: true, categories: ['plumbing', 'heating'], zones: ['Milano'] }
const demoDay = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const demoAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const DEMO_ITEMS = [
  { id: 'demo-1', title: 'Perdita colonna acqua scala B', status: 'requested', urgent: true, category: 'plumbing', building_address: 'Via Ripamonti, 120 · Milano', location: 'Scala B · 3° piano', requester: 'Giulia B.', requester_is_admin: true, ref_number: 1042, description: 'Perdita visibile nel vano scala, vicino al contatore del terzo piano.', thread_id: null, message_count: 3, created_at: demoAgo(5), updated_at: demoAgo(4) },
  { id: 'demo-2', title: 'Manutenzione caldaia centralizzata', status: 'scheduled', category: 'heating', building_address: 'Via Tortona, 8 · Milano', location: 'Locale caldaia', requester: 'Marco C.', ref_number: 1038, scheduled_date: demoDay(3), time_start: '09:00:00', time_end: '11:00:00', tech_id: 't1', tech_name: 'Marco Bianchi', thread_id: null, message_count: 2, created_at: demoAgo(60), updated_at: demoAgo(30) },
  { id: 'demo-3', title: 'Sostituzione valvola', status: 'requested', category: 'plumbing', building_address: 'Via Savona, 22 · Milano', requester: 'Elena F.', ref_number: 1040, proposed_date: demoDay(2), proposed_time_start: '14:00:00', quote_cents: 18000, thread_id: null, created_at: demoAgo(30), updated_at: demoAgo(20) },
  { id: 'demo-4', title: 'Sostituzione rubinetto cortile', status: 'done', category: 'plumbing', building_address: 'Via Ripamonti, 120 · Milano', requester: 'Marco C.', ref_number: 1012, completion_notes: 'Sostituito rubinetto a sfera, garanzia 24 mesi.', completed_at: demoAgo(200), invoice_cents: 9500, thread_id: null, created_at: demoAgo(300), updated_at: demoAgo(200) },
]


// Area del Recofixer: profilo attività e interventi in cui è stato scelto.
export default function SupplierDashboard() {
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id
  const [supplier, setSupplier] = useState(undefined)
  const [items, setItems] = useState(null)
  const [chat, setChat] = useState(null)
  const [editing, setEditing] = useState(false)
  const { viewAs } = useViewAs()
  const demo = viewAs === 'recofixer' && supplier === null && !editing
  const team = useTeam(demo)

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
  if (demo) return <RecofixerWorkspace supplier={DEMO_SUPPLIER} items={DEMO_ITEMS} demo team={team} onEdit={() => {}} onChat={() => {}} onChanged={() => {}} />
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
    <RecofixerWorkspace supplier={supplier} items={items} team={team} onChat={setChat} onEdit={() => setEditing(true)} onChanged={load} />
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
const primary = { minHeight: 0, height: 52, borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', marginTop: 6 }
