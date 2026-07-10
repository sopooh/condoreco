'use client'

import { useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const FEE_MIN = 0
const FEE_MAX = 3000
const STEP = 10
const N_BUCKETS = 24 // barre dell'istogramma

// Stesso istogramma di components/search/FilterSidebar.jsx, ma sulla media
// (avg_monthly_fee, view admin_scores) invece che sulla quota del singolo edificio.
function buildHistogram(fees) {
  const counts = new Array(N_BUCKETS).fill(0)
  const bw = (FEE_MAX - FEE_MIN) / N_BUCKETS
  fees.forEach((fee) => {
    const n = Number(fee)
    if (!n || n <= 0 || n > FEE_MAX) return
    const idx = Math.min(Math.floor((n - FEE_MIN) / bw), N_BUCKETS - 1)
    counts[idx]++
  })
  return counts
}

export default function AdminFilterSidebar({ feeCounts = [] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const feeMin = searchParams.get('feeMin') ? Number(searchParams.get('feeMin')) : FEE_MIN
  const feeMax = searchParams.get('feeMax') ? Number(searchParams.get('feeMax')) : FEE_MAX
  const isDefaultRange = feeMin === FEE_MIN && feeMax === FEE_MAX
  const histogram = useMemo(() => buildHistogram(feeCounts), [feeCounts])

  function setFee(next) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.feeMin === FEE_MIN) params.delete('feeMin')
    else params.set('feeMin', String(next.feeMin))
    if (next.feeMax === FEE_MAX) params.delete('feeMax')
    else params.set('feeMax', String(next.feeMax))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ width: 240, flexShrink: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Filtra per</div>

      <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Spese condominiali medie</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
          {isDefaultRange
            ? 'Tutte le fasce'
            : `€${feeMin} – €${feeMax}/mese`}
        </div>

        {/* Histogram */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 52, gap: 2, marginBottom: 6 }}>
          {histogram.map((count, i) => {
            const bw = (FEE_MAX - FEE_MIN) / N_BUCKETS
            const bucketStart = FEE_MIN + i * bw
            const bucketEnd = FEE_MIN + (i + 1) * bw
            const inRange = bucketEnd > feeMin && bucketStart < feeMax && count > 0
            const maxCount = Math.max(...histogram, 1)
            const h = count > 0 ? Math.max((count / maxCount) * 100, 10) : 3
            return (
              <div key={i} style={{
                flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0',
                background: inRange ? 'var(--teal)' : '#D1D5DB',
                transition: 'background 0.1s',
              }} />
            )
          })}
        </div>

        {/* Double range slider */}
        <div className="fee-range-wrap">
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            transform: 'translateY(-50%)', height: 4,
            background: '#E5E7EB', borderRadius: 100, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)', height: 4,
            background: 'var(--teal)', borderRadius: 100, pointerEvents: 'none',
            left: `${((feeMin - FEE_MIN) / (FEE_MAX - FEE_MIN)) * 100}%`,
            right: `${((FEE_MAX - feeMax) / (FEE_MAX - FEE_MIN)) * 100}%`,
          }} />
          <input
            type="range" className="fee-range-input"
            min={FEE_MIN} max={FEE_MAX} step={STEP} value={feeMin}
            style={{ zIndex: feeMin > FEE_MAX - 50 ? 5 : 3 }}
            onChange={(e) => setFee({ feeMin: Math.min(Number(e.target.value), feeMax - STEP), feeMax })}
          />
          <input
            type="range" className="fee-range-input"
            min={FEE_MIN} max={FEE_MAX} step={STEP} value={feeMax}
            style={{ zIndex: 4 }}
            onChange={(e) => setFee({ feeMin, feeMax: Math.max(Number(e.target.value), feeMin + STEP) })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text-4)' }}>
          <span>€{FEE_MIN}</span>
          <span>€{FEE_MAX}+</span>
        </div>

        {!isDefaultRange && (
          <button onClick={() => setFee({ feeMin: FEE_MIN, feeMax: FEE_MAX })}
            style={{ marginTop: 8, fontSize: 12, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
            Azzera filtro
          </button>
        )}
      </div>
    </div>
  )
}
