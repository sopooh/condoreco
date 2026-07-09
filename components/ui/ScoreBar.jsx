import { scoreColor } from '@/lib/score'

export default function ScoreBar({ label, value, max = 5 }) {
  const pct = value != null ? (value / max) * 100 : 0
  const color = scoreColor(value)
  return (
    <div className="score-bar-row">
      <span className="score-bar-lbl">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-bar-val" style={{ color }}>
        {value != null ? value.toFixed(1) : '—'}
      </span>
    </div>
  )
}
