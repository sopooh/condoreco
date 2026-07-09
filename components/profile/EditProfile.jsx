'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import AvatarPicker from '@/components/profile/AvatarPicker'
import { ROLES, avatarById, defaultAvatarFor } from '@/lib/avatars'
import { getCities } from '@/lib/cities'

// Modifica profilo: NON e' a flashcard, e' una lista riassuntiva.
// Username e Ruolo sono mostrati in grigio, bloccati (non modificabili).
export default function EditProfile({ open, onClose, profile, userId, onSave }) {
  const [data, setData] = useState(profile)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cities, setCities] = useState([])
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }))

  useEffect(() => {
    if (open) getCities().then(setCities)
  }, [open])

  if (!open) return null
  const roleConf = ROLES[data.role]
  const animal = avatarById(data.avatar_id) || defaultAvatarFor(userId)

  return (
    <Modal open={open} onClose={onClose} title="Modifica profilo"
           subtitle="Username e ruolo non sono modificabili dopo la creazione.">

      {/* LOCKED: username */}
      <LockedRow label="Username" value={`@${profile.username || 'non impostato'}`} />

      {/* LOCKED: ruolo */}
      <LockedRow label="Ruolo" value={roleConf.label} dot={roleConf.color} />

      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 20px' }} />

      {/* EDITABLE: avatar */}
      <Field label="Avatar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${roleConf.color}`, flexShrink: 0 }}>
            <img src={animal.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <button onClick={() => setPickerOpen(true)} style={linkBtn}>Cambia avatar</button>
        </div>
      </Field>

      {/* EDITABLE: nome / cognome */}
      <Field label="Nome">
        <input value={data.first_name || ''} onChange={(e) => set('first_name', e.target.value)} placeholder="Nome" style={inp} />
      </Field>
      <Field label="Cognome">
        <input value={data.last_name || ''} onChange={(e) => set('last_name', e.target.value)} placeholder="Cognome" style={inp} />
      </Field>

      {/* EDITABLE: telefono */}
      <Field label="Telefono">
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ ...inp, width: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>+39</div>
          <input value={data.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="345 123 4567" style={{ ...inp, flex: 1 }} />
        </div>
      </Field>

      {/* EDITABLE: zona */}
      <Field label="Zona">
        <select value={data.zone || ''} onChange={(e) => set('zone', e.target.value)} style={inp}>
          <option value="">Seleziona una città</option>
          {cities.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </Field>

      {/* EDITABLE: verifica */}
      <Field label="Verifica residenza">
        {data.verified ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-dk)' }}>Verificato ✓</span>
        ) : (
          <button style={linkBtn}>Carica documento</button>
        )}
      </Field>

      <Button variant="primary" block onClick={() => { onSave(data); onClose() }} style={{ padding: 13, marginTop: 8 }}>
        Salva modifiche
      </Button>

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        current={data.avatar_id} onSelect={(id) => set('avatar_id', id)} />
    </Modal>
  )
}

function LockedRow({ label, value, dot }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-4)' }}>
        {dot && <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, opacity: 0.5 }} />}
        {value}
        <LockIcon />
      </span>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  )
}

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</label>
    {children}
  </div>
)
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--text)', outline: 'none' }
const linkBtn = { background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }
