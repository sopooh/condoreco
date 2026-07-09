'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function AdminCityTabs({ cities }) {
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
    <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', padding: '0 40px' }}>
        <CityTab active={!currentCity} onClick={() => setCity(null)} label="Tutte" />
        {cities.map((c) => (
          <CityTab key={c.name} active={currentCity === c.name} onClick={() => setCity(c.name)} label={c.name} />
        ))}
      </div>
    </div>
  )
}

function CityTab({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
      color: active ? 'var(--teal)' : 'var(--text-3)',
      background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${active ? 'var(--teal)' : 'transparent'}`,
    }}>
      {label}
    </button>
  )
}
