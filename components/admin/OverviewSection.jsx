'use client'

import { useState, useEffect } from 'react'
import StatCard from './StatCard.jsx'
import { getOverviewStats, getGrowthStats, getLoginEvents, getLoginsByDay } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function BarChart({ data, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: height + 20 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: '100%',
              height: d.value > 0 ? `${Math.max((d.value / max) * height, 3)}px` : '2px',
              background: d.value > 0 ? 'var(--teal)' : 'var(--border)',
              borderRadius: '2px 2px 0 0',
              transition: 'height 0.4s ease',
            }}
          />
          <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 3, whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function OverviewSection() {
  const [stats, setStats] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [loginChart, setLoginChart] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [s, g, lc, rl] = await Promise.all([
        getOverviewStats(),
        getGrowthStats(),
        getLoginsByDay(14),
        getLoginEvents({ page: 0, limit: 8 }),
      ])
      setStats(s)
      setGrowth(g)
      setLoginChart(lc)
      setRecentLogins(rl.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)' }}>Caricamento statistiche...</div>

  return (
    <div style={{ padding: pad, maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Panoramica generale della piattaforma · aggiornata adesso
        </p>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
        <StatCard title="Utenti totali" value={stats.totalUsers} icon="👤" growth={growth?.userGrowthMoM} sub="vs mese scorso" />
        <StatCard title="Attivi 7 giorni" value={stats.activeUsers7d} icon="⚡" sub="da login_events" />
        <StatCard title="Attivi 30 giorni" value={stats.activeUsers30d} icon="📅" sub="da login_events" />
        <StatCard title="Condomini" value={stats.totalBuildings} icon="🏢" />
        <StatCard title="Recensioni" value={stats.totalReviews} icon="⭐" growth={growth?.reviewGrowthMoM} sub="vs mese scorso" />
        <StatCard title="In moderazione" value={stats.pendingReviews} icon="⏳" color="#F59E0B" />
        <StatCard title="Segnalazioni aperte" value={stats.openReports} icon="🚩" color="#EF4444" />
        <StatCard title="Nuovi utenti / mese" value={growth?.newUsersThisMonth ?? 0} icon="📈" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: '20px 22px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Accessi giornalieri (14 giorni)</div>
          {loginChart.length > 0 ? (
            <BarChart data={loginChart} height={80} />
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 12 }}>
              Nessun dato di login ancora — i dati si accumulano da ora
            </div>
          )}
        </div>

        <div style={{ background: 'var(--white)', borderRadius: 12, padding: '20px 22px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Crescita questo mese</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Nuovi utenti', value: growth?.newUsersThisMonth ?? 0 },
              { label: 'Nuove recensioni', value: growth?.newReviewsThisMonth ?? 0 },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--teal-lt)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal-dk)' }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--teal-dk)', marginTop: 4, fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent logins */}
      <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          Ultimi accessi
        </div>
        {recentLogins.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--text-4)', fontSize: 13 }}>
            Nessun accesso registrato ancora. I login verranno tracciati da adesso.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Email', 'Data e ora', 'Browser / Device'].map(h => (
                  <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogins.map(ev => (
                <tr key={ev.id} style={{ borderTop: '1px solid var(--border-2)' }}>
                  <td style={{ padding: '10px 20px', color: 'var(--text)' }}>{ev.email || '—'}</td>
                  <td style={{ padding: '10px 20px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmtDate(ev.created_at)}</td>
                  <td style={{ padding: '10px 20px', color: 'var(--text-3)', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.user_agent ? ev.user_agent.split(' ').slice(0, 4).join(' ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
