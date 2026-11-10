'use client'

import { useState } from 'react'
import { KeyRound, House, Info } from 'lucide-react'
import { FloorPicker } from '@/components/condo/NeighbourNotice'
import { parseMillesimi } from '@/hooks/useNeighbourNotices'

// Dati dell'unità del residente: proprietario o inquilino, millesimi
// (obbligatori per i proprietari) e piano.
export default function UnitForm({ building, initial, submitLabel = 'Salva', onSubmit, onCancel }) {
  const [tenure, setTenure] = useState(initial?.tenure ?? null)
  const [mill, setMill] = useState(initial?.millesimi != null ? String(initial.millesimi).replace('.', ',') : '')
  const [floor, setFloor] = useState(initial?.floor ?? null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const millValue = parseMillesimi(mill)
  const millInvalid = tenure === 'owner' && mill.trim() !== '' && millValue == null
  const canSave = tenure === 'tenant' || (tenure === 'owner' && millValue != null)

  async function submit() {
    setSaving(true); setErr(null)
    const error = await onSubmit({ tenure, millesimi: tenure === 'owner' ? millValue : null, floor })
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

      {tenure === 'owner' && (
        <label>
          <div style={label}>Quanti millesimi hai?</div>
          <div style={{ position: 'relative' }}>
            <input inputMode="decimal" value={mill} onChange={(e) => setMill(e.target.value)} placeholder="Es. 42,350"
              style={{ ...field, paddingRight: 56, borderColor: millInvalid ? '#B42318' : 'var(--border)' }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>‰</span>
          </div>
          {millInvalid && <p style={errText}>Inserisci un numero tra 0 e 1000.</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
            <Info size={15} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: 'var(--teal)' }} />
            <span>Li trovi nel riparto spese o nel regolamento di condominio (tabella A, proprietà generale). Se hai più unità, sommali.</span>
          </div>
        </label>
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
          {saving ? 'Salvataggio...' : submitLabel}
        </button>
      </div>
    </div>
  )
}

const primaryBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, minHeight: 0, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
const ghostBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 52, minHeight: 0, padding: '0 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 17, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
const label = { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }
const errText = { fontSize: 13, color: '#B42318', margin: '6px 0 0' }
