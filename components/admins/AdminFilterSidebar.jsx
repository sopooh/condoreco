'use client'

import { useState } from 'react'
import { Check, MessageSquareText, RotateCcw } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FeeRangeSection, FEE_MIN, FEE_MAX } from '@/components/search/FilterSidebar'

function readParams(sp) {
  return {
    feeMin: sp.get('feeMin') ? Number(sp.get('feeMin')) : FEE_MIN,
    feeMax: sp.get('feeMax') ? Number(sp.get('feeMax')) : FEE_MAX,
    reviewed: sp.get('rec') === '1',
  }
}

// Filtri della lista Amministratori, stesso pannello di Esplora (.fpanel).
// instant: colonna desktop, applica subito. Altrimenti bozza fino ad "Applica filtri".
export default function AdminFilterSidebar({ feeCounts = [], instant = true, onApplied }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = readParams(searchParams)
  const [draft, setDraft] = useState(current)
  const v = instant ? current : draft

  function push(next) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.feeMin !== FEE_MIN) params.set('feeMin', String(next.feeMin)); else params.delete('feeMin')
    if (next.feeMax !== FEE_MAX) params.set('feeMax', String(next.feeMax)); else params.delete('feeMax')
    if (next.reviewed) params.set('rec', '1'); else params.delete('rec')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  function update(patch) {
    const next = { ...v, ...patch }
    if (instant) push(next); else setDraft(next)
  }
  const reset = { feeMin: FEE_MIN, feeMax: FEE_MAX, reviewed: false }

  return (
    <div className={`fpanel ${instant ? 'is-side' : 'is-sheet'}`}>
      <FeeRangeSection fees={feeCounts} feeMin={v.feeMin} feeMax={v.feeMax} onChange={update} title="Spesa media dei condomini" />

      <section className="fpanel-sec">
        <h3 className="fpanel-title"><MessageSquareText size={22} strokeWidth={1.8} aria-hidden="true" />Recensioni</h3>
        <label className={`fpanel-chip ${v.reviewed ? 'is-on' : ''}`}>
          <input type="checkbox" checked={v.reviewed} onChange={() => update({ reviewed: !v.reviewed })} />
          <span className="fpanel-box" aria-hidden="true">{v.reviewed && <Check size={14} strokeWidth={3} aria-hidden="true" />}</span>
          <span className="fpanel-chip-label">Solo con almeno una recensione</span>
        </label>
      </section>

      <div className="fpanel-actions">
        {!instant && (
          <button type="button" className="fpanel-apply" onClick={() => { push(draft); onApplied?.() }}>Applica filtri</button>
        )}
        <button type="button" className="fpanel-reset" onClick={() => { if (instant) push(reset); else setDraft(reset) }}>
          <RotateCcw size={20} strokeWidth={1.8} aria-hidden="true" />Reimposta filtri
        </button>
      </div>
    </div>
  )
}
