'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import AdminReviewForm from '@/components/admins/AdminReviewForm'

export default function AdminActions({ admin }) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Recensioni</div>
        <Button variant="primary" onClick={() => setFormOpen(true)}>Scrivi una recensione</Button>
      </div>

      <AdminReviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        admin={admin}
      />
    </>
  )
}
