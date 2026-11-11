'use client'

import { useEffect } from 'react'
import { Copy, Mail, MessageCircle, Phone, X } from 'lucide-react'
import { mailLink, telLink, waLink } from '@/lib/contact'

// Foglio dal basso (mobile) / finestra (desktop) con i modi per contattare.
export default function ContactSheet({ open, onClose, name, phone, email, note }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const rows = [
    phone && { href: telLink(phone), icon: <Phone size={20} />, label: 'Chiama', sub: phone },
    phone && { href: waLink(phone, ''), icon: <MessageCircle size={20} />, label: 'WhatsApp', sub: phone, external: true },
    email && { href: mailLink(email, '', ''), icon: <Mail size={20} />, label: 'Email', sub: email },
  ].filter(Boolean)
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label={`Contatta ${name}`}>
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div>
            <div className="dir-sheet-kicker">Contatta</div>
            <div className="dir-sheet-title">{name}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="dir-sheet-close"><X size={22} /></button>
        </div>
        {rows.map((r) => (
          <a key={r.label} href={r.href} className="dir-sheet-row" {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <span className="dir-sheet-ico">{r.icon}</span>
            <span style={{ minWidth: 0 }}><strong>{r.label}</strong><small>{r.sub}</small></span>
          </a>
        ))}
        {email && (
          <button type="button" className="dir-sheet-copy" onClick={() => navigator.clipboard?.writeText(email)}>
            <Copy size={16} aria-hidden="true" />Copia email
          </button>
        )}
        {note && <p className="dir-sheet-note">{note}</p>}
      </div>
    </div>
  )
}
