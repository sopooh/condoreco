'use client'

import { useState } from 'react'
import { FileText, Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { useInterventionFiles, FILE_KINDS, euro } from '@/hooks/useInterventionFiles'
import { useSession } from '@/components/providers/SessionProvider'

// Elenco e caricamento di preventivo, fattura e foto di un intervento
export default function InterventionFiles({ interventionId, canUpload = true, title = 'Preventivo, fattura e foto' }) {
  const session = useSession()
  const { files, loading, upload, open, remove } = useInterventionFiles(interventionId)
  const [kind, setKind] = useState('quote')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function view(f) {
    const w = window.open('', '_blank')
    const url = await open(f)
    if (!url) { w?.close(); setErr('Non riesco ad aprire il file.'); return }
    if (w) w.location.replace(url); else window.location.assign(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      {loading ? <p style={muted}>Caricamento...</p> : files.length === 0 ? <p style={muted}>Nessun documento caricato.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--white)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.kind === 'photo' ? 'var(--teal-lt)' : '#FDECEC', color: f.kind === 'photo' ? 'var(--teal-dk)' : '#C62828' }}>
                {f.kind === 'photo' ? <ImageIcon size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
              </span>
              <button type="button" onClick={() => view(f)} style={{ flex: 1, minWidth: 0, minHeight: 0, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--text)' }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{FILE_KINDS[f.kind]}{f.amount_cents != null ? ` · ${euro(f.amount_cents)}` : ''}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</span>
              </button>
              {f.uploaded_by === session?.user?.id && (
                <button type="button" aria-label="Elimina file" onClick={() => { if (confirm('Eliminare questo file?')) remove(f) }} style={{ minHeight: 0, border: 'none', background: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-3)' }}><Trash2 size={17} aria-hidden="true" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 14, background: '#F5F7F7' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(FILE_KINDS).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} style={{ minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${kind === k ? 'var(--teal)' : 'var(--border)'}`, background: kind === k ? 'var(--teal)' : 'var(--white)', color: kind === k ? '#fff' : 'var(--text)' }}>{l}</button>
            ))}
          </div>
          {kind !== 'photo' && (
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Importo in € (facoltativo)"
              style={{ height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px', fontSize: 16, background: 'var(--white)' }} />
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            <Upload size={18} strokeWidth={2} aria-hidden="true" />{busy ? 'Caricamento...' : `Carica ${FILE_KINDS[kind].toLowerCase()}`}
            <input type="file" accept={kind === 'photo' ? 'image/*' : '.pdf,image/*'} style={{ display: 'none' }} disabled={busy} onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (!f) return
              setBusy(true); setErr(null)
              const r = await upload(f, kind, kind === 'photo' ? null : amount)
              setBusy(false)
              if (r.error) setErr(r.error); else setAmount('')
            }} />
          </label>
        </div>
      )}
      {err && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{err}</p>}
    </div>
  )
}

const muted = { fontSize: 13.5, color: 'var(--text-3)', margin: 0 }
