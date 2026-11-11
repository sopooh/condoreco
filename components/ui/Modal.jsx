'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

// Finestra centrata. Il pulsante di chiusura è lo stesso del menu e dei fogli
// (cerchio da 44px, X teal), nell'intestazione e non sovrapposto al titolo.
export default function Modal({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-modal-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="ui-modal-head">
          <div style={{ minWidth: 0 }}>
            {title && <div className="ui-modal-title">{title}</div>}
            {subtitle && <div className="ui-modal-sub">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ui-modal-close">
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
