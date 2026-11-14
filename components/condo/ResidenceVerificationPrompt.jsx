'use client'

import { Lock, Hourglass, ShieldCheck } from 'lucide-react'
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
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ marginBottom: 20, color: '#D97706', display: 'flex', justifyContent: 'center' }}><Hourglass size={44} strokeWidth={1.6} aria-hidden="true" /></div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Richiesta in attesa di approvazione</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', maxWidth: 380 }}>
          L&apos;amministratore del condominio (o lo staff Condoreco, se il condominio non ha un amministratore) sta controllando il documento. Ti avviseremo con una notifica. Il documento viene cancellato appena la richiesta è decisa.
        </p>
        <button onClick={withdraw} disabled={busy}
          style={{ marginTop: 18, padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text-2)', fontWeight: 600, fontSize: 14, cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Ritiro in corso...' : 'Ritira la richiesta e cancella il documento'}
        </button>
        {err && <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{err}</p>}
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
