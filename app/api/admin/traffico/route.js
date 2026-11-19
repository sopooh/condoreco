import { requireAdmin, json } from '@/lib/instagram/auth'
import { hogql, posthogAppUrl, posthogConfigured } from '@/lib/posthog/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CUSTOM_EVENTS = [
  'account_signup_submitted', 'user_login_succeeded', 'review_submitted',
  'building_submission_completed', 'chat_message_sent', 'intervention_created',
  'online_payment_checkout_started', 'supplier_appointment_proposed', 'supplier_intervention_completed',
]

// Pagine del nostro sito: escluse dalle sorgenti di traffico.
const OWN = "(src LIKE '%condoreco%')"

// GET /api/admin/traffico?giorni=7|30|90 -> statistiche PostHog per il pannello admin
export async function GET(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!posthogConfigured()) return json({ configured: false })

  const asked = Number(new URL(request.url).searchParams.get('giorni'))
  const d = [7, 30, 90].includes(asked) ? asked : 30
  const cur = `timestamp >= now() - toIntervalDay(${d})`
  const events = CUSTOM_EVENTS.map((e) => `'${e}'`).join(', ')

  try {
    const [kpi, daily, pages, sources, devices, custom, replays, live] = await Promise.all([
      hogql(`SELECT
          uniqIf(person_id, ${cur}) AS visitors,
          countIf(event = '$pageview' AND ${cur}) AS pageviews,
          uniqIf(\`$session_id\`, ${cur}) AS sessions,
          uniqIf(person_id, NOT ${cur}) AS visitors_prev,
          countIf(event = '$pageview' AND NOT ${cur}) AS pageviews_prev,
          uniqIf(\`$session_id\`, NOT ${cur}) AS sessions_prev
        FROM events WHERE timestamp >= now() - toIntervalDay(${d * 2})`, 'admin kpi'),
      hogql(`SELECT toDate(timestamp) AS day, uniq(person_id) AS visitors, countIf(event = '$pageview') AS pageviews
        FROM events WHERE ${cur} GROUP BY day ORDER BY day`, 'admin daily'),
      hogql(`SELECT properties.$pathname AS path, count() AS views, uniq(person_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${cur}
        GROUP BY path ORDER BY views DESC LIMIT 10`, 'admin pages'),
      hogql(`SELECT src, visitors FROM (
          SELECT coalesce(nullIf(properties.$referring_domain, ''), '$direct') AS src, uniq(person_id) AS visitors
          FROM events WHERE event = '$pageview' AND ${cur} GROUP BY src
        ) WHERE NOT ${OWN} ORDER BY visitors DESC LIMIT 8`, 'admin sources'),
      hogql(`SELECT coalesce(properties.$device_type, 'Altro') AS device, uniq(person_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${cur} GROUP BY device ORDER BY visitors DESC`, 'admin devices'),
      hogql(`SELECT event, count() AS n FROM events WHERE event IN (${events}) AND ${cur} GROUP BY event`, 'admin custom'),
      hogql(`SELECT session_id, min(min_first_timestamp) AS start, max(max_last_timestamp) AS end,
          sum(click_count) AS clicks, argMinMerge(first_url) AS url
        FROM raw_session_replay_events WHERE min_first_timestamp >= now() - toIntervalDay(${d})
        GROUP BY session_id ORDER BY start DESC LIMIT 12`, 'admin replays'),
      hogql(`SELECT uniq(person_id) AS online FROM events WHERE timestamp >= now() - INTERVAL 5 MINUTE`, 'admin live'),
    ])

    const counts = Object.fromEntries(custom.map((r) => [r.event, r.n]))
    return json({
      configured: true,
      days: d,
      kpi: kpi[0] || {},
      online: live[0]?.online ?? 0,
      daily,
      pages,
      sources,
      devices,
      events: CUSTOM_EVENTS.map((e) => ({ event: e, n: counts[e] || 0 })),
      replays: replays.map((r) => ({ ...r, link: posthogAppUrl(`/replay/${r.session_id}`) })),
      links: {
        web: posthogAppUrl('/web'),
        replay: posthogAppUrl('/replay/home'),
        heatmaps: posthogAppUrl('/heatmaps'),
        activity: posthogAppUrl('/activity/explore'),
      },
    })
  } catch (e) {
    console.error('[admin/traffico]', e)
    return json({ configured: true, error: 'Impossibile leggere i dati da PostHog.' }, 502)
  }
}
