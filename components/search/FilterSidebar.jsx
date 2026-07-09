'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ALL_AMENITIES } from '@/lib/amenities'

// Solo il filtro "servizi", come da richiesta (query testo + città + servizi
// applicati server-side). Le sezioni "spese condominiali" (istogramma) e
// "punteggio minimo" dell'originale FilterSidebar restano fuori da questo
// giro: richiederebbero una seconda query per la baseline dell'istogramma e
// non erano nello scope indicato.
export default function FilterSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = (searchParams.get('amenities') || '').split(',').filter(Boolean)

  function toggleAmenity(id) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    const params = new URLSearchParams(searchParams.toString())
    if (next.length) params.set('amenities', next.join(','))
    else params.delete('amenities')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ width: 240, flexShrink: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Filtra per</div>

      <Section title="Servizi">
        {ALL_AMENITIES.map(([id, l]) => (
          <label key={id} style={row}>
            <input type="checkbox" checked={selected.includes(id)}
              onChange={() => toggleAmenity(id)}
              style={{ width: 16, height: 16, accentColor: 'var(--teal)', flexShrink: 0 }} />
            <span>{l}</span>
          </label>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

const row = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }
