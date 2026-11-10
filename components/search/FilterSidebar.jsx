'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ALL_AMENITIES } from '@/lib/amenities'
import { AmenityIcon } from '@/components/search/AmenityIcons'

export const FEE_MIN = 0
export const FEE_MAX = 3000
const N_BUCKETS = 26 // barre dell'istogramma
const POS_MAX = 1000

// Scala non lineare: la maggior parte delle quote sta sotto i 500€, quindi
// metà dello slider copre 0-500€, poi 500-1.500€ e infine 1.500-3.000€.
const KNOTS = [[0, FEE_MIN], [500, 500], [800, 1500], [POS_MAX, FEE_MAX]]
function posToFee(pos) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [p0, f0] = KNOTS[i - 1], [p1, f1] = KNOTS[i]
    if (pos <= p1) {
      const raw = f0 + ((pos - p0) / (p1 - p0)) * (f1 - f0)
      const step = raw < 500 ? 10 : 50
      return Math.round(raw / step) * step
    }
  }
  return FEE_MAX
}
function feeToPos(fee) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [p0, f0] = KNOTS[i - 1], [p1, f1] = KNOTS[i]
    if (fee <= f1) return p0 + ((fee - f0) / (f1 - f0)) * (p1 - p0)
  }
  return POS_MAX
}

const PRESETS = [
  { label: 'Tutte', min: FEE_MIN, max: FEE_MAX },
  { label: '≤ 100€', min: FEE_MIN, max: 100 },
  { label: '101 – 250€', min: 101, max: 250 },
  { label: '251 – 500€', min: 251, max: 500 },
  { label: '> 500€', min: 501, max: FEE_MAX },
]

export const SORTS = [
  { id: 'recent', label: 'Più recenti' },
  { id: 'rating', label: 'Valutazione migliore' },
  { id: 'fee_asc', label: 'Spese più basse' },
  { id: 'fee_desc', label: 'Spese più alte' },
  { id: 'reviews', label: 'Più recensioni' },
]

// Istogramma delle quote (già filtrate server-side per città/query/servizi,
// ma non per il range stesso: lo sfondo mostra sempre la distribuzione completa).
function buildHistogram(fees) {
  const counts = new Array(N_BUCKETS).fill(0)
  fees.forEach((fee) => {
    const n = Number(fee)
    if (!n || n <= 0) return
    const idx = Math.min(Math.floor((feeToPos(Math.min(n, FEE_MAX)) / POS_MAX) * N_BUCKETS), N_BUCKETS - 1)
    counts[idx]++
  })
  return counts
}

function readParams(sp) {
  return {
    feeMin: sp.get('feeMin') ? Number(sp.get('feeMin')) : FEE_MIN,
    feeMax: sp.get('feeMax') ? Number(sp.get('feeMax')) : FEE_MAX,
    amenities: (sp.get('amenities') || '').split(',').filter(Boolean),
    sort: sp.get('sort') || 'recent',
  }
}

// Pannello filtri di Esplora.
// instant: ogni modifica aggiorna subito i risultati (colonna desktop).
// Altrimenti le scelte restano in bozza fino ad "Applica filtri" (foglio mobile).
export default function FilterSidebar({ feeCounts = [], instant = true, onApplied }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = readParams(searchParams)
  const [draft, setDraft] = useState(current)
  const v = instant ? current : draft
  const histogram = useMemo(() => buildHistogram(feeCounts), [feeCounts])
  const maxCount = Math.max(...histogram, 1)

  function push(next) {
    const params = new URLSearchParams(searchParams.toString())
    const setOrDel = (k, val, def) => (val === def || val === '' ? params.delete(k) : params.set(k, String(val)))
    setOrDel('feeMin', next.feeMin, FEE_MIN)
    setOrDel('feeMax', next.feeMax, FEE_MAX)
    setOrDel('amenities', next.amenities.join(','), '')
    setOrDel('sort', next.sort, 'recent')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function update(patch) {
    const next = { ...v, ...patch }
    if (instant) push(next)
    else setDraft(next)
  }

  function toggleAmenity(id) {
    update({ amenities: v.amenities.includes(id) ? v.amenities.filter((x) => x !== id) : [...v.amenities, id] })
  }

  const reset = { feeMin: FEE_MIN, feeMax: FEE_MAX, amenities: [], sort: 'recent' }
  const activePreset = PRESETS.findIndex((p) => p.min === v.feeMin && p.max === v.feeMax)
  const pct = (n) => (feeToPos(n) / POS_MAX) * 100
  const minPos = feeToPos(v.feeMin), maxPos = feeToPos(v.feeMax)

  return (
    <div className={`fpanel ${instant ? 'is-side' : 'is-sheet'}`}>
      {/* ── Spese condominiali ── */}
      <section className="fpanel-sec">
        <h3 className="fpanel-title"><CoinsIcon />Spese condominiali</h3>
        <div className="fpanel-seg" role="group" aria-label="Fascia di spesa">
          {PRESETS.map((p, i) => (
            <button key={p.label} type="button" className={i === activePreset ? 'is-on' : ''}
              onClick={() => update({ feeMin: p.min, feeMax: p.max })}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="fpanel-hist" aria-hidden="true">
          {histogram.map((count, i) => {
            const bw = POS_MAX / N_BUCKETS
            const inRange = (i + 1) * bw > minPos && i * bw < maxPos
            const h = count > 0 ? Math.max((count / maxCount) * 100, 12) : 6
            return <div key={i} style={{ height: `${h}%`, background: inRange ? '#BFE3DF' : '#E5E7EB' }} />
          })}
        </div>

        <div className="fee-range-wrap">
          <div className="fpanel-track" />
          <div className="fpanel-track is-active" style={{ left: `${pct(v.feeMin)}%`, right: `${100 - pct(v.feeMax)}%` }} />
          <input type="range" className="fee-range-input" aria-label="Spesa minima"
            min={0} max={POS_MAX} step={1} value={minPos}
            style={{ zIndex: minPos > POS_MAX - 50 ? 5 : 3 }}
            onChange={(e) => update({ feeMin: Math.min(posToFee(Number(e.target.value)), v.feeMax - 10) })} />
          <input type="range" className="fee-range-input" aria-label="Spesa massima"
            min={0} max={POS_MAX} step={1} value={maxPos}
            style={{ zIndex: 4 }}
            onChange={(e) => update({ feeMax: Math.max(posToFee(Number(e.target.value)), v.feeMin + 10) })} />
        </div>
        <div className="fpanel-range-labels">
          <span>€{v.feeMin.toLocaleString('it-IT')}</span>
          <span>€{v.feeMax.toLocaleString('it-IT')}{v.feeMax === FEE_MAX ? '+' : ''}</span>
        </div>
      </section>

      {/* ── Ordina per ── */}
      <section className="fpanel-sec">
        <h3 className="fpanel-title"><SlidersIcon />Ordina per</h3>
        <label className="fpanel-select">
          <select value={v.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Ordina per">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <ChevronIcon />
        </label>
      </section>

      {/* ── Servizi ── */}
      <section className="fpanel-sec">
        <h3 className="fpanel-title"><LayersIcon />Servizi</h3>
        <div className="fpanel-amen">
          {ALL_AMENITIES.map(([id, label]) => {
            const on = v.amenities.includes(id)
            return (
              <label key={id} className={`fpanel-chip ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleAmenity(id)} />
                <span className="fpanel-box" aria-hidden="true">{on && <CheckIcon />}</span>
                <span className="fpanel-chip-icon"><AmenityIcon id={id} size={20} /></span>
                <span className="fpanel-chip-label">{label}</span>
              </label>
            )
          })}
        </div>
      </section>

      <div className="fpanel-actions">
        {!instant && (
          <button type="button" className="fpanel-apply" onClick={() => { push(draft); onApplied?.() }}>
            Applica filtri
          </button>
        )}
        <button type="button" className="fpanel-reset"
          onClick={() => { if (instant) push(reset); else setDraft(reset) }}>
          <ResetIcon />Reimposta filtri
        </button>
      </div>
    </div>
  )
}

const svg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

function CoinsIcon() {
  return <svg {...svg}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M3 11v4c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4M15 13.5c0-1.7 2.7-3 6-3M21 10.5v6c0 1.7-2.7 3-6 3s-6-1.3-6-3" /></svg>
}
function SlidersIcon() {
  return <svg {...svg}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
}
function LayersIcon() {
  return <svg {...svg}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" /></svg>
}
function ChevronIcon() {
  return <svg {...svg} width="20" height="20" className="fpanel-select-chev"><path d="M6 9l6 6 6-6" /></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
}
function ResetIcon() {
  return <svg {...svg} width="20" height="20"><path d="M4 12a8 8 0 108-8 8.5 8.5 0 00-6 2.5L4 8.5" /><path d="M4 4v4.5h4.5" /></svg>
}
