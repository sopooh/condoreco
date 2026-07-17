'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { setVerification } from '@/lib/residenceVerification'

const STEPS = ['documento', 'carica', 'verifica']
const STEP_LABELS = {
  documento: 'Scegli il documento',
  carica: 'Carica il documento',
  verifica: 'Verifica in corso',
}

const DOCUMENT_TYPES = [
  { id: 'certificato', label: 'Certificato di residenza' },
  { id: 'affitto', label: 'Contratto di affitto' },
  { id: 'rogito', label: 'Rogito' },
  { id: 'bolletta', label: 'Bolletta (luce, gas, internet)' },
]

// Prima implementazione: nessun upload reale (nessun bucket di storage, nessuna
// coda di revisione admin). Il documento non viene inviato da nessuna parte,
// il file scelto serve solo a mostrare il nome nella UI. La "verifica" allo
// step 3 è simulata con un timeout — da collegare in futuro a un vero
// processo di revisione.
export default function VerificaResidenzaPage({ params }) {
  // In Next 16 params è una Promise anche nei client component: va scartata
  // con use(), l'accesso sincrono è stato rimosso (vedi upgrade guide v16).
  const { id: condominiumId } = use(params)
  const router = useRouter()
  const session = useSession()
  const userId = session?.user?.id

  const [step, setStep] = useState(0)
  const [documentType, setDocumentType] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [done, setDone] = useState(false)

  const current = STEPS[step]

  useEffect(() => {
    if (current !== 'verifica' || !userId) return
    setVerification(userId, condominiumId, { status: 'pending', documentType, fileName })
    const t = setTimeout(() => {
      setVerification(userId, condominiumId, { status: 'approved', documentType, fileName })
      setDone(true)
    }, 2500)
    return () => clearTimeout(t)
  }, [current, userId, condominiumId, documentType, fileName])

  function prev() {
    if (step === 0) { router.push(`/condominio/${condominiumId}`); return }
    setStep(s => Math.max(0, s - 1))
  }

  function next() {
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function handleFile(files) {
    if (files?.[0]) setFileName(files[0].name)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Residenza verificata</h1>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span className="profile-pill profile-pill-teal">Residente verificato</span>
        </div>
        <button
          onClick={() => router.push(`/condominio/${condominiumId}`)}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          Entra nel condominio
        </button>
      </div>
    )
  }

  const canProceed = {
    documento: !!documentType,
    carica: !!fileName,
    verifica: false,
  }[current]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px 60px' }}>
      {current !== 'verifica' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <button onClick={prev}
              style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>
              ← {step === 0 ? 'Annulla' : 'Indietro'}
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-4)' }}>
              {STEP_LABELS[current]} · {step + 1} di {STEPS.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 100, background: i <= step ? 'var(--teal)' : 'var(--border)' }} />
            ))}
          </div>
        </>
      )}

      <div style={cardStyle}>
        {current === 'documento' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Quale documento vuoi usare?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
              Ci serve solo per confermare che vivi in questo edificio.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DOCUMENT_TYPES.map(doc => {
                const active = documentType === doc.id
                return (
                  <button key={doc.id} onClick={() => setDocumentType(doc.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                      border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 12,
                      background: active ? 'var(--bg)' : 'var(--white)', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, opacity: active ? 1 : 0 }} />
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{doc.label}</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {current === 'carica' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Carica il documento</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
              Oscura pure i dati sensibili, ci serve solo l'indirizzo.
            </p>
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files) }}
              style={{
                display: 'block', border: `2px dashed ${dragOver ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 10,
                padding: 24, textAlign: 'center', cursor: 'pointer', background: 'var(--bg)', transition: 'border-color 0.15s',
              }}
            >
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files)} />
              <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
              {fileName ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-dk)' }}>{fileName}</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Trascina qui il file oppure scegli dal dispositivo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>JPG · PNG · PDF</div>
                </>
              )}
            </label>
          </>
        )}

        {current === 'verifica' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="condo-spinner" style={{ margin: '0 auto 20px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Stiamo verificando il documento…</div>
          </div>
        )}

        {current !== 'verifica' && (
          <button onClick={next} disabled={!canProceed}
            style={{
              width: '100%', marginTop: 28, padding: 14, borderRadius: 10, border: 'none',
              background: canProceed ? 'var(--teal)' : 'var(--border)', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: canProceed ? 'pointer' : 'not-allowed',
            }}>
            Continua
          </button>
        )}
      </div>
    </div>
  )
}

const cardStyle = { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }
