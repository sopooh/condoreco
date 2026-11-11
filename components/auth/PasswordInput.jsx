'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export function PasswordInput({ value, onChange, autoComplete, placeholder = 'Password', id, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <span className="ep-input">
      <Lock size={20} strokeWidth={2} className="ep-ico" aria-hidden="true" />
      <input id={id} type={show ? 'text' : 'password'} required value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} />
      <button type="button" className="auth-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Nascondi password' : 'Mostra password'}>
        {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </span>
  )
}
