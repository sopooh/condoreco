'use client'

import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, CircleCheck, FileSignature, Files, House, KeyRound, PenLine, ShieldCheck, Sparkles, TriangleAlert, Upload, Zap } from 'lucide-react'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { createJoinRequest, discardResidenceDocument, precheckResidenceDocument, uploadResidenceDocument, validateDocument } from '@/lib/residenceVerification'
import AutocertForm from '@/components/condo/verify/AutocertForm'
import UnitForm from '@/components/condo/UnitForm'
import { normalizeFloor } from '@/hooks/useNeighbourNotices'
import Link from 'next/link'

const STEPS = ['unita', 'documento', 'carica', 'controllo', 'verifica']
const STEP_LABELS = {
  unita: 'La tua casa',
  documento: 'Scegli il documento',
  carica: 'Carica il documento',
  controllo: 'Controllo di Condor',
  verifica: 'Invio',
}

const DOCUMENT_TYPES = [
  { id: 'certificato', label: 'Certificato di residenza', Icon: HomeIcon },
  { id: 'affitto', label: 'Contratto di affitto', Icon: KeyIcon },
  { id: 'rogito', label: 'Rogito', Icon: DeedIcon },
  { id: 'bolletta', label: 'Bolletta', sub: '(luce, gas, internet)', Icon: BoltIcon },
  { id: 'autocertificazione', label: 'Autocertificazione', sub: 'La compili qui e la firmi col dito, con il documento d\'identità', Icon: PenIcon },
]

// Il documento viene caricato nel bucket privato residence-docs e la
// richiesta va in condo_join_requests (vedi lib/residenceVerification.js).
// Decide l'amministratore del condominio, o lo staff Condoreco se il
// condominio non ha amministratore; l'accesso arriva solo con l'approvazione.
export default function VerificaResidenzaPage({ params }) {
  // In Next 16 params è una Promise anche nei client component: va scartata
  // con use(), l'accesso sincrono è stato rimosso (vedi upgrade guide v16).
  const { id: condominiumId } = use(params)
  const router = useRouter()
  const session = useSession()
  const userId = session?.user?.id

  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState(null) // { tenure, millesimi, floor }
  const [documentType, setDocumentType] = useState(null)
  const [file, setFile] = useState(null)
  const fileName = file?.name ?? null
  const [fileError, setFileError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)
  const [declarant, setDeclarant] = useState(null) // nome per l'autocertificazione
  const [uploaded, setUploaded] = useState(null)   // { file, path } documento gia' caricato
  const [check, setCheck] = useState(null)         // null | { loading } | { report } | { error, code }
  const [checkToken, setCheckToken] = useState(0)

  const current = STEPS[step]

  // Passo "controllo": carica il documento e lo fa leggere a Condor
  useEffect(() => {
    if (current !== 'controllo' || !userId || !file) return
    let cancelled = false
    ;(async () => {
      setCheck({ loading: true })
      let path = uploaded?.file === file ? uploaded.path : null
      if (!path) {
        if (uploaded?.path) discardResidenceDocument(uploaded.path)
        const up = await uploadResidenceDocument({ buildingId: condominiumId, userId, file })
        if (cancelled) return
        if (up.error) { setCheck({ error: up.error, code: 'upload' }); return }
        path = up.path
        setUploaded({ file, path })
      }
      const res = await precheckResidenceDocument({ buildingId: condominiumId, path, documentType, declarantName: declarant || (unit?.firstName ? `${unit.firstName} ${unit.lastName}` : null) })
      if (cancelled) return
      // documento sbagliato: il file non serve, lo cancelliamo subito
      if (res.report?.verdict === 'non_coerente') { discardResidenceDocument(path); setUploaded(null) }
      setCheck(res)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, userId, condominiumId, documentType, file, checkToken])

  // Passo "verifica": crea la richiesta col documento gia' caricato e controllato
  useEffect(() => {
    if (current !== 'verifica' || !uploaded?.path) return
    let cancelled = false
    ;(async () => {
      const res = await createJoinRequest({
        buildingId: condominiumId, path: uploaded.path, documentType,
        unit: unit ? { ...unit, floor: normalizeFloor(unit.floor) } : null,
      })
      if (cancelled) return
      if (res.error) { setError(res.error); return }
      setDone(true)
    })()
    return () => { cancelled = true }
  }, [current, condominiumId, documentType, uploaded, retryToken, unit])

  // Documento sbagliato: lo cancella e torna al caricamento
  function uploadAnother() {
    if (uploaded?.path) discardResidenceDocument(uploaded.path)
    setUploaded(null); setFile(null); setDeclarant(null); setCheck(null); setFileError(null)
    setStep(STEPS.indexOf('carica'))
  }

  function prev() {
    if (step === 0) { router.push(`/edificio/${condominiumId}/condominio`); return }
    setStep(s => Math.max(0, s - 1))
  }

  function next() {
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function handleFile(files) {
    const f = files?.[0]
    if (!f) return
    const invalid = validateDocument(f)
    setFileError(invalid)
    setFile(invalid ? null : f)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px 60px' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--teal-lt)', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <CheckIcon size={36} />
          </div>
          <h1 style={titleStyle}>Richiesta inviata</h1>
          <p style={{ ...subStyle, marginBottom: 18 }}>In attesa di approvazione. L&apos;amministratore del condominio (o lo staff Condoreco, se il condominio non ha un amministratore) controllerà il documento. Ti avviseremo con una notifica appena la richiesta sarà decisa.</p>
          <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 24px' }}>Il documento viene cancellato appena la richiesta è approvata o respinta. Resta solo l&apos;esito del controllo di Condor.</p>
          <button onClick={() => router.push('/profilo')} style={primaryBtn(true)}>
            Torna al profilo <ArrowRightIcon />
          </button>
        </div>
      </div>
    )
  }

  const canProceed = {
    unita: !!unit,
    documento: !!documentType,
    carica: !!fileName,
    controllo: false,
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
        {current === 'unita' && (
          <>
            <IconTile><House size={28} strokeWidth={1.8} aria-hidden="true" /></IconTile>
            <h2 style={titleStyle}>La tua casa nel condominio</h2>
            <p style={subStyle}>Dicci se sei proprietario o in affitto. Se sei proprietario, indica anche i tuoi millesimi.</p>
            <UnitForm building={{}} buildingId={condominiumId} initial={unit} withRegistry submitLabel="Continua" onSubmit={(v) => { setUnit(v); next(); return null }} />
          </>
        )}

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

        {current === 'carica' && documentType === 'autocertificazione' && (
          <>
            <IconTile><PenIcon size={28} /></IconTile>
            <h2 style={titleStyle}>Autocertificazione</h2>
            <p style={subStyle}>Compila i tuoi dati, firma con il dito e fotografa il documento d&apos;identità. Prepariamo noi il PDF.</p>
            <AutocertForm buildingId={condominiumId} unit={unit} ready={file}
              onReady={(f, name) => { setFile(f); setDeclarant(name) }} />
          </>
        )}

        {current === 'carica' && documentType !== 'autocertificazione' && (
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
              <span>
                Il documento lo vede solo chi approva la richiesta: l&apos;amministratore del condominio o, se non c&apos;è, lo staff Condoreco. Prima dell&apos;invio Condor, l&apos;assistente AI di Condoreco, controlla che sia il documento giusto. Non viene mostrato agli altri residenti e viene cancellato appena la richiesta è decisa: resta solo l&apos;esito del controllo. Max 10 MB. <Link href="/privacy-policy#verifica-residenza" style={{ color: 'var(--teal)' }}>Informativa</Link>
              </span>
            </div>
            {fileError && <p role="alert" style={{ color: '#B42318', fontSize: 14, marginTop: 12 }}>{fileError}</p>}
          </>
        )}

        {current === 'controllo' && <CheckStep check={check} documentType={documentType}
          onSend={next} onAnother={uploadAnother} onRetry={() => setCheckToken((t) => t + 1)} />}

        {current === 'verifica' && !error && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div className="condo-spinner" style={{ margin: '0 auto 22px' }} />
            <h2 style={{ ...titleStyle, fontSize: 22 }}>Invio della richiesta</h2>
            <p style={{ ...subStyle, marginBottom: 0 }}>Stiamo inviando la richiesta a chi la deve approvare.</p>
          </div>
        )}

        {current === 'verifica' && error && (
          <div style={{ textAlign: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FDECEC', color: '#B42318', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AlertIcon />
            </div>
            <h2 style={{ ...titleStyle, fontSize: 21 }}>Richiesta non inviata</h2>
            <p style={subStyle}>{error}</p>
            <button onClick={() => { setError(null); setRetryToken(t => t + 1) }} style={primaryBtn(true)}>Riprova</button>
          </div>
        )}

        {current !== 'verifica' && current !== 'unita' && current !== 'controllo' && (
          <button onClick={next} disabled={!canProceed} style={{ ...primaryBtn(canProceed), marginTop: 28 }}>
            Continua <ArrowRightIcon />
          </button>
        )}
      </div>
    </div>
  )
}

const TYPE_NAMES = { certificato: 'un certificato di residenza', affitto: 'un contratto di affitto', rogito: 'un rogito', bolletta: 'una bolletta', autocertificazione: 'un\'autocertificazione', documento_identita: 'un documento d\'identità' }

function CheckStep({ check, documentType, onSend, onAnother, onRetry }) {
  if (!check || check.loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <div className="condo-spinner" style={{ margin: '0 auto 22px' }} />
        <h2 style={{ ...titleStyle, fontSize: 22 }}>Condor sta controllando il documento</h2>
        <p style={{ ...subStyle, marginBottom: 0 }}>Verifica che sia il documento giusto e che l&apos;indirizzo sia quello del condominio. Ci vuole qualche secondo.</p>
      </div>
    )
  }
  if (check.error) {
    const blocking = check.code === 'upload'
    return (
      <div style={{ textAlign: 'center', padding: '12px 0 0' }}>
        <div style={{ ...roundIcon, background: '#FFF4EC', color: '#B54708' }}><TriangleAlert size={30} strokeWidth={2} aria-hidden="true" /></div>
        <h2 style={{ ...titleStyle, fontSize: 21 }}>{blocking ? 'Caricamento non riuscito' : 'Controllo automatico non disponibile'}</h2>
        <p style={subStyle}>{check.error} {blocking ? '' : 'Puoi inviare comunque: il documento lo controllerà chi approva la richiesta.'}</p>
        {blocking
          ? <button onClick={onRetry} style={primaryBtn(true)}>Riprova</button>
          : <button onClick={onSend} style={primaryBtn(true)}>Invia la richiesta <ArrowRightIcon /></button>}
        <button onClick={onAnother} style={secondaryBtn}>Carica un altro documento</button>
      </div>
    )
  }
  const r = check.report
  const issues = (r.issues || []).filter(Boolean)
  if (r.verdict === 'non_coerente') {
    return (
      <div style={{ padding: '4px 0 0' }}>
        <div style={{ ...roundIcon, background: '#FEF3F2', color: '#B42318' }}><CircleAlert size={32} strokeWidth={2} aria-hidden="true" /></div>
        <h2 style={{ ...titleStyle, fontSize: 23, textAlign: 'center' }}>Documento non corretto</h2>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FEF3F2', color: '#7A271A', fontSize: 15, lineHeight: 1.5, margin: '6px 0 14px' }}>
          <b>Hai caricato:</b> {r.what_is_it}
        </div>
        <p style={{ ...subStyle, marginBottom: 10 }}>Per entrare nel condominio serve {TYPE_NAMES[documentType] || 'un documento'} con l&apos;indirizzo di questo edificio.</p>
        {issues.length > 0 && <ul style={issueList}>{issues.map((i, n) => <li key={n}>{i}</li>)}</ul>}
        <button onClick={onAnother} style={primaryBtn(true)}><Upload size={20} aria-hidden="true" /> Carica il documento giusto</button>
        <p style={{ fontSize: 12.5, color: 'var(--text-4)', textAlign: 'center', margin: '12px 0 0' }}>Il file caricato è già stato cancellato.</p>
      </div>
    )
  }
  const ok = r.verdict === 'coerente'
  return (
    <div style={{ padding: '4px 0 0' }}>
      <div style={{ ...roundIcon, background: ok ? '#ECFDF3' : '#FFF4EC', color: ok ? '#067647' : '#B54708' }}>
        {ok ? <Sparkles size={30} strokeWidth={2} aria-hidden="true" /> : <TriangleAlert size={30} strokeWidth={2} aria-hidden="true" />}
      </div>
      <h2 style={{ ...titleStyle, fontSize: 23, textAlign: 'center' }}>{ok ? 'Documento riconosciuto' : 'Qualcosa non è chiaro'}</h2>
      <dl style={{ margin: '8px 0 14px', padding: '12px 14px', borderRadius: 14, background: '#F5F7F7', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 15 }}>
        <dt style={dt}>Documento</dt><dd style={dd}>{r.what_is_it}</dd>
        {r.holder_name && <><dt style={dt}>Intestato a</dt><dd style={dd}>{r.holder_name}</dd></>}
        {r.address_on_document && <><dt style={dt}>Indirizzo</dt><dd style={dd}>{r.address_on_document}</dd></>}
      </dl>
      {!ok && issues.length > 0 && <ul style={issueList}>{issues.map((i, n) => <li key={n}>{i}</li>)}</ul>}
      <button onClick={onSend} style={primaryBtn(true)}>{ok ? 'Invia la richiesta' : 'Invia comunque'} <ArrowRightIcon /></button>
      {!ok && <button onClick={onAnother} style={secondaryBtn}>Carica un altro documento</button>}
      <p style={{ fontSize: 12.5, color: 'var(--text-4)', textAlign: 'center', margin: '12px 0 0' }}>Condor è un controllo automatico: l&apos;accesso lo approva sempre l&apos;amministratore.</p>
    </div>
  )
}

const roundIcon = { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }
const secondaryBtn = { display: 'block', width: '100%', height: 50, marginTop: 10, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
const issueList = { margin: '0 0 16px', paddingLeft: 20, fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.5 }
const dt = { color: 'var(--text-3)' }
const dd = { margin: 0, fontWeight: 600, color: 'var(--text)' }

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
function PenIcon({ size = 24 } = {}) { return <PenLine size={size} strokeWidth={1.8} aria-hidden="true" /> }
function UploadIcon({ size = 28 } = {}) { return <Upload size={size} strokeWidth={1.8} aria-hidden="true" /> }
function ShieldIcon({ size = 18 } = {}) { return <ShieldCheck size={size} strokeWidth={1.8} aria-hidden="true" /> }
function AlertIcon({ size = 30 } = {}) { return <CircleAlert size={size} strokeWidth={2} aria-hidden="true" /> }
function ChevronRightIcon({ size = 22 } = {}) { return <ChevronRight size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckCircleIcon({ size = 26 } = {}) { return <CircleCheck size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckIcon({ size = 22 }) { return <Check size={size} strokeWidth={2.4} aria-hidden="true" /> }
function ArrowRightIcon({ size = 22 } = {}) { return <ArrowRight size={size} strokeWidth={2} aria-hidden="true" /> }
function ArrowLeftIcon({ size = 22 } = {}) { return <ArrowLeft size={size} strokeWidth={2} aria-hidden="true" /> }
