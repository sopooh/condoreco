// Le tre card analitiche sotto il rating principale: trend recensioni,
// confronto manutenzione vs cohort, frequenza segnalazioni.

export default function InsightCards({ trend, maintenancePercentile, reportStats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
      <TrendCard trend={trend} />
      <ComparisonCard percentile={maintenancePercentile} />
      <ReportsCard stats={reportStats} />
    </div>
  )
}

function CardShell({ eyebrow, badge, children }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)' }}>{eyebrow}</span>
        {badge && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function TrendCard({ trend }) {
  if (!trend || trend.insufficient) {
    return (
      <CardShell eyebrow="Trend recensioni">
        <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '18px 0' }}>
          Non ci sono ancora abbastanza dati storici
        </div>
      </CardShell>
    )
  }

  const label = { stable: 'Stabile', up: 'In miglioramento', down: 'In peggioramento' }[trend.direction]
  const sub = { stable: 'Nessuna variazione significativa', up: `+${Math.abs(trend.delta).toFixed(1)} punti nel periodo`, down: `${trend.delta.toFixed(1)} punti nel periodo` }[trend.direction]

  return (
    <CardShell eyebrow="Trend recensioni" badge="Ultimi 12 mesi">
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 12 }}>{sub}</div>
      <Sparkline points={trend.points} />
    </CardShell>
  )
}

function Sparkline({ points }) {
  const w = 220
  const h = 60
  const min = 1
  const max = 5
  const stepX = points.length > 1 ? w / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = h - ((p.avg - min) / (max - min)) * h
    return [x, y]
  })
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={path} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="var(--teal)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>
        <span>{points[0].month}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].month}</span>}
        <span>{points[points.length - 1].month}</span>
      </div>
    </div>
  )
}

function ComparisonCard({ percentile }) {
  return (
    <CardShell eyebrow="Confronto con condomini simili" badge="Manutenzione">
      {percentile == null ? (
        <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '18px 0' }}>
          Dati insufficienti per il confronto
        </div>
      ) : (
        <>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>
            {percentile >= 50 ? 'Manutenzione migliore della media' : 'Manutenzione sotto la media'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 14 }}>{percentile}° percentile</div>
          <div style={{ position: 'relative', height: 8, borderRadius: 100, background: 'var(--bg)' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 100, background: 'linear-gradient(90deg, #0D676F, #D9C441, #DC2626)' }} />
            <div style={{
              position: 'absolute', top: -4, left: `${percentile}%`, transform: 'translateX(-50%)',
              width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '2.5px solid var(--text-2)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-4)' }}>
            <span>Migliore</span><span>Media</span><span>Peggiore</span>
          </div>
        </>
      )}
    </CardShell>
  )
}

function ReportsCard({ stats }) {
  if (!stats || stats.total === 0) {
    return (
      <CardShell eyebrow="Segnalazioni" badge="Ultimi 10 anni">
        <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '18px 0' }}>
          Nessuna segnalazione recente
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell eyebrow="Segnalazioni" badge="Ultimi 10 anni">
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{stats.perYear.toFixed(1)} / anno</div>
      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
        {stats.percentile != null
          ? `${stats.percentile}° percentile rispetto a condomini simili`
          : `${stats.total} segnalazioni totali`}
      </div>
    </CardShell>
  )
}
