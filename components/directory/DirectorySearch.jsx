'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useParamNav } from './useParamNav'

export default function DirectorySearch({ placeholder }) {
  const { searchParams, setParams } = useParamNav()
  const [value, setValue] = useState(searchParams.get('q') || '')
  return (
    <form className="dir-search" role="search" onSubmit={(e) => { e.preventDefault(); setParams({ q: value.trim() }) }}>
      <label className="dir-search-field">
        <Search size={20} strokeWidth={2} aria-hidden="true" />
        <input type="search" value={value} placeholder={placeholder} aria-label={placeholder}
          onChange={(e) => { setValue(e.target.value); if (!e.target.value) setParams({ q: null }) }} />
      </label>
      <button type="submit" className="dir-search-btn">Cerca</button>
    </form>
  )
}
