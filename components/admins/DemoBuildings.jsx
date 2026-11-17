import { Building2 } from 'lucide-react'
import { scoreColor } from '@/lib/score'

// Palazzi di esempio per i profili amministratore di esempio (non cliccabili)
export default function DemoBuildings({ buildings }) {
  return (
    <div style={{ padding: '24px 0 8px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        Palazzi amministrati ({buildings.length}) · esempio
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {buildings.map((b) => (
          <div key={b.id} className="pf-card" style={{ marginTop: 0, padding: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-lt)', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Building2 size={22} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(b.score), lineHeight: 1 }}>{b.score.toFixed(1)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-4)', margin: '2px 0 8px' }}>{b.review_count} {b.review_count === 1 ? 'recensione' : 'recensioni'}</div>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{b.address}, {b.street_number}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{b.city} · {b.neighborhood}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
