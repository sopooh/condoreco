'use client'

import { useRef, useState } from 'react'
import { KeyRound, House, Info, FileUp, FileText, Clock, CircleCheck, CircleAlert, X } from 'lucide-react'
import { FloorPicker } from '@/components/condo/NeighbourNotice'
import { parseMillesimi } from '@/hooks/useNeighbourNotices'
import { DOCUMENT_TYPES, validateMillesimiFile } from '@/lib/millesimiVerification'

const fmtMill = (n) => Number(n).toLocaleString('it-IT', { maximumFractionDigits: 3 })

// Dati dell'unità del residente: proprietario o inquilino, piano e, per i
// proprietari, millesimi. I millesimi valgono solo con un documento
// (riparto spese o regolamento) + dichiarazione, approvati dall'amministratore:
// il form raccoglie la prova e la passa a onSubmit come `proof`.
// askMillesimi=false (wizard di verifica residenza): niente millesimi, si
// dichiarano dopo l'ingresso dalla scheda "La tua casa".
export default function UnitForm({ building, initial, askMillesimi = true, submitLabel = 'Salva', onSubmit, onCancel }) {
  const verified = initial?.millesimi ?? null
  const verification = initial?.verification ?? null
  const pending = verification?.status === 'pending' ? verification : null
  const rejected = verification?.status === 'rejected' ? verification : null

  const [tenure, setTenure] = useState(initial?.tenure ?? null)
  const [floor, setFloor] = useState(initial?.floor ?? null)
  const [editing, setEditing] = useState(verified == null && !pending)
  const [mill, setMill] = useState('')
  const [docType, setDocType] = useState(null)
  const [file, setFile] = useState(null)
  const [nameOnDoc, setNameOnDoc] = useState(null) // 'self' | 'previous_owner'
  const [prevOwner, setPrevOwner] = useState('')
  const [attest, setAttest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const fileInput = useRef(null)

  const needsProof = askMillesimi && tenure === 'owner' && editing
  const millValue = parseMillesimi(mill)
  const millInvalid = mill.trim() !== '' && (millValue == null || millValue <= 0)
  const fileErr = file ? validateMillesimiFile(file) : null
  const proofOk = millValue != null && millValue > 0 && !!docType && !!file && !fileErr && !!nameOnDoc
    && (nameOnDoc === 'self' || prevOwner.trim().length >= 3) && attest
  const canSave = tenure === 'tenant' || (tenure === 'owner' && (!needsProof || proofOk))

  async function submit() {
    setSaving(true); setErr(null)
    const proof = needsProof
      ? { millesimi: millValue, documentType: docType, file, nameOnDocument: nameOnDoc, previousOwnerName: nameOnDoc === 'previous_owner' ? prevOwner.trim() : null }
      : null
    const error = await onSubmit({ tenure, floor, proof })
    setSaving(false)
    if (error) setErr(error)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={label}>In questa casa sei</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['owner', 'Proprietario', House], ['tenant', 'In affitto', KeyRound]].map(([v, t, Icon]) => {
            const on = tenure === v
            return (
              <button key={v} type="button" onClick={() => setTenure(v)} aria-pressed={on} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 0, height: 52, borderRadius: 14,
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)',
                color: on ? 'var(--teal-dk)' : 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}><Icon size={18} strokeWidth={2} aria-hidden="true" />{t}</button>
            )
          })}
        </div>
      </div>

      {tenure === 'owner' && !askMillesimi && (
        <Note icon={Info}>Dopo l&apos;ingresso potrai dichiarare i tuoi millesimi dalla scheda &quot;La tua casa&quot;, caricando il riparto spese o il regolamento di condominio.</Note>
      )}

      {tenure === 'owner' && askMillesimi && !editing && (
        <div style={statusBox}>
          {pending ? (
            <StatusLine icon={Clock} color="#B54708" title={`${fmtMill(pending.millesimi)} millesimi in verifica`}
              text="L'amministratore sta controllando il documento che hai caricato." />
          ) : (
            <StatusLine icon={CircleCheck} color="var(--teal)" title={`${fmtMill(verified)} millesimi verificati`}
              text="Confermati dall'amministratore sulla base del tuo documento." />
          )}
          <button type="button" onClick={() => setEditing(true)} style={linkBtn}>
            {pending ? 'Sostituisci documento o millesimi' : 'Sono cambiati? Carica un nuovo documento'}
          </button>
        </div>
      )}

      {needsProof && (
        <>
          {rejected && (
            <StatusLine icon={CircleAlert} color="#B42318" title="La richiesta precedente non è stata accettata"
              text={rejected.reject_reason ? `Motivo: ${rejected.reject_reason}` : 'Controlla il documento e riprova.'} />
          )}

          <label>
            <div style={label}>Quanti millesimi hai?</div>
            <div style={{ position: 'relative' }}>
              <input inputMode="decimal" value={mill} onChange={(e) => setMill(e.target.value)} placeholder="Es. 42,350"
                style={{ ...field, paddingRight: 56, borderColor: millInvalid ? '#B42318' : 'var(--border)' }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>‰</span>
            </div>
            {millInvalid && <p style={errText}>Inserisci un numero maggiore di 0 e fino a 1000.</p>}
            <Note icon={Info}>Li trovi nel riparto spese o nel regolamento di condominio (tabella A, proprietà generale). Se hai più unità, sommali.</Note>
          </label>

          <div>
            <div style={label}>Documento che lo dimostra</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DOCUMENT_TYPES.map((d) => {
                const on = docType === d.value
                return (
                  <button key={d.value} type="button" onClick={() => setDocType(d.value)} aria-pressed={on} style={{ ...choice, borderColor: on ? 'var(--teal)' : 'var(--border)', background: on ? 'var(--teal-lt)' : 'var(--white)' }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: on ? 'var(--teal-dk)' : 'var(--text)' }}>{d.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.35 }}>{d.hint}</span>
                  </button>
                )
              })}
            </div>

            <input ref={fileInput} type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic,.heic" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f) }} />
            {file ? (
              <div style={{ ...fileRow, borderColor: fileErr ? '#B42318' : 'var(--border)' }}>
                <FileText size={20} strokeWidth={1.9} aria-hidden="true" style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600 }}>{file.name}</span>
                <button type="button" aria-label="Rimuovi il file" onClick={() => setFile(null)} style={iconBtn}><X size={16} aria-hidden="true" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInput.current?.click()} style={uploadBtn}>
                <FileUp size={20} strokeWidth={1.9} aria-hidden="true" /> Carica PDF o foto
              </button>
            )}
            {fileErr && <p style={errText}>{fileErr}</p>}
            <Note icon={Info}>Lo vede solo l&apos;amministratore del condominio (o lo staff Condoreco se non c&apos;è) e viene cancellato appena la verifica è conclusa.</Note>
          </div>

          <div>
            <div style={label}>Di chi è il nome sul documento?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['self', 'Il mio'], ['previous_owner', 'Del proprietario precedente']].map(([v, t]) => {
                const on = nameOnDoc === v
                return (
                  <button key={v} type="button" onClick={() => setNameOnDoc(v)} aria-pressed={on} style={{ ...choice, justifyContent: 'center', minHeight: 52, borderColor: on ? 'var(--teal)' : 'var(--border)', background: on ? 'var(--teal-lt)' : 'var(--white)' }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: on ? 'var(--teal-dk)' : 'var(--text)', textAlign: 'center' }}>{t}</span>
                  </button>
                )
              })}
            </div>
            {nameOnDoc === 'previous_owner' && (
              <label style={{ display: 'block', marginTop: 10 }}>
                <div style={{ ...label, fontWeight: 600, fontSize: 13.5 }}>Nome e cognome del proprietario precedente, come scritto sul documento</div>
                <input value={prevOwner} onChange={(e) => setPrevOwner(e.target.value)} maxLength={120} placeholder="Es. Mario Rossi" style={field} />
                <Note icon={Info}>Serve all&apos;amministratore per collegare la tua unità al documento se sei appena subentrato.</Note>
              </label>
            )}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-2)' }}>
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: 'var(--teal)' }} />
            <span>
              Dichiaro che il documento caricato è autentico, riguarda la mia unità in questo condominio e che i millesimi indicati sono corretti.
              So che una dichiarazione falsa comporta l&apos;annullamento dei millesimi e può portare all&apos;esclusione dall&apos;area condominio.
            </span>
          </label>

          {(verified != null || pending) && (
            <button type="button" onClick={() => setEditing(false)} style={{ ...linkBtn, alignSelf: 'flex-start' }}>Lascia com&apos;è</button>
          )}
        </>
      )}

      {tenure === 'tenant' && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.45 }}>
          I millesimi sono del proprietario: non ti servono per usare Condoreco.
        </p>
      )}

      <div>
        <div style={label}>A che piano abiti? <span style={{ fontWeight: 500, color: 'var(--text-4)' }}>(per gli avvisi dei vicini)</span></div>
        <FloorPicker building={building} value={floor} onChange={setFloor} />
      </div>

      {err && <p style={errText}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: onCancel ? '1fr 1.4fr' : '1fr', gap: 8 }}>
        {onCancel && <button type="button" onClick={onCancel} style={ghostBtn}>Annulla</button>}
        <button type="button" disabled={!canSave || saving} onClick={submit} style={{ ...primaryBtn, opacity: canSave ? 1 : 0.5 }}>
          {saving ? 'Invio in corso...' : needsProof ? 'Invia per la verifica' : submitLabel}
        </button>
      </div>
    </div>
  )
}

function Note({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
      <Icon size={15} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: 'var(--teal)' }} />
      <span>{children}</span>
    </div>
  )
}

function StatusLine({ icon: Icon, color, title, text }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={20} strokeWidth={2} aria-hidden="true" style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  )
}

const primaryBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, minHeight: 0, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
const ghostBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 52, minHeight: 0, padding: '0 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
const linkBtn = { background: 'none', border: 'none', padding: 0, minHeight: 0, color: 'var(--teal)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'left' }
const iconBtn = { width: 32, height: 32, minHeight: 0, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
const choice = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minHeight: 0, padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', cursor: 'pointer', textAlign: 'left' }
const uploadBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 10, height: 52, minHeight: 0, borderRadius: 14, border: '1.5px dashed var(--teal)', background: 'var(--white)', color: 'var(--teal)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
const fileRow = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 12px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)' }
const statusBox = { display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg)' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 17, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
const label = { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }
const errText = { fontSize: 13, color: '#B42318', margin: '6px 0 0' }
