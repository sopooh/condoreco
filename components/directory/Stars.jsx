import { Star } from 'lucide-react'

// Stelle con riempimento parziale (es. 4,6 = quattro piene e una al 60%).
export default function Stars({ value, size = 18 }) {
  return (
    <span className="dir-stars" aria-label={value != null ? `${value.toFixed(1)} su 5` : 'Nessuna valutazione'}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = value == null ? 0 : Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
            <Star size={size} strokeWidth={0} fill="#E5E7EB" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />
            {fill > 0 && (
              <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                <Star size={size} strokeWidth={0} fill="#F5B301" aria-hidden="true" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

export const formatScore = (v) => (v == null ? null : v.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
