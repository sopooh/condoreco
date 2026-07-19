'use client'

import { useRouter } from 'next/navigation'

// Sostituisce il vecchio blocco statico "Area riservata": guida il residente
// non ancora verificato a completare la verifica, invece di limitarsi a
// bloccarlo. Mai un redirect al profilo — la verifica resta contestuale al
// condominio che si sta cercando di aprire.
export default function ResidenceVerificationPrompt({ condominiumId, status }) {
  const router = useRouter()

  if (status === 'pending') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🟡</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Verifica in corso</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', maxWidth: 360 }}>
          Stiamo controllando il documento che hai caricato. Ti avviseremo appena la verifica sarà completata.
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Area privata del condominio</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 8, textAlign: 'center', maxWidth: 380 }}>
        Per accedere alla bacheca, ai sondaggi e alla chat del condominio dobbiamo verificare che tu viva in questo edificio.
      </p>
      {status === 'rejected' && (
        <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 16, textAlign: 'center', maxWidth: 380 }}>
          La verifica precedente non è andata a buon fine. Puoi riprovare con un altro documento.
        </p>
      )}
      <button
        onClick={() => router.push(`/condominio/${condominiumId}/verifica`)}
        style={{
          marginTop: status === 'rejected' ? 0 : 16,
          padding: '12px 24px', borderRadius: 8, border: 'none',
          background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}
      >
        ✓ Verifica che abiti qui
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 10 }}>
        La verifica richiede circa 2 minuti.
      </p>
    </div>
  )
}
