'use client'

import { Lock, Hourglass, ShieldCheck, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { withdrawJoinRequest } from '@/lib/residenceVerification'

// Sostituisce il vecchio blocco statico "Area riservata": guida il residente
// non ancora verificato a completare la verifica, invece di limitarsi a
// bloccarlo. Mai un redirect al profilo — la verifica resta contestuale al
// condominio che si sta cercando di aprire.
export default function ResidenceVerificationPrompt({ condominiumId, status, request, onChange }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function withdraw() {
    if (!request?.id) return
    setBusy(true); setErr(null)
    const res = await withdrawJoinRequest(request.id)
    setBusy(false)
    if (res.error) { setErr(res.error); return }
    onChange?.()
  }

  if (status === 'pending') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: '#FDEFDC', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <Hourglass size={36} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.15, color: 'var(--text)', margin: '0 0 12px' }}>
            Richiesta in attesa di approvazione
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 20px' }}>
            L&apos;amministratore del condominio (o lo staff Condoreco, se il condominio non ha un amministratore) sta controllando il documento. Il documento viene cancellato appena la richiesta è decisa.
          </p>
          <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', background: 'var(--teal-lt)', borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
            <Bell size={24} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--teal)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Ti avviseremo noi</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.4 }}>Riceverai una notifica appena la richiesta viene approvata o respinta.</div>
            </div>
          </div>
          <button onClick={withdraw} disabled={busy}
            style={{ width: '100%', minHeight: 0, height: 52, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Ritiro in corso...' : 'Ritira la richiesta e cancella il documento'}
          </button>
          {err && <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{err}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ marginBottom: 20, color: 'var(--teal)', display: 'flex', justifyContent: 'center' }}><Lock size={44} strokeWidth={1.6} aria-hidden="true" /></div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Area privata del condominio</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 8, textAlign: 'center', maxWidth: 380 }}>
        Per accedere alla bacheca, ai sondaggi e alla chat del condominio dobbiamo verificare che tu viva in questo edificio.
      </p>
      {status === 'rejected' && (
        <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 16, textAlign: 'center', maxWidth: 380 }}>
          La richiesta precedente non è stata approvata{request?.reason ? `: ${request.reason}` : '.'} Puoi riprovare con un altro documento.
        </p>
      )}
      <button
        onClick={() => router.push(`/edificio/${condominiumId}/condominio/verifica`)}
        style={{
          marginTop: status === 'rejected' ? 0 : 16,
          padding: '12px 24px', borderRadius: 8, border: 'none',
          background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}
      >
        <ShieldCheck size={18} strokeWidth={2} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />Verifica che abiti qui
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 10 }}>
        Caricare il documento richiede circa 2 minuti. Poi la richiesta viene approvata a mano.
      </p>
    </div>
  )
}
