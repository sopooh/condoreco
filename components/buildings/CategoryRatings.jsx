import { scoreColor } from '@/lib/score'

const CATEGORIES = [
  { field: 'score_noise', label: 'Rumore' },
  { field: 'score_safety', label: 'Sicurezza' },
  { field: 'score_quality', label: 'Vicinato' },
  { field: 'score_maintenance', label: 'Manutenzione' },
  { field: 'score_costs', label: 'Costi' },
  { field: 'score_admin', label: 'Amministratore' },
]

// Rating per categoria + percentile rispetto al cohort (lib/percentile.js).
// percentiles è l'oggetto tornato da buildingPercentiles(), o null se il
// cohort è sotto soglia — in quel caso si mostra solo il valore, senza percentile.
export default function CategoryRatings({ building, percentiles }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Rating per categoria</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {CATEGORIES.map(({ field, label }) => {
          const value = building[field]
          const pct = percentiles ? percentiles[field] : null
          return (
            <div key={field} style={{ border: '1px solid var(--border-2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor(value) }}>
                  {value != null ? `${value.toFixed(1)}/5` : 'N/D'}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 100, background: 'var(--bg)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 100, background: scoreColor(value),
                  width: value != null ? `${(value / 5) * 100}%` : '0%',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 6 }}>
                {pct != null ? `Meglio del ${pct}%` : 'Percentile non disponibile'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
