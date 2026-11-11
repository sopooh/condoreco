'use client'

import { ChevronDown } from 'lucide-react'
import { useParamNav } from './useParamNav'

// "Ordina per: X" accanto al conteggio. Scegliere un ordinamento toglie le
// tab che ordinano già da sole (es. Più recensiti), non quelle che filtrano.
export default function SortSelect({ sorts, defaultId, tabsThatSort = [] }) {
  const { searchParams, setParams } = useParamNav()
  const tab = searchParams.get('tab') || ''
  const value = searchParams.get('sort') || defaultId
  const label = sorts.find((s) => s.id === value)?.label || sorts[0].label
  return (
    <label className="dir-sort">
      <span>Ordina per:</span>
      <strong>{label}</strong>
      <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
      <select value={value} aria-label="Ordina per"
        onChange={(e) => setParams({ sort: e.target.value === defaultId ? null : e.target.value, ...(tabsThatSort.includes(tab) ? { tab: null } : {}) })}>
        {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </label>
  )
}
