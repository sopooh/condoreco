import { SCORE_TIERS, NO_SCORE_COLOR } from '@/lib/score'

// Legenda condivisa tra la mappa di Esplora e quella di Amministratori.
// Colori e soglie arrivano da SCORE_TIERS (lib/score.js), gli stessi usati
// da ResultsMapInner per colorare i pin.
export default function MapLegend() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {SCORE_TIERS.map((t) => (
        <MapLegendDot key={t.label} color={t.color} label={t.label} />
      ))}
      <MapLegendDot color={NO_SCORE_COLOR} label="Nessun rating" />
    </div>
  )
}

export function MapLegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </div>
  )
}
