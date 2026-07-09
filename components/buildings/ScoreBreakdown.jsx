import ScoreBar from '@/components/ui/ScoreBar'

export default function ScoreBreakdown({ building, compact }) {
  const cats = [
    ['Amministratore', building.score_admin],
    ['Manutenzione', building.score_maintenance],
    ['Spese', building.score_costs],
    ['Qualità vita', building.score_quality],
  ]
  if (!compact) {
    cats.push(['Silenziosità', building.score_noise])
    cats.push(['Sicurezza', building.score_safety])
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {cats.map(([label, val]) => <ScoreBar key={label} label={label} value={val} />)}
    </div>
  )
}
