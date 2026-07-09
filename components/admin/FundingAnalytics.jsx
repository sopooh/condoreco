'use client'

import { useState, useEffect } from 'react'
import { getFundingMetrics } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: highlight ? 'var(--teal)' : 'var(--white)',
      borderRadius: 12, padding: '20px 22px',
      border: highlight ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: highlight ? '#fff' : 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.9)' : 'var(--text)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: highlight ? 'rgba(255,255,255,0.7)' : 'var(--text-3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function HBarChart({ data, label, color = 'var(--teal)' }) {
  if (!data || data.length === 0) return <div style={{ color: 'var(--text-4)', fontSize: 12, padding: '12px 0' }}>Nessun dato</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.name || d.city || '—'}
          </div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.count / max) * 100}%`, background: color, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', width: 30, textAlign: 'right' }}>{d.count}</div>
        </div>
      ))}
    </div>
  )
}

function GrowthBadge({ value }) {
  if (value === null || value === undefined) return <span style={{ fontSize: 12, color: 'var(--text-4)' }}>n/d</span>
  const color = value > 0 ? 'var(--green-tx)' : value < 0 ? 'var(--red-tx)' : 'var(--text-3)'
  const bg = value > 0 ? 'var(--green-bg)' : value < 0 ? 'var(--red-bg)' : 'var(--border-2)'
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: 5 }}>
      {value > 0 ? '+' : ''}{value}%
    </span>
  )
}

export default function FundingAnalytics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFundingMetrics().then(m => { setMetrics(m); setLoading(false) })
  }, [])

  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)' }}>Caricamento analytics...</div>

  return (
    <div style={{ padding: pad, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Analytics · Funding</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Metriche chiave per investitori e partner · aggiornate in tempo reale
        </p>
      </div>

      {/* Hero metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <MetricCard label="Utenti totali" value={metrics.totalUsers} highlight />
        <MetricCard label="Recensioni totali" value={metrics.totalReviews} />
        <MetricCard label="Condomini totali" value={metrics.totalBuildings} />
        <MetricCard label="MAU (nuovi/mese)" value={metrics.mau} sub="Monthly Active Users" />
        <MetricCard label="WAU (nuovi/sett.)" value={metrics.wau} sub="Weekly Active Users" />
        <MetricCard label="Rec. per utente" value={metrics.reviewsPerUser} />
      </div>

      {/* Crescita */}
      <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Crescita mese su mese</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Utenti questo mese', value: metrics.newUsersMonth, growth: metrics.userGrowthMoM },
            { label: 'Utenti questa settimana', value: metrics.newUsersWeek },
            { label: 'Recensioni questo mese', value: metrics.newReviewsMonth, growth: metrics.reviewGrowthMoM },
            { label: 'Recensioni questa settimana', value: metrics.newReviewsWeek },
            { label: 'Condomini questo mese', value: metrics.newBuildingsMonth },
            { label: 'Condomini questa settimana', value: metrics.newBuildingsWeek },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{item.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{item.label}</div>
              {item.growth !== undefined && (
                <div style={{ marginTop: 6 }}><GrowthBadge value={item.growth} /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conversion funnel */}
      <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Funnel Conversione</div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {[
            { label: 'Registrati', value: metrics.totalUsers, color: 'var(--teal)' },
            { label: 'Con recensioni', value: metrics.totalReviews > 0 ? Math.min(metrics.totalUsers, Math.round(metrics.totalUsers * (metrics.totalReviews / Math.max(metrics.totalUsers, 1)))) : 0, color: '#0D9488' },
            { label: 'Recensioni totali', value: metrics.totalReviews, color: '#14B8A6' },
          ].map((step, i) => {
            const pct = metrics.totalUsers > 0 ? Math.round((step.value / metrics.totalUsers) * 100) : 0
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                <div style={{
                  margin: '0 4px', padding: '16px 8px', background: step.color,
                  borderRadius: i === 0 ? '8px 0 0 8px' : i === 2 ? '0 8px 8px 0' : 0,
                  color: '#fff',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{step.value}</div>
                  <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{step.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, marginTop: 4 }}>{pct}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Città e quartieri */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '22px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Città con maggiore trazione</div>
          <HBarChart data={metrics.topCities} color="var(--teal)" />
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '22px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Quartieri con maggiore trazione</div>
          <HBarChart data={metrics.topNeighborhoods} color="#0D9488" />
        </div>
      </div>

      {/* Note per pitch */}
      <div style={{ background: 'var(--teal-lt)', borderRadius: 12, padding: '20px 24px', border: '1px solid rgba(13,103,111,0.15)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-dk)', marginBottom: 8 }}>Note per il pitch deck</div>
        <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            `${metrics.totalUsers} utenti registrati, con crescita del ${metrics.userGrowthMoM ?? 'n/d'}% MoM`,
            `${metrics.totalReviews} recensioni pubblicate — ${metrics.reviewsPerUser} per utente in media`,
            `${metrics.totalBuildings} condomini nel database`,
            `Top città: ${metrics.topCities.slice(0, 3).map(c => c.name).join(', ') || 'n/d'}`,
            `${metrics.newUsersMonth} nuovi utenti nell'ultimo mese`,
          ].map((note, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--teal-dk)' }}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
