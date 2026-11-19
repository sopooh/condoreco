'use client'

import { useEffect, useState } from 'react'
import { AdminIcon } from '@/components/admin/AdminIcons'

const PERIODS = [
  { days: 7, label: 'Ultimi 7 giorni' },
  { days: 30, label: 'Ultimi 30 giorni' },
  { days: 90, label: 'Ultimi 90 giorni' },
]

const EVENT_LABELS = {
  account_signup_submitted: 'Registrazioni',
  user_login_succeeded: 'Accessi',
  review_submitted: 'Recensioni inviate',
  building_submission_completed: 'Edifici aggiunti',
  chat_message_sent: 'Messaggi in chat',
  intervention_created: 'Interventi creati',
  online_payment_checkout_started: 'Pagamenti avviati',
  supplier_appointment_proposed: 'Appuntamenti fornitori',
  supplier_intervention_completed: 'Interventi completati',
}

const SOURCE_LABELS = { $direct: 'Diretto', 'l.instagram.com': 'Instagram', 'www.google.com': 'Google' }
const DEVICE_LABELS = { Desktop: 'Computer', Mobile: 'Telefono', Tablet: 'Tablet', Altro: 'Altro' }

const nf = new Intl.NumberFormat('it-IT')
const delta = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 1000) / 10 : null)

function pathOf(url) {
  try { return new URL(url).pathname } catch { return url || '' }
}

function duration(start, end) {
  const s = Math.max(0, Math.round((new Date(end) - new Date(start)) / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

const fmtDateTime = (iso) => new Date(iso).toLocaleString('it-IT', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
})

function Kpi({ icon, label, value, d }) {
  const up = d != null && d > 0
  const down = d != null && d < 0
  return (
    <div className="adm-kpi" style={{ cursor: 'default' }}>
      <span className="adm-kpi-icon"><AdminIcon name={icon} size={22} /></span>
      <span className="adm-kpi-body">
        <span className="adm-kpi-label">{label}</span>
        <span className="adm-kpi-row">
          <span className="adm-kpi-value">{nf.format(value ?? 0)}</span>
          {d != null && (
            <span className={`adm-delta ${down ? 'is-bad' : up ? 'is-good' : ''}`}>
              {(up || down) && <AdminIcon name={down ? 'trendDown' : 'trendUp'} size={13} />}
              {d > 0 ? '+' : ''}{String(d).replace('.', ',')}%
            </span>
          )}
        </span>
      </span>
    </div>
  )
}

function DailyBars({ rows }) {
  if (!rows.length) return <Empty />
  const max = Math.max(...rows.map((r) => r.pageviews), 1)
  return (
    <div className="trf-bars" role="img" aria-label="Pagine viste per giorno">
      {rows.map((r) => (
        <div key={r.day} className="trf-bar-col" title={`${new Date(r.day).toLocaleDateString('it-IT')}: ${r.pageviews} pagine viste, ${r.visitors} visitatori`}>
          <div className="trf-bar" style={{ height: `${Math.max(4, (r.pageviews / max) * 100)}%` }} />
          <span className="trf-bar-label">{new Date(r.day).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
        </div>
      ))}
    </div>
  )
}

function HBars({ rows, label, value }) {
  if (!rows.length) return <Empty />
  const max = Math.max(...rows.map(value), 1)
  return (
    <ul className="trf-hbars">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="trf-hbar-name" title={label(r)}>{label(r)}</span>
          <span className="trf-hbar-track"><span style={{ width: `${(value(r) / max) * 100}%` }} /></span>
          <span className="trf-hbar-n">{nf.format(value(r))}</span>
        </li>
      ))}
    </ul>
  )
}

const Empty = () => <div style={{ color: 'var(--text-4)', fontSize: 13, padding: '8px 0' }}>Nessun dato nel periodo</div>

function Card({ title, icon, action, children }) {
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2 className="adm-card-title" style={{ margin: 0 }}><AdminIcon name={icon} size={18} />{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const ExtLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="adm-link">{children}</a>
)

export default function TrafficAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/traffico?giorni=${days}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || 'Impossibile caricare i dati.')
        return body
      })
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [days])

  const k = data?.kpi || {}

  return (
    <div className="adm-dash">
      <div className="adm-head">
        <div className="adm-kicker">Area Admin</div>
        <h1 className="adm-title">Traffico sito</h1>
        <p className="adm-sub">Visite, pagine, provenienza e registrazioni da PostHog. Solo utenti che hanno accettato i cookie statistici.</p>
      </div>

      <label className="adm-period">
        <span className="adm-period-icon"><AdminIcon name="calendar" size={20} /></span>
        <select value={days} onChange={(e) => { setData(null); setDays(Number(e.target.value)) }} aria-label="Periodo">
          {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
        <span className="adm-period-chev"><AdminIcon name="chevronDown" size={18} /></span>
      </label>

      {error && <div className="adm-card" style={{ color: 'var(--text-3)', fontSize: 14 }}>{error}</div>}
      {!data && !error && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)', fontSize: 14 }}>Caricamento...</div>}

      {data && !data.configured && (
        <div className="adm-card" style={{ fontSize: 14, color: 'var(--text-2)' }}>
          Manca la chiave PostHog sul server: aggiungi <code>POSTHOG_PERSONAL_API_KEY</code> nelle variabili d&apos;ambiente di Vercel.
        </div>
      )}

      {data?.configured && !data.error && (
        <>
          <div className="adm-kpis">
            <Kpi icon="users" label="Visitatori" value={k.visitors} d={delta(k.visitors, k.visitors_prev)} />
            <Kpi icon="list" label="Pagine viste" value={k.pageviews} d={delta(k.pageviews, k.pageviews_prev)} />
            <Kpi icon="calendar" label="Sessioni" value={k.sessions} d={delta(k.sessions, k.sessions_prev)} />
            <Kpi icon="pulse" label="Online ora" value={data.online} />
          </div>

          <Card title="Pagine viste per giorno" icon="chart" action={<ExtLink href={data.links.web}>Web analytics</ExtLink>}>
            <DailyBars rows={data.daily} />
          </Card>

          <div className="trf-grid">
            <Card title="Pagine più viste" icon="list" action={<ExtLink href={data.links.heatmaps}>Heatmap clic</ExtLink>}>
              <HBars rows={data.pages} label={(r) => r.path || '/'} value={(r) => r.views} />
            </Card>
            <Card title="Da dove arrivano" icon="arrowRight">
              <HBars rows={data.sources} label={(r) => SOURCE_LABELS[r.src] || r.src} value={(r) => r.visitors} />
            </Card>
            <Card title="Dispositivi" icon="users">
              <HBars rows={data.devices} label={(r) => DEVICE_LABELS[r.device] || r.device} value={(r) => r.visitors} />
            </Card>
            <Card title="Azioni degli utenti" icon="star" action={<ExtLink href={data.links.activity}>Tutti gli eventi</ExtLink>}>
              <HBars rows={data.events} label={(r) => EVENT_LABELS[r.event] || r.event} value={(r) => r.n} />
            </Card>
          </div>

          <Card title="Ultime registrazioni" icon="camera" action={<ExtLink href={data.links.replay}>Tutte le registrazioni</ExtLink>}>
            {data.replays.length === 0 ? <Empty /> : (
              <ul className="adm-activity">
                {data.replays.map((r) => (
                  <li key={r.session_id} className="trf-replay">
                    <span className="trf-replay-main">
                      <span className="adm-act-title">{pathOf(r.url) || '/'}</span>
                      <span className="adm-act-sub">{duration(r.start, r.end)} · {nf.format(r.clicks || 0)} clic</span>
                    </span>
                    <span className="adm-act-time">{fmtDateTime(r.start)}</span>
                    <ExtLink href={r.link}>Guarda</ExtLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
