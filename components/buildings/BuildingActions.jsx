'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import BuildingReviewForm from '@/components/reviews/BuildingReviewForm'
import VivoQuiFlow from '@/components/buildings/VivoQuiFlow'

export default function BuildingActions({ building }) {
  const [formOpen, setFormOpen] = useState(false)
  const [vivoQuiOpen, setVivoQuiOpen] = useState(false)

  return (
    <>
      <div className="building-actions-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Valutazione per categoria</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setVivoQuiOpen(true)} style={{
            padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--teal)',
            background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Vivo qui</button>
          <Button variant="primary" onClick={() => setFormOpen(true)}>Scrivi una recensione</Button>
        </div>
      </div>

      <BuildingReviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        building={building}
      />

      <VivoQuiFlow
        open={vivoQuiOpen}
        onClose={() => setVivoQuiOpen(false)}
        building={building}
      />
    </>
  )
}
