'use client'

import { useState } from 'react'
import { scoreColor } from '@/lib/score'
import { photoUrl } from '@/lib/photos'
import PhotoLightbox from '@/components/photos/PhotoLightbox'

export default function ReviewSummary({ reviews, photos, building, onFilter, onSearch }) {
  const [activeFilter, setActiveFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + (r.score || 0), 0) / total : null

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: reviews.filter((r) => Math.round(r.score) === n).length,
    pct: total > 0 ? Math.round((reviews.filter((r) => Math.round(r.score) === n).length / total) * 100) : 0,
  }))

  const reviewPhotos = (photos || []).filter((p) => p.review_id)

  function handleFilter(n) {
    const next = activeFilter === n ? null : n
    setActiveFilter(next)
    onFilter?.(next)
  }

  function handleSearch(e) {
    const val = e.target.value
    setSearch(val)
    onSearch?.(val)
  }

  function handleReset() {
    setActiveFilter(null)
    setSearch('')
    onFilter?.(null)
    onSearch?.('')
  }

  if (total === 0) return null

  const hasActiveFilter = activeFilter !== null || search.length > 0

  return (
    <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
      <div className="review-summary-row" style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* Colonna sinistra: score + barre filtro stile Trustpilot */}
        <div className="review-summary-col-left">
          {/* Score grande */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1.5px', color: scoreColor(avg) }}>
              {avg?.toFixed(1)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-4)', fontWeight: 500 }}>
              /5 · {total} {total === 1 ? 'recensione' : 'recensioni'}
            </span>
          </div>

          {/* Sub-score per tipo residente */}
          {building && (
            <div style={{
              display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap',
            }}>
              {[
                { label: 'Verificati', val: building.score_verified },
                { label: 'Ex residenti', val: building.score_former },
                { label: 'Chi valuta', val: building.score_evaluating },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: val != null ? scoreColor(val) : 'var(--text-4)' }}>
                    {val != null ? val.toFixed(1) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Barre filtro */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
          }}>
            {dist.map(({ n, count, pct }, idx) => {
              const active = activeFilter === n
              return (
                <button
                  key={n}
                  onClick={() => handleFilter(n)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 14px',
                    background: active ? 'var(--teal-lt)' : idx % 2 === 0 ? 'var(--white)' : 'var(--bg)',
                    border: 'none', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                >
                  {/* Pallino selezione */}
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                    background: active ? 'var(--teal)' : 'transparent',
                    transition: 'all 0.12s',
                  }} />

                  {/* Numero voto */}
                  <span style={{
                    fontSize: 12, fontWeight: 700, width: 8, flexShrink: 0,
                    color: active ? 'var(--teal-dk)' : 'var(--text-3)',
                  }}>
                    {n}
                  </span>

                  {/* Barra progresso */}
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: active ? 'var(--teal)' : scoreColor(n),
                      transition: 'width 0.3s',
                    }} />
                  </div>

                  {/* Percentuale */}
                  <span style={{
                    fontSize: 11, width: 30, textAlign: 'right', flexShrink: 0,
                    color: active ? 'var(--teal-dk)' : 'var(--text-4)', fontWeight: 600,
                  }}>
                    {pct}%
                  </span>
                </button>
              )
            })}
          </div>

          {/* Reset filtro — sempre visibile */}
          <button
            onClick={handleReset}
            disabled={!hasActiveFilter}
            style={{
              marginTop: 10, fontSize: 12, fontWeight: 600, padding: 0,
              background: 'none', border: 'none', cursor: hasActiveFilter ? 'pointer' : 'default',
              color: hasActiveFilter ? 'var(--teal)' : 'var(--text-4)',
              textDecoration: hasActiveFilter ? 'underline' : 'none',
              transition: 'color 0.15s',
            }}
          >
            Rimuovi filtri
          </button>
        </div>

        {/* Colonna destra: ricerca + foto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Barra di ricerca keyword */}
          <div style={{ position: 'relative', marginBottom: reviewPhotos.length > 0 ? 20 : 0 }}>
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--text-4)', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Cerca nelle recensioni..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--white)', border: '1.5px solid var(--border)',
                borderRadius: 100, padding: '10px 16px 10px 38px',
                fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
                color: 'var(--text-2)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); onSearch?.('') }}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-4)', padding: '0 4px',
                }}
              >×</button>
            )}
          </div>

          {/* Striscia foto */}
          {reviewPhotos.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-2)' }}>
                Foto dei residenti
              </div>
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                paddingBottom: 6, scrollbarWidth: 'none', msOverflowStyle: 'none',
              }}>
                {reviewPhotos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className="review-summary-photo"
                    onClick={() => setLightboxIndex(i)}
                    style={{
                      borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                      border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    <img
                      src={photoUrl(p.storage_path)}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={reviewPhotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
