import Tag from '@/components/ui/Tag'
import { autoTags, scoreColor } from '@/lib/score'

export default function BuildingHeader({ building: b, hideScore = false }) {
  const tags = autoTags(b)
  return (
    <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
      <div className="wrap" style={{ padding: '32px 40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: hideScore ? '1fr' : '1fr 200px', gap: 36, alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 5 }}>
              {b.address}{b.street_number ? `, ${b.street_number}` : ''}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 14, fontWeight: 500 }}>
              {b.postal_code} {b.city} · {b.neighborhood} · Anno {b.year_built} · {b.units} unità · {b.floors} piani
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t) => <Tag key={t.label} label={t.label} tone={t.tone} />)}
            </div>
          </div>
          {!hideScore && (
            <div style={{ background: 'var(--teal-lt)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor(b.score), letterSpacing: '-2px', lineHeight: 1 }}>
                {b.score?.toFixed(1)}<span style={{ fontSize: 18, color: 'var(--teal-mid)' }}>/5</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--teal-dk)', fontWeight: 600, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Score complessivo
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 3 }}>{b.review_count} recensioni</div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--teal-mid)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Row label="Verificati" val={b.score_verified} strong />
                <Row label="Ex residenti" val={b.score_former} />
                <Row label="Chi valuta" val={b.score_evaluating} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, val, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      <span style={{ color: strong ? 'var(--teal-dk)' : 'var(--text-3)', fontWeight: 700 }}>
        {val != null ? val.toFixed(1) : '—'}
      </span>
    </div>
  )
}
