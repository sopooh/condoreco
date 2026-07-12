'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ReviewForm from '@/components/reviews/ReviewForm'
import { ADMIN_RESIDENT_TYPES, ADMIN_REVIEW_CATEGORIES } from '@/lib/reviewOptions'

export default function AdminActions({ admin }) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Recensioni</div>
        <Button variant="primary" onClick={() => setFormOpen(true)}>Scrivi una recensione</Button>
      </div>

      <ReviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        table="admin_reviews"
        column="administrator_id"
        entityId={admin.id}
        subtitle={admin.name}
        residentTypes={ADMIN_RESIDENT_TYPES}
        categories={ADMIN_REVIEW_CATEGORIES}
        extras={{}}
      />
    </>
  )
}
