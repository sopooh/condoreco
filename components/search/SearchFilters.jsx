'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function SearchFilters({ cities }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCity = searchParams.get('city')

  function setCity(city) {
    const params = new URLSearchParams(searchParams.toString())
    if (city) params.set('city', city)
    else params.delete('city')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="search-filters-row" style={{
      display: 'flex', gap: 0, overflowX: 'auto',
      borderBottom: '1px solid var(--border)', background: 'var(--white)',
    }}>
      <button onClick={() => setCity(null)} style={pillStyle(!currentCity)}>Tutte</button>
      {cities.map((c) => (
        <button key={c.name} onClick={() => setCity(c.name)} style={pillStyle(currentCity === c.name)}>
          {c.name}
        </button>
      ))}
    </div>
  )
}

function pillStyle(active) {
  return {
    padding: '14px 18px', fontSize: 13, fontWeight: 600,
    color: active ? 'var(--teal)' : 'var(--text-3)',
    background: 'none', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
    borderBottomColor: active ? 'var(--teal)' : 'transparent',
    whiteSpace: 'nowrap', cursor: 'pointer',
  }
}
