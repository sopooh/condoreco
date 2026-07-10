'use client'

import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({ open, onClose, title, message, confirmLabel = 'Elimina', busy, error, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
      {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" block onClick={onClose} disabled={busy}>Annulla</Button>
        <button onClick={onConfirm} disabled={busy} style={{
          flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14, padding: 13, cursor: 'pointer',
        }}>{busy ? 'Eliminazione...' : confirmLabel}</button>
      </div>
    </Modal>
  )
}
