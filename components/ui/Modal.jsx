'use client'

import { useEffect } from 'react'

export default function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(3px)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        background: 'var(--white)', borderRadius: 12, padding: 32,
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'var(--bg)',
          border: 'none', borderRadius: '50%', width: 28, height: 28,
          fontSize: 14, color: 'var(--text-3)',
        }}>✕</button>
        {title && <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 24, fontWeight: 500 }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}
