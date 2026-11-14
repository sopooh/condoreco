'use client'

import { ViewAsPicker } from '@/components/nav/ViewAsSwitcher'

import { useState, useEffect } from 'react'
import { getDashboardData } from '@/lib/adminQueries'
import { AdminIcon } from './AdminIcons'

const PERIODS = [
  { days: 7, label: 'Ultimi 7 giorni' },
  { days: 30, label: 'Ultimi 30 giorni' },
  { days: 90, label: 'Ultimi 90 giorni' },
]

const nf = new Intl.NumberFormat('it-IT')

// Dashboard admin: KPI, andamento utenti, segnalazioni per stato, attività recenti.
export default function OverviewSection({ onNavigate }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDashboardData(days)
      .then(d => { if (!cancelled) { setData(d); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [days])

  return (
    <div className="adm-dash">
      <div className="adm-head">
        <div className="adm-kicker">Area Admin</div>
        <h1 className="adm-title">Dashboard</h1>
        <p className="adm-sub">Panoramica della piattaforma e attività recenti.</p>
      </div>

      <ViewAsPicker style={{ marginBottom: 16 }} current="none" />

      <label className="adm-period">
        <span className="adm-period-icon"><AdminIcon name="calendar" size={20} /></span>
        <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Periodo">
          {PERIODS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
        <span className="adm-period-chev"><AdminIcon name="chevronDown" size={18} /></span>
      </label>

      {error && <div className="adm-card" style={{ color: 'var(--text-3)', fontSize: 14 }}>Impossibile caricare i dati.</div>}
      {!data && !error && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)', fontSize: 14 }}>Caricamento...</div>}

      {data && (
        <>
          <div className="adm-kpis">
            <Kpi icon="building" label="Abitazioni" {...data.kpi.buildings} onClick={() => onNavigate?.('condomini')} />
            <Kpi icon="users" label="Utenti" {...data.kpi.users} onClick={() => onNavigate?.('utenti')} />
            <Kpi icon="flag" label="Segnalazioni aperte" {...data.kpi.reports} danger onClick={() => onNavigate?.('segnalazioni')} />
            <Kpi icon="pulse" label="Attività (eventi)" {...data.kpi.events} onClick={() => onNavigate?.('analytics')} />
          </div>

          <div className="adm-grid2">
            <section className="adm-card">
              <h2 className="adm-card-title">
                Andamento utenti
                <span title="Utenti registrati totali, giorno per giorno" style={{ display: 'inline-flex', color: 'var(--text-4)' }}>
                  <AdminIcon name="info" size={17} />
                </span>
              </h2>
              <LineChart series={data.userSeries} />
            </section>

            <section className="adm-card">
              <h2 className="adm-card-title">Segnalazioni per stato</h2>
              <ReportsDonut counts={data.reportsByStatus} />
            </section>
          </div>

          <section className="adm-card">
            <div className="adm-card-head">
              <h2 className="adm-card-title" style={{ margin: 0 }}>Attività recenti</h2>
              <button type="button" className="adm-link" onClick={() => onNavigate?.('log')}>
                Vedi tutte <AdminIcon name="arrowRight" size={18} />
              </button>
            </div>
            {data.activity.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '8px 0' }}>Nessuna attività recente.</div>
            ) : (
              <ul className="adm-activity">
                {data.activity.map(a => (
                  <li key={a.id}>
                    <span className={`adm-act-icon ${a.kind === 'report' ? 'is-red' : ''}`}>
                      <AdminIcon name={a.kind === 'report' ? 'flag' : a.kind === 'user' ? 'userPlus' : 'building'} size={20} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="adm-act-title">{a.title}</div>
                      <div className="adm-act-sub">{a.sub}</div>
                    </div>
                    <div className="adm-act-time">{relTime(a.at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-tools">
            {[
              { id: 'recensioni', icon: 'star', label: 'Recensioni' },
              { id: 'foto', icon: 'camera', label: 'Foto' },
              { id: 'export', icon: 'download', label: 'Export' },
              { id: 'log', icon: 'list', label: 'Log' },
              { id: 'instagram', icon: 'camera', label: 'Instagram' },
            ].map(t => (
              <button key={t.id} type="button" className="adm-tool" onClick={() => onNavigate?.(t.id)}>
                <AdminIcon name={t.icon} size={18} />{t.label}
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, delta, danger = false, onClick }) {
  const up = delta != null && delta > 0
  const down = delta != null && delta < 0
  // per le segnalazioni un aumento è una cattiva notizia: rosso
  const bad = danger ? up : down
  return (
    <button type="button" className="adm-kpi" onClick={onClick}>
      <span className={`adm-kpi-icon ${danger ? 'is-red' : ''}`}><AdminIcon name={icon} size={22} /></span>
      <span className="adm-kpi-body">
        <span className="adm-kpi-label">{label}</span>
        <span className="adm-kpi-row">
          <span className="adm-kpi-value">{nf.format(value)}</span>
          {delta != null && (
            <span className={`adm-delta ${bad ? 'is-bad' : up || down ? 'is-good' : ''}`}>
              {(up || down) && <AdminIcon name={down ? 'trendDown' : 'trendUp'} size={13} />}
              {delta > 0 ? '+' : ''}{String(delta).replace('.', ',')}%
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

function LineChart({ series }) {
  const W = 340, H = 170, L = 44, R = 10, T = 10, B = 26
  const vals = series.map(s => s.value)
  let min = Math.min(...vals), max = Math.max(...vals)
  if (min === max) { min = Math.max(0, min - 2); max = max + 2 }
  const step = niceStep((max - min) / 5)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const x = i => L + (i / Math.max(series.length - 1, 1)) * (W - L - R)
  const y = v => T + (1 - (v - min) / (max - min)) * (H - T - B)
  const pts = series.map((s, i) => [x(i), y(s.value)])
  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1][0]},${H - B} L${pts[0][0]},${H - B} Z`
  const ticks = []
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(v)
  const n = series.length
  const labelIdx = [...new Set([0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1])]
  const fmtDay = d => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '')
  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Andamento utenti registrati">
      <defs>
        <linearGradient id="admArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0D676F" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0D676F" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {ticks.map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-3)">{nf.format(v)}</text>
        </g>
      ))}
      <path d={area} fill="url(#admArea)" />
      <path d={line} fill="none" stroke="#0D676F" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={pts[0][0]} cy={pts[0][1]} r="3.5" fill="#0D676F" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="#0D676F" stroke="#fff" strokeWidth="1.5" />
      {labelIdx.map(i => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="10.5" fill="var(--text-3)">
          {fmtDay(series[i].date)}
        </text>
      ))}
    </svg>
  )
}

function ReportsDonut({ counts }) {
  const items = [
    { key: 'open', label: 'Aperte', color: '#0D676F' },
    { key: 'reviewing', label: 'In gestione', color: '#6FD3CF' },
    { key: 'resolved', label: 'Risolte', color: '#D5EFEC' },
  ]
  const total = items.reduce((s, i) => s + counts[i.key], 0)
  const r = 44, c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="adm-donut-wrap">
      <svg viewBox="0 0 120 120" width="132" height="132" style={{ flexShrink: 0 }} role="img" aria-label="Segnalazioni per stato">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="20" />
        {total > 0 && items.map(i => {
          const len = (counts[i.key] / total) * c
          const el = (
            <circle key={i.key} cx="60" cy="60" r={r} fill="none" stroke={i.color} strokeWidth="20"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 60 60)" />
          )
          offset += len
          return el
        })}
        <text x="60" y="61" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--text)">{total}</text>
        <text x="60" y="78" textAnchor="middle" fontSize="11" fill="var(--text-3)">Totali</text>
      </svg>
      <ul className="adm-legend">
        {items.map(i => (
          <li key={i.key}>
            <span className="adm-dot" style={{ background: i.color }} />
            <span style={{ flex: 1 }}>{i.label}</span>
            <span className="adm-legend-pct">{total ? Math.round((counts[i.key] / total) * 100) : 0}%</span>
            <span className="adm-legend-n">{counts[i.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function niceStep(raw) {
  if (raw <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  const s = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return Math.max(1, s * p)
}

// curva morbida (monotona orizzontalmente) tra i punti
function smoothPath(pts) {
  if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  return d
}

function relTime(iso) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  const hm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diffDays <= 0) return `Oggi, ${hm}`
  if (diffDays === 1) return `Ieri, ${hm}`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
