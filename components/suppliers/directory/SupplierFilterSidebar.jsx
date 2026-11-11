'use client'

import { Check, Layers, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { MAINTENANCE_CATEGORIES } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'

export const SUPPLIER_SORTS = [
  { id: 'verified', label: 'Verificati prima' },
  { id: 'jobs', label: 'Più interventi completati' },
  { id: 'condos', label: 'Più condomini serviti' },
  { id: 'recent', label: 'Iscritti di recente' },
  { id: 'name', label: 'Nome (A-Z)' },
]

function readParams(sp) {
  return {
    cats: (sp.get('cat') || '').split(',').filter(Boolean),
  }
}

// Pannello filtri dei fornitori, stesso stile del pannello di Esplora (.fpanel).
// instant: colonna desktop, applica subito. Altrimenti bozza fino ad "Applica filtri".
export default function SupplierFilterSidebar({ categoryCounts = {}, instant = true, onApplied }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = readParams(searchParams)
  const [draft, setDraft] = useState(current)
  const v = instant ? current : draft

  function push(next) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.cats.length) params.set('cat', next.cats.join(',')); else params.delete('cat')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  function update(patch) {
    const next = { ...v, ...patch }
    if (instant) push(next); else setDraft(next)
  }
  const toggleCat = (id) => update({ cats: v.cats.includes(id) ? v.cats.filter((x) => x !== id) : [...v.cats, id] })
  const reset = { cats: [] }

  return (
    <div className={`fpanel ${instant ? 'is-side' : 'is-sheet'}`}>
      <section className="fpanel-sec">
        <h3 className="fpanel-title"><Layers size={22} strokeWidth={1.8} aria-hidden="true" />Categorie</h3>
        <div className="fpanel-amen">
          {MAINTENANCE_CATEGORIES.map((c) => {
            const on = v.cats.includes(c.value)
            const n = categoryCounts[c.value] || 0
            return (
              <label key={c.value} className={`fpanel-chip ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleCat(c.value)} />
                <span className="fpanel-box" aria-hidden="true">{on && <Check size={14} strokeWidth={3} aria-hidden="true" />}</span>
                <span className="fpanel-chip-icon"><MaintenanceIcon name={c.icon} size={20} /></span>
                <span className="fpanel-chip-label">{c.label}</span>
                <span aria-label={`${n} fornitori`} style={instant
                  ? { marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: n ? 'var(--teal-dk)' : 'var(--text-4)', flexShrink: 0 }
                  : { position: 'absolute', top: 5, right: 8, fontSize: 10.5, fontWeight: 800, color: n ? 'var(--teal-dk)' : 'var(--text-4)' }}>{n}</span>
              </label>
            )
          })}
        </div>
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
