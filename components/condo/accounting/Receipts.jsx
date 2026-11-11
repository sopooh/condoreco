'use client'

import { useMemo, useState } from 'react'
import { Check, FileText, Paperclip, Upload, X } from 'lucide-react'
import { receiptUrl } from '@/hooks/useAccounting'
import { euro, fmtDay, todayISO } from '@/lib/accounting'

export const RECEIPT_STATUS = {
  pending: { label: 'In verifica', bg: '#EEF4FF', fg: '#1D4ED8' },
  approved: { label: 'Validata', bg: '#ECFDF3', fg: '#067647' },
  rejected: { label: 'Respinta', bg: '#FEF3F2', fg: '#B42318' },
}

// Apre la contabile in una nuova scheda (prima la scheda, poi il link: Safari blocca i popup dopo un'attesa)
export async function openReceipt(path) {
  const w = window.open('', '_blank')
  const url = await receiptUrl(path)
  if (!url) { w?.close(); alert('File non disponibile.'); return }
  if (w) w.location.href = url; else window.location.assign(url)
}

// Foglio "Carica contabile": file, rate coperte, importo, data del bonifico
export function ReceiptSheet({ charges, preselected = [], onClose, onSubmit }) {
  const [file, setFile] = useState(null)
  const [sel, setSel] = useState(() => new Set(preselected))
  const [paidOn, setPaidOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const total = useMemo(() => charges.filter((c) => sel.has(c.id)).reduce((n, c) => n + Number(c.amount), 0), [charges, sel])
  const [amountText, setAmountText] = useState('')
  const amount = amountText ? Number(amountText.replace(/\./g, '').replace(',', '.')) : total
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function submit() {
    if (!file) return setErr('Scegli il file della contabile.')
    if (!sel.size) return setErr('Indica quali rate paga questo bonifico.')
    if (!(amount > 0)) return setErr('Importo non valido.')
    setBusy(true); setErr(null)
    const r = await onSubmit({ file, chargeIds: [...sel], amount, paidOn, note })
    setBusy(false)
    if (r?.error) setErr(r.error); else setDone(true)
  }

  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Carica contabile">
      <div className="dir-sheet-backdrop" onClick={busy ? undefined : onClose} />
      <div className="dir-sheet" style={{ maxHeight: '92vh', overflowY: 'auto', maxWidth: 520 }}>
        <div className="dir-sheet-head">
          <div><div className="dir-sheet-kicker">Bonifico fatto</div><div className="dir-sheet-title">{done ? 'Contabile inviata' : 'Carica la contabile'}</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {done ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)', margin: '0 0 16px' }}>
              L&apos;amministratore la controlla e convalida il pagamento. Intanto le rate risultano &quot;da confermare&quot; e la contabile resta nel tuo archivio.
            </p>
            <button type="button" className="ep-save" onClick={onClose}>Chiudi</button>
          </>
        ) : (
          <>
            <label className={`rcp-drop${file ? ' has-file' : ''}`}>
              {file ? <FileText size={26} aria-hidden="true" /> : <Upload size={26} aria-hidden="true" />}
              <strong>{file ? file.name : 'Scegli il PDF o la foto della contabile'}</strong>
              <small>{file ? 'Tocca per cambiarla' : 'Quella che ti dà la banca dopo il bonifico · max 10 MB'}</small>
              <input type="file" hidden accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f) }} />
            </label>

            {charges.length > 0 && (
              <>
                <span className="ep-label">Rate pagate con questo bonifico</span>
                <div className="pay-list">
                  {charges.map((c) => {
                    const on = sel.has(c.id)
                    return (
                      <label key={c.id} className={`pay-row${on ? ' is-on' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                        <span className="pay-box" aria-hidden="true">{on && <Check size={14} strokeWidth={3} />}</span>
                        <span style={{ flex: 1, minWidth: 0 }}><strong>{c.title}</strong><small>Scadenza {fmtDay(c.due_date)}</small></span>
                        <b>{euro(c.amount)}</b>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            <div className="ep-row2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="ep-field"><span className="ep-label">Importo del bonifico</span>
                <span className="ep-input"><span className="ep-prefix">€</span><input inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder={total ? total.toFixed(2).replace('.', ',') : '0,00'} /></span>
              </label>
              <label className="ep-field"><span className="ep-label">Data del bonifico</span>
                <span className="ep-input"><input type="date" value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} /></span>
              </label>
            </div>
            <label className="ep-field"><span className="ep-label">Nota (facoltativa)</span>
              <span className="ep-input"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Es. pagato anche per mio fratello, interno 4" /></span>
            </label>
            {err && <p className="auth-err">{err}</p>}
            <button type="button" className="ep-save" disabled={busy} onClick={submit}>{busy ? 'Invio…' : 'Invia all’amministratore'}</button>
          </>
        )}
      </div>
    </div>
  )
}

// Archivio delle contabili del condomino
export function ReceiptsBox({ receipts, canUpload, onUpload }) {
  const [all, setAll] = useState(false)
  const list = all ? receipts : receipts.slice(0, 3)
  return (
    <div className="rc-box">
      <div className="rc-box-head">
        <span><Paperclip size={20} aria-hidden="true" />Contabili dei bonifici</span>
        {canUpload && <button type="button" className="rc-link" onClick={onUpload}><Upload size={16} aria-hidden="true" />Carica</button>}
      </div>
      {receipts.length === 0 ? (
        <p className="rc-muted" style={{ margin: 0 }}>Hai pagato con bonifico? Carica la contabile: l&apos;amministratore la convalida e resta qui in archivio.</p>
      ) : (
        <ul className="rcp-list">
          {list.map((r) => {
            const st = RECEIPT_STATUS[r.status]
            return (
              <li key={r.id}>
                <button type="button" onClick={() => openReceipt(r.file_path)} className="rcp-file" aria-label={`Apri ${r.file_name}`}>
                  <span className="rcp-ico"><FileText size={18} aria-hidden="true" /></span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <strong>{r.file_name}</strong>
                    <small>{[r.amount ? euro(r.amount) : null, r.paid_on ? `bonifico del ${fmtDay(r.paid_on)}` : `caricata il ${fmtDay(r.created_at)}`].filter(Boolean).join(' · ')}</small>
                    {r.status === 'rejected' && r.reject_reason && <small style={{ color: '#B42318' }}>Motivo: {r.reject_reason}</small>}
                  </span>
                  <span className="acc-pill" style={{ background: st.bg, color: st.fg, margin: 0 }}>{st.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {receipts.length > 3 && <button type="button" className="rc-link" style={{ marginTop: 8 }} onClick={() => setAll((v) => !v)}>{all ? 'Mostra meno' : `Vedi tutte (${receipts.length})`}</button>}
    </div>
  )
}
