'use client'

import { AtSign, BadgeCheck, ChevronDown, Lock, MapPin, Pencil, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import AvatarPicker from '@/components/profile/AvatarPicker'
import { ROLES, avatarById, defaultAvatarFor } from '@/lib/avatars'
import { getCities } from '@/lib/cities'

// Modifica profilo: avatar in evidenza, dati bloccati (username e ruolo)
// raggruppati, poi i campi modificabili e il salvataggio fisso in basso.
export default function EditProfile({ open, onClose, profile, userId, onSave }) {
  const [data, setData] = useState(profile)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cities, setCities] = useState([])
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }))

  useEffect(() => {
    if (open) getCities().then(setCities)
  }, [open])

  if (!open) return null
  const roleConf = ROLES[data.role] || ROLES.condoranker
  const animal = avatarById(data.avatar_id) || defaultAvatarFor(userId)

  return (
    <Modal open={open} onClose={onClose} title="Modifica profilo"
      subtitle="Username e ruolo non si possono cambiare dopo la creazione."
      footer={<button type="button" className="ep-save" onClick={() => { onSave(data); onClose() }}>Salva modifiche</button>}>

      <div className="ep-hero">
        <button type="button" className="ep-avatar" style={{ borderColor: roleConf.color }} onClick={() => setPickerOpen(true)} aria-label="Cambia avatar">
          <img src={animal.src} alt="" />
          <span className="ep-avatar-edit" aria-hidden="true"><Pencil size={14} strokeWidth={2.4} /></span>
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, overflowWrap: 'anywhere' }}>
            {[data.first_name, data.last_name].filter(Boolean).join(' ') || `@${profile.username || 'utente'}`}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '2px 0 10px' }}>{roleConf.label} · {roleConf.sub}</div>
          <button type="button" className="ep-pill" onClick={() => setPickerOpen(true)}>Cambia avatar</button>
        </div>
      </div>

      <div className="ep-group">
        <div className="ep-locked">
          <span className="ep-locked-label">Username</span>
          <span className="ep-locked-value"><AtSign size={16} aria-hidden="true" />{profile.username || 'non impostato'}<Lock size={15} strokeWidth={2} aria-hidden="true" color="var(--text-4)" /></span>
        </div>
        <div className="ep-locked">
          <span className="ep-locked-label">Ruolo</span>
          <span className="ep-locked-value">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, fontSize: 13.5, color: roleConf.color, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: roleConf.color }} />{roleConf.label}
            </span>
            <Lock size={15} strokeWidth={2} aria-hidden="true" color="var(--text-4)" />
          </span>
        </div>
      </div>

      <div className="ep-section">Dati personali</div>
      <div className="ep-row2">
        <label className="ep-field"><span className="ep-label">Nome</span>
          <span className="ep-input"><input value={data.first_name || ''} onChange={(e) => set('first_name', e.target.value)} placeholder="Nome" autoComplete="given-name" /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Cognome</span>
          <span className="ep-input"><input value={data.last_name || ''} onChange={(e) => set('last_name', e.target.value)} placeholder="Cognome" autoComplete="family-name" /></span>
        </label>
      </div>
      <label className="ep-field"><span className="ep-label">Telefono</span>
        <span className="ep-input">
          <span className="ep-prefix">+39</span>
          <input type="tel" inputMode="tel" value={data.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="345 123 4567" autoComplete="tel-national" />
        </span>
      </label>
      <label className="ep-field"><span className="ep-label">Zona</span>
        <span className="ep-input">
          <MapPin size={20} strokeWidth={2} className="ep-ico" aria-hidden="true" />
          <select value={data.zone || ''} onChange={(e) => set('zone', e.target.value)} style={{ paddingRight: 40 }}>
            <option value="">Seleziona una città</option>
            {cities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <ChevronDown size={20} strokeWidth={2} className="ep-chev" aria-hidden="true" />
        </span>
      </label>

      <div className="ep-section" style={{ marginTop: 10 }}>Verifica residenza</div>
      {data.verified ? (
        <div className="ep-verify is-ok">
          <span className="ep-verify-ico"><BadgeCheck size={22} aria-hidden="true" /></span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Residenza verificata</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 2 }}>Le tue recensioni mostrano il badge di residente.</div>
          </div>
        </div>
      ) : (
        <div className="ep-verify">
          <span className="ep-verify-ico"><ShieldCheck size={22} aria-hidden="true" /></span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Non ancora verificata</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.45 }}>Si verifica dalla pagina del tuo condominio, quando entri nell&apos;Area condominiale.</div>
          </div>
        </div>
      )}

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        current={data.avatar_id} onSelect={(id) => set('avatar_id', id)} />
    </Modal>
  )
}
