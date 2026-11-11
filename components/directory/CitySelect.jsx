'use client'

import { ChevronDown, MapPin } from 'lucide-react'
import { useParamNav } from './useParamNav'

export default function CitySelect({ cities, allLabel = 'Tutte le città' }) {
  const { searchParams, setParams } = useParamNav()
  const city = searchParams.get('city') || ''
  return (
    <label className="dir-ctrl dir-city">
      <MapPin size={20} strokeWidth={2} aria-hidden="true" className="dir-ctrl-icon" />
      <select value={city} onChange={(e) => setParams({ city: e.target.value })} aria-label="Città">
        <option value="">{allLabel}</option>
        {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
      <ChevronDown size={20} strokeWidth={2} aria-hidden="true" className="dir-city-chev" />
    </label>
  )
}
