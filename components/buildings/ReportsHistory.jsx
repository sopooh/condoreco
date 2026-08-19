import { reportCategoryLabel } from '@/lib/reviewOptions'

// Sezione "Segnalazioni passate": conteggi aperte/risolte, principali
// categorie, data dell'ultima. Le segnalazioni (public.building_reports)
// sono un dato separato dalle recensioni — problemi puntuali, non giudizi.
export default function ReportsHistory({ reports = [] }) {
  if (reports.length === 0) {
    return (
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Segnalazioni passate</div>
        <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
          Nessuna segnalazione registrata per questo condominio.
        </p>
      </div>
    )
  }

  const open = reports.filter((r) => r.status === 'open' || r.status === 'under_review').length
  const resolved = reports.filter((r) => r.status === 'resolved').length

  const byCategory = {}
  reports.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1 })
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const lastReport = reports.reduce((latest, r) => (
    !latest || new Date(r.created_at) > new Date(latest.created_at) ? r : latest
  ), null)

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Segnalazioni passate</div>
        {lastReport && (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Ultima segnalazione: {timeAgo(lastReport.created_at)}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal-dk)' }}>{reports.length}</span>
        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>segnalazioni totali</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 18 }}>
        {open} apert{open === 1 ? 'a' : 'e'} · {resolved} risolt{resolved === 1 ? 'a' : 'e'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {topCategories.map(([category, count]) => (
          <div key={category} style={{ border: '1px solid var(--border-2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{reportCategoryLabel(category)}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#E8651A' }}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 1) return 'oggi'
  if (days < 30) return `${days} giorn${days === 1 ? 'o' : 'i'} fa`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mes${months === 1 ? 'e' : 'i'} fa`
  const years = Math.floor(months / 12)
  return `${years} ann${years === 1 ? 'o' : 'i'} fa`
}
