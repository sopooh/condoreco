export default function StatCard({ title, value, sub, color = 'var(--teal)', icon, growth }) {
  const growthColor = growth > 0 ? 'var(--green-tx)' : growth < 0 ? 'var(--red-tx)' : 'var(--text-3)'
  const growthBg = growth > 0 ? 'var(--green-bg)' : growth < 0 ? 'var(--red-bg)' : 'var(--border-2)'

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12, padding: '20px 22px',
      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {growth != null && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: growthColor,
            background: growthBg, borderRadius: 4, padding: '2px 6px',
          }}>
            {growth > 0 ? '+' : ''}{growth}%
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</span>}
      </div>
    </div>
  )
}
