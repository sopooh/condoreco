'use client'

import { useState } from 'react'
import { House, ChevronRight } from 'lucide-react'
import { useNeighbourNotices, floorLabel } from '@/hooks/useNeighbourNotices'
import UnitForm from '@/components/condo/UnitForm'
import { Sheet } from '@/components/condo/InterventionsPage'

const fmtMill = (n) => Number(n).toLocaleString('it-IT', { maximumFractionDigits: 3 })

// Hub del condominio: riepilogo "La tua casa" (proprietario/inquilino,
// millesimi, piano). Se mancano i dati diventa un invito a completarli.
export default function MyUnitBanner({ building }) {
  const { myUnit, saveUnit } = useNeighbourNotices(building.id)
  const [open, setOpen] = useState(false)
  if (myUnit === undefined || myUnit === null) return null

  const missing = !myUnit.tenure || (myUnit.tenure === 'owner' && myUnit.millesimi == null)
  const summary = [
    myUnit.tenure === 'owner' ? 'Proprietario' : myUnit.tenure === 'tenant' ? 'In affitto' : null,
    myUnit.millesimi != null ? `${fmtMill(myUnit.millesimi)} millesimi` : null,
    myUnit.floor ? floorLabel(myUnit.floor) : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 0, textAlign: 'left', cursor: 'pointer',
        padding: '14px 16px', borderRadius: 18, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: `1.5px solid ${missing ? '#E8651A' : 'var(--border)'}`, background: missing ? '#FFF6EF' : 'var(--white)', color: 'var(--text)',
      }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: missing ? '#FDE3D0' : 'var(--teal-lt)', color: missing ? '#C2410C' : 'var(--teal-dk)' }}>
          <House size={22} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15.5, fontWeight: 800 }}>{missing ? 'Completa i dati della tua casa' : 'La tua casa'}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
            {missing ? 'Indica se sei proprietario e quanti millesimi hai.' : summary}
          </span>
        </span>
        <ChevronRight size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--text-4)', flexShrink: 0 }} />
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} title="La tua casa" subtitle={`${building.address}${building.street_number ? `, ${building.street_number}` : ''}`}>
          <UnitForm building={building} initial={myUnit} onCancel={() => setOpen(false)} onSubmit={async (v) => {
            const { error } = await saveUnit(v)
            if (!error) setOpen(false)
            return error
          }} />
        </Sheet>
      )}
    </>
  )
}
