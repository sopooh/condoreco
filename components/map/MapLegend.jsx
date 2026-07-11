// Legenda condivisa tra la mappa di Esplora e quella di Amministratori: stessi
// 4 colori usati da MapViewInner per colorare i pin (scoreColor + arancio per
// quota/in verifica), cosi le due pagine mostrano la mappa nello stesso modo.
export default function MapLegend() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <MapLegendDot color="#0D676F" label="Ottima (4.3+)" />
      <MapLegendDot color="#F59E0B" label="Media (3.5–4.2)" />
      <MapLegendDot color="#EF4444" label="Da migliorare" />
      <MapLegendDot color="#9CA3AF" label="Nessun rating" />
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
