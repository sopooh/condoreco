'use client'

import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, CircleCheck, FileSignature, Files, House, KeyRound, ShieldCheck, Upload, Zap } from 'lucide-react'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { setVerification } from '@/lib/residenceVerification'
import { createClient } from '@/lib/supabase/client'
import { invalidateRoleCache } from '@/hooks/useCondoRole'

const STEPS = ['documento', 'carica', 'verifica']
const STEP_LABELS = {
  documento: 'Scegli il documento',
  carica: 'Carica il documento',
  verifica: 'Verifica in corso',
}

const DOCUMENT_TYPES = [
  { id: 'certificato', label: 'Certificato di residenza', Icon: HomeIcon },
  { id: 'affitto', label: 'Contratto di affitto', Icon: KeyIcon },
  { id: 'rogito', label: 'Rogito', Icon: DeedIcon },
  { id: 'bolletta', label: 'Bolletta', sub: '(luce, gas, internet)', Icon: BoltIcon },
]

// Prima implementazione: nessun upload reale (nessun bucket di storage, nessuna
// coda di revisione admin). Il documento non viene inviato da nessuna parte,
// il file scelto serve solo a mostrare il nome nella UI. La "verifica" allo
// step 3 è simulata con un timeout — da collegare in futuro a un vero
// processo di revisione.
// Al termine del timeout la pagina scrive comunque una riga vera in
// condo_members (ruolo 'resident', vedi migration condo_members_self_enroll):
// è quello — non lo stato mock in localStorage — a decidere l'accesso reale
// (vedi middleware.ts / useCondoRole).
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
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  const current = STEPS[step]

  useEffect(() => {
    if (current !== 'verifica' || !userId) return
    let cancelled = false
    setVerification(userId, condominiumId, { status: 'pending', documentType, fileName })
    const t = setTimeout(async () => {
      const supabase = createClient()
      // ignoreDuplicates: se esiste già una riga (es. admin assegnato a mano)
      // non la tocca — questo flusso concede solo 'resident', mai un upgrade.
      const { error: upsertError } = await supabase
        .from('condo_members')
        .upsert(
          { building_id: condominiumId, user_id: userId, role: 'resident' },
          { onConflict: 'building_id,user_id', ignoreDuplicates: true }
        )
      if (cancelled) return
      if (upsertError) {
        console.error('[verifica] condo_members upsert failed', upsertError.message)
        setVerification(userId, condominiumId, { status: 'rejected', documentType, fileName })
        setError('Non siamo riusciti a completare la verifica. Riprova tra qualche minuto.')
        return
      }
      invalidateRoleCache(condominiumId, userId)
      setVerification(userId, condominiumId, { status: 'approved', documentType, fileName })
      setDone(true)
    }, 2500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [current, userId, condominiumId, documentType, fileName, retryToken])

  function prev() {
    if (step === 0) { router.push(`/edificio/${condominiumId}/condominio`); return }
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
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px 60px' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--teal-lt)', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <CheckIcon size={36} />
          </div>
          <h1 style={titleStyle}>Residenza verificata</h1>
          <p style={{ ...subStyle, marginBottom: 18 }}>Ora puoi accedere alla bacheca, alle decisioni e alla chat del tuo condominio.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <span className="profile-pill profile-pill-teal">Residente verificato</span>
          </div>
          <button onClick={() => router.push(`/edificio/${condominiumId}/condominio`)} style={primaryBtn(true)}>
            Entra nel condominio <ArrowRightIcon />
          </button>
        </div>
      </div>
    )
  }

  const canProceed = {
    documento: !!documentType,
    carica: !!fileName,
    verifica: false,
  }[current]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 60px' }}>
      {current !== 'verifica' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <button onClick={prev} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '6px 0', minHeight: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
              <ArrowLeftIcon /> {step === 0 ? 'Annulla' : 'Indietro'}
            </button>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-3)', textAlign: 'right' }}>
              {STEP_LABELS[current]} · {step + 1} di {STEPS.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, height: 8, borderRadius: 100, background: i <= step ? 'var(--teal)' : '#E5E7EB', transition: 'background 200ms ease' }} />
            ))}
          </div>
        </>
      )}

      <div style={cardStyle}>
        {current === 'documento' && (
          <>
            <IconTile><DocsIcon /></IconTile>
            <h2 style={titleStyle}>Quale documento vuoi usare?</h2>
            <p style={subStyle}>Ci serve solo per confermare che vivi in questo edificio.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DOCUMENT_TYPES.map(doc => {
                const active = documentType === doc.id
                const Icon = doc.Icon
                return (
                  <button key={doc.id} onClick={() => setDocumentType(doc.id)} aria-pressed={active}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', minHeight: 72,
                      border: `${active ? 2 : 1}px solid ${active ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 16,
                      background: active ? 'rgba(13,103,111,0.05)' : 'var(--white)', cursor: 'pointer', textAlign: 'left',
                      margin: active ? 0 : 1, transition: 'border-color 150ms ease, background 150ms ease',
                    }}>
                    <span style={{ width: 48, height: 48, borderRadius: 14, background: active ? 'var(--teal-lt)' : '#EEF3F3', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{doc.label}</span>
                      {doc.sub && <span style={{ display: 'block', fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>{doc.sub}</span>}
                    </span>
                    <span style={{ color: active ? 'var(--teal)' : 'var(--text-2)', display: 'inline-flex', flexShrink: 0 }}>
                      {active ? <CheckCircleIcon /> : <ChevronRightIcon />}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {current === 'carica' && (
          <>
            <IconTile><UploadIcon /></IconTile>
            <h2 style={titleStyle}>Carica il documento</h2>
            <p style={subStyle}>Oscura pure i dati sensibili, ci serve solo l&apos;indirizzo.</p>
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                border: `2px dashed ${dragOver || fileName ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 16,
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: fileName ? 'rgba(13,103,111,0.05)' : '#FAFBFB', transition: 'border-color 150ms ease',
              }}
            >
              <input id="verifica-documento" name="verifica-documento" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files)} />
              <span style={{ width: 52, height: 52, borderRadius: '50%', background: fileName ? 'var(--teal)' : 'var(--teal-lt)', color: fileName ? '#fff' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fileName ? <CheckIcon size={26} /> : <UploadIcon />}
              </span>
              {fileName ? (
                <>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-dk)', wordBreak: 'break-all' }}>{fileName}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Tocca per cambiare file</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Scegli un file o scatta una foto</span>
                  <span style={{ fontSize: 13, color: 'var(--text-4)' }}>JPG · PNG · PDF</span>
                </>
              )}
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: '12px 14px', borderRadius: 12, background: '#F5F7F7', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.45 }}>
              <span style={{ color: 'var(--teal)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><ShieldIcon /></span>
              Il documento serve solo alla verifica e non viene mostrato agli altri residenti.
            </div>
          </>
        )}

        {current === 'verifica' && !error && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div className="condo-spinner" style={{ margin: '0 auto 22px' }} />
            <h2 style={{ ...titleStyle, fontSize: 22 }}>Stiamo verificando il documento</h2>
            <p style={{ ...subStyle, marginBottom: 0 }}>Ci vuole solo qualche secondo.</p>
          </div>
        )}

        {current === 'verifica' && error && (
          <div style={{ textAlign: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FDECEC', color: '#B42318', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AlertIcon />
            </div>
            <h2 style={{ ...titleStyle, fontSize: 21 }}>Verifica non completata</h2>
            <p style={subStyle}>{error}</p>
            <button onClick={() => { setError(null); setRetryToken(t => t + 1) }} style={primaryBtn(true)}>Riprova</button>
          </div>
        )}

        {current !== 'verifica' && (
          <button onClick={next} disabled={!canProceed} style={{ ...primaryBtn(canProceed), marginTop: 28 }}>
            Continua <ArrowRightIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function IconTile({ children }) {
  return (
    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#EEF3F3', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
      {children}
    </div>
  )
}

const cardStyle = { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 22px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }
const titleStyle = { fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.2, margin: '0 0 8px' }
const subStyle = { fontSize: 16, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 22px' }
const primaryBtn = (enabled) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: 56,
  borderRadius: 16, border: 'none', background: enabled ? 'var(--teal)' : '#D5DCDC', color: '#fff',
  fontWeight: 700, fontSize: 17, cursor: enabled ? 'pointer' : 'not-allowed',
})

const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, viewBox: '0 0 24 24' }
function DocsIcon({ size = 30 } = {}) { return <Files size={size} strokeWidth={1.8} aria-hidden="true" /> }
function HomeIcon({ size = 24 } = {}) { return <House size={size} strokeWidth={1.8} aria-hidden="true" /> }
function KeyIcon({ size = 24 } = {}) { return <KeyRound size={size} strokeWidth={1.8} aria-hidden="true" /> }
function DeedIcon({ size = 24 } = {}) { return <FileSignature size={size} strokeWidth={1.8} aria-hidden="true" /> }
function BoltIcon({ size = 24 } = {}) { return <Zap size={size} strokeWidth={1.8} aria-hidden="true" /> }
function UploadIcon({ size = 28 } = {}) { return <Upload size={size} strokeWidth={1.8} aria-hidden="true" /> }
function ShieldIcon({ size = 18 } = {}) { return <ShieldCheck size={size} strokeWidth={1.8} aria-hidden="true" /> }
function AlertIcon({ size = 30 } = {}) { return <CircleAlert size={size} strokeWidth={2} aria-hidden="true" /> }
function ChevronRightIcon({ size = 22 } = {}) { return <ChevronRight size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckCircleIcon({ size = 26 } = {}) { return <CircleCheck size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckIcon({ size = 22 }) { return <Check size={size} strokeWidth={2.4} aria-hidden="true" /> }
function ArrowRightIcon({ size = 22 } = {}) { return <ArrowRight size={size} strokeWidth={2} aria-hidden="true" /> }
function ArrowLeftIcon({ size = 22 } = {}) { return <ArrowLeft size={size} strokeWidth={2} aria-hidden="true" /> }
