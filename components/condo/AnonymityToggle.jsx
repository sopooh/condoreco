'use client'

import { Eye, EyeOff } from 'lucide-react'

// Scelta tra voto palese (i residenti vedono chi ha votato cosa) e anonimo.
export default function AnonymityToggle({ value, onChange, disabled = false }) {
  const opts = [
    { v: false, icon: Eye, t: 'Voto palese', d: 'I residenti vedono chi ha votato e come.' },
    { v: true, icon: EyeOff, t: 'Voto anonimo', d: 'Si vedono solo i totali, non i nomi.' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {opts.map(({ v, icon: Icon, t, d }) => {
        const on = value === v
        return (
          <button key={t} type="button" disabled={disabled} onClick={() => onChange(v)} aria-pressed={on} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left', minHeight: 0,
            padding: '12px 12px', borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !on ? 0.5 : 1,
            border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--text)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: on ? 'var(--teal-dk)' : 'var(--text)' }}>
              <Icon size={16} strokeWidth={2} aria-hidden="true" />{t}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.35 }}>{d}</span>
          </button>
        )
      })}
    </div>
  )
}
