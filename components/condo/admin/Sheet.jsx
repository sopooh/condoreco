'use client'

import { X } from 'lucide-react'

// Foglio dal basso (mobile) / finestra (desktop), stesso stile della Contabilità
export default function Sheet({ title, kicker, onClose, children, wide = false }) {
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet" style={{ maxHeight: '92vh', overflowY: 'auto', maxWidth: wide ? 640 : 520 }}>
        <div className="dir-sheet-head">
          <div>{kicker && <div className="dir-sheet-kicker">{kicker}</div>}<div className="dir-sheet-title">{title}</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const toNumber = (v) => {
  const s = String(v ?? '').replace(/[€\s]/g, '')
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : NaN
}
