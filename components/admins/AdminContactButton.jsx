'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

// Unico punto della UI dove contattare l'amministratore: prima esisteva anche
// un bottone "Contatta" nella card della lista (rimosso, non aveva nemmeno un
// onClick), ora l'azione vive solo qui, nel profilo.
export default function AdminContactButton({ admin: a }) {
  const [open, setOpen] = useState(false)

  if (!a.phone && !a.email) return null

  return (
    <div>
      <Button variant="primary" onClick={() => setOpen((v) => !v)}>
        Contatta
      </Button>
      {open && (
        <div style={{
          marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6,
          fontSize: 13, fontWeight: 600,
        }}>
          {a.phone && (
            <a href={`tel:${a.phone}`} style={{ color: 'var(--teal-dk)' }}>{a.phone}</a>
          )}
          {a.email && (
            <a href={`mailto:${a.email}`} style={{ color: 'var(--teal-dk)' }}>{a.email}</a>
          )}
        </div>
      )}
    </div>
  )
}
