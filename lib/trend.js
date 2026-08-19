import { weightedScore } from '@/lib/score'

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const MIN_REVIEWS = 3
const MIN_SPAN_MONTHS = 2

// Serie mensile del punteggio medio (cumulativo, pesato come lo score
// pubblicato) negli ultimi 12 mesi, per il mini grafico "Trend recensioni".
// Sotto una soglia minima di recensioni/periodo storico torna insufficient:true
// invece di disegnare un grafico fuorviante con 1-2 punti.
export function reviewTrend(reviews, now = new Date()) {
  const dated = (reviews || []).filter((r) => r.created_at && r.score != null)
  if (dated.length < MIN_REVIEWS) return { insufficient: true }

  const sorted = [...dated].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const spanMonths = monthsBetween(new Date(sorted[0].created_at), now)
  if (spanMonths < MIN_SPAN_MONTHS) return { insufficient: true }

  const points = []
  for (let i = 11; i >= 0; i--) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const upToNow = sorted.filter((r) => new Date(r.created_at) < cutoff)
    if (upToNow.length === 0) continue
    points.push({
      month: MONTH_LABELS[cutoff.getMonth() === 0 ? 11 : cutoff.getMonth() - 1],
      avg: weightedScore(upToNow),
    })
  }

  if (points.length < MIN_SPAN_MONTHS) return { insufficient: true }

  const first = points[0].avg
  const last = points[points.length - 1].avg
  const delta = last - first
  const direction = Math.abs(delta) < 0.15 ? 'stable' : delta > 0 ? 'up' : 'down'

  return { insufficient: false, points, direction, delta: Math.round(delta * 10) / 10 }
}

function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}
