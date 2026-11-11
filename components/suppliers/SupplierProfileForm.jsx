'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MAINTENANCE_CATEGORIES } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import { isValidVat } from '@/lib/suppliers'

// Scheda attività del Recofixer: ragione sociale, P.IVA, categorie, zone, contatti.
export default function SupplierProfileForm({ initial, onSubmit, submitLabel = 'Salva', onCancel }) {
  const [v, setV] = useState({
    company_name: initial?.company_name || '',
    vat_number: initial?.vat_number || '',
    categories: initial?.categories || [],
    zones: initial?.zones || [],
    phone: initial?.phone || '',
    email: initial?.email || '',
    description: initial?.description || '',
  })
  const [zone, setZone] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))
  const vatBad = v.vat_number.trim() !== '' && !isValidVat(v.vat_number)
  const canSave = v.company_name.trim().length >= 2 && v.categories.length > 0 && !vatBad && (v.phone.trim() || v.email.trim()) && !saving

  function addZone() {
    const z = zone.trim().replace(/\s+/g, ' ')
    if (z && !v.zones.some((x) => x.toLowerCase() === z.toLowerCase())) setV((x) => ({ ...x, zones: [...x.zones, z[0].toUpperCase() + z.slice(1)] }))
    setZone('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label><div style={lab}>Ragione sociale o nome</div>
        <input value={v.company_name} onChange={set('company_name')} placeholder="Es. Idrotech Srl" maxLength={120} style={fld} />
      </label>

      <label><div style={lab}>Partita IVA <span style={opt}>(consigliata: i profili verificati compaiono per primi)</span></div>
        <input value={v.vat_number} onChange={set('vat_number')} inputMode="numeric" placeholder="11 cifre" maxLength={13}
          style={{ ...fld, borderColor: vatBad ? '#B42318' : 'var(--border)' }} />
        {vatBad && <p style={errText}>Partita IVA non valida: controlla le 11 cifre.</p>}
      </label>

      <div><div style={lab}>Di cosa ti occupi?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {MAINTENANCE_CATEGORIES.filter((c) => c.value !== 'other').map((c) => {
            const on = v.categories.includes(c.value)
            return (
              <button key={c.value} type="button" aria-pressed={on}
                onClick={() => setV((x) => ({ ...x, categories: on ? x.categories.filter((k) => k !== c.value) : [...x.categories, c.value] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 0, padding: '10px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)', color: on ? 'var(--teal-dk)' : 'var(--text)', fontWeight: 700, fontSize: 13.5 }}>
                <MaintenanceIcon name={c.icon} size={20} />{c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div><div style={lab}>Dove lavori <span style={opt}>(città; vuoto = ovunque)</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={zone} onChange={(e) => setZone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZone() } }} placeholder="Es. Milano" style={{ ...fld, flex: 1 }} />
          <button type="button" onClick={addZone} disabled={!zone.trim()} style={{ ...ghost, opacity: zone.trim() ? 1 : 0.5 }}>Aggiungi</button>
        </div>
        {v.zones.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {v.zones.map((z) => (
              <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 6px 5px 12px', borderRadius: 999, background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13 }}>
                {z}
                <button type="button" aria-label={`Togli ${z}`} onClick={() => setV((x) => ({ ...x, zones: x.zones.filter((k) => k !== z) }))} style={{ minHeight: 0, border: 'none', background: 'none', padding: 2, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={14} aria-hidden="true" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label><div style={lab}>Telefono</div><input value={v.phone} onChange={set('phone')} type="tel" placeholder="333 123 4567" style={fld} /></label>
        <label><div style={lab}>Email</div><input value={v.email} onChange={set('email')} type="email" placeholder="info@azienda.it" style={fld} /></label>
      </div>

      <label><div style={lab}>Presentazione <span style={opt}>(facoltativa)</span></div>
        <textarea value={v.description} onChange={set('description')} maxLength={600} placeholder="Esperienza, orari, pronto intervento..." style={{ ...fld, minHeight: 80, resize: 'vertical' }} />
      </label>

      {err && <p style={errText}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: onCancel ? '1fr 1.4fr' : '1fr', gap: 8 }}>
        {onCancel && <button type="button" onClick={onCancel} style={ghost}>Annulla</button>}
        <button type="button" disabled={!canSave} onClick={async () => {
          setSaving(true); setErr(null)
          const e = await onSubmit(v)
          setSaving(false)
          if (e) setErr(e)
        }} style={{ ...primary, opacity: canSave ? 1 : 0.5 }}>{saving ? 'Salvataggio...' : submitLabel}</button>
      </div>
    </div>
  )
}

const lab = { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }
const opt = { fontWeight: 500, color: 'var(--text-4)' }
const fld = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', background: 'var(--white)' }
const errText = { fontSize: 13, color: '#B42318', margin: '6px 0 0' }
const primary = { minHeight: 0, height: 52, borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }
const ghost = { minHeight: 0, height: 46, padding: '0 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }
