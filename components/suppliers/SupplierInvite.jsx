'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, CalendarCheck, FileText, CircleCheck, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { getMySupplier, saveMySupplier } from '@/lib/suppliers'
import { maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import SupplierProfileForm from '@/components/suppliers/SupplierProfileForm'

// Pagina dell'invito per un fornitore della rubrica di un condominio.
export default function SupplierInvite({ token }) {
  const router = useRouter()
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id
  const [info, setInfo] = useState(undefined)
  const [supplier, setSupplier] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    createClient().rpc('supplier_invite_info', { p_token: token })
      .then(({ data }) => setInfo((data && data[0]) || null))
  }, [token])
  useEffect(() => {
    if (!ready) return
    if (!userId) { setSupplier(null); return }
    getMySupplier(userId).then(setSupplier)
  }, [ready, userId])

  async function claim() {
    setBusy(true); setErr(null)
    const { error } = await createClient().rpc('claim_supplier_invite', { p_token: token })
    setBusy(false)
    if (error) { setErr(/already/.test(error.message) ? 'Questo invito è già stato usato da un altro account.' : 'Non riesco a collegare l\'invito. Riprova.'); return }
    router.push('/fornitore')
  }

  if (info === undefined || !ready) return <Shell><p style={muted}>Caricamento...</p></Shell>
  if (info === null) return <Shell><h1 style={h1}>Invito non valido</h1><p style={muted}>Il link non è corretto o è stato annullato. Chiedi al condominio di mandartene uno nuovo.</p></Shell>

  return (
    <Shell>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: '#EDE9FE', color: '#6D28D9', fontWeight: 800, fontSize: 13 }}>
        <Wrench size={15} strokeWidth={2} aria-hidden="true" /> Recofixer
      </span>
      <h1 style={h1}>{info.company || info.maintainer_name}, sei stato invitato su Condoreco</h1>
      <p style={{ ...muted, fontSize: 15.5 }}>
        Il condominio di <strong style={{ color: 'var(--text)' }}>{info.building_address}</strong> ti ha aggiunto tra i suoi fornitori
        {info.category ? <> per <strong style={{ color: 'var(--text)' }}>{maintenanceCategoryLabel(info.category).toLowerCase()}</strong></> : null}.
      </p>

      <div style={{ display: 'grid', gap: 10, margin: '6px 0 4px' }}>
        {[
          [MessageCircle, 'Parli con i residenti nella chat di ogni intervento'],
          [CalendarCheck, 'Proponi la data: confermata, va nel calendario del condominio'],
          [FileText, 'Carichi preventivo e fattura in PDF'],
          [CircleCheck, 'Segni il lavoro come completato, con note e foto'],
        ].map(([Icon, t]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, color: 'var(--text-2)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--teal-lt)', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
            {t}
          </div>
        ))}
      </div>

      {info.claimed && !supplier && <p style={{ ...muted, color: '#8A5A00' }}>Questo invito è già stato accettato.</p>}

      {!userId ? (
        <button type="button" style={primary} onClick={() => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: `/fornitori/invito/${token}` } }))}>
          Accedi o registrati per accettare
        </button>
      ) : supplier === undefined ? (
        <p style={muted}>Caricamento...</p>
      ) : supplier ? (
        <button type="button" disabled={busy} onClick={claim} style={primary}>{busy ? 'Collegamento...' : `Accetta come ${supplier.company_name}`}</button>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>Crea il tuo profilo Recofixer</h2>
          <SupplierProfileForm
            initial={{ company_name: info.company || info.maintainer_name, categories: info.category && info.category !== 'other' ? [info.category] : [] }}
            submitLabel="Crea profilo e accetta"
            onSubmit={async (v) => {
              const r = await saveMySupplier(userId, v, false)
              if (r.error) return r.error
              await claim()
              return null
            }} />
        </div>
      )}
      {err && <p style={{ fontSize: 13.5, color: '#B42318', margin: 0 }}>{err}</p>}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 64px' }}>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}
const h1 = { fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, lineHeight: 1.2 }
const muted = { fontSize: 14.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }
const primary = { minHeight: 0, height: 54, borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', marginTop: 6 }
