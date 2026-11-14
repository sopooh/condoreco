// Sponsorizzazione di un post già pubblicato tramite Marketing API.
// Crea campagna -> gruppo inserzioni -> creatività dal post -> inserzione,
// TUTTO in stato PAUSED: nessuna spesa finché non attivi da Gestione inserzioni.
//
// Variabili d'ambiente (Vercel):
//   META_ADS_ACCESS_TOKEN   token utente di sistema con ads_management
//   META_AD_ACCOUNT_ID      es. act_1234567890 (il prefisso act_ è opzionale)
//   META_PAGE_ID            Pagina Facebook collegata a @condoreco
//   META_IG_USER_ID         (opzionale) ID account IG; default: quello dello studio
//   META_DSA_BENEFICIARY    (opzionale) default "Condoreco", obbligatorio in UE
//   META_DSA_PAYOR          (opzionale) default = beneficiary
//   META_SPECIAL_AD_CATEGORIES (opzionale) es. "HOUSING"

const VERSION = process.env.META_GRAPH_VERSION || 'v25.0'
const BASE = `https://graph.facebook.com/${VERSION}`

export const OBJECTIVES = {
  traffic: { objective: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS', label: 'Visite al sito' },
  engagement: { objective: 'OUTCOME_ENGAGEMENT', optimization: 'POST_ENGAGEMENT', label: 'Interazioni' },
  awareness: { objective: 'OUTCOME_AWARENESS', optimization: 'REACH', label: 'Copertura' },
}

// fallbackToken: il token EAA dello studio (utente di sistema con ads_management),
// così con Unified login basta un solo token per pubblicare e sponsorizzare.
export function adsConfig(fallbackToken) {
  const token = process.env.META_ADS_ACCESS_TOKEN
    || (fallbackToken && !fallbackToken.startsWith('IG') ? fallbackToken : null)
  const account = process.env.META_AD_ACCOUNT_ID
  const pageId = process.env.META_PAGE_ID
  const missing = [
    !token && 'META_ADS_ACCESS_TOKEN (o token EAA nello studio)', !account && 'META_AD_ACCOUNT_ID', !pageId && 'META_PAGE_ID',
  ].filter(Boolean)
  return {
    ready: missing.length === 0,
    missing,
    token,
    accountId: account ? (account.startsWith('act_') ? account : `act_${account}`) : null,
    pageId,
    igUserId: process.env.META_IG_USER_ID || null,
    dsaBeneficiary: process.env.META_DSA_BENEFICIARY || 'Condoreco',
    dsaPayor: process.env.META_DSA_PAYOR || process.env.META_DSA_BENEFICIARY || 'Condoreco',
    specialCategories: (process.env.META_SPECIAL_AD_CATEGORIES || '').split(',').map((s) => s.trim()).filter(Boolean),
  }
}

async function fb(pathname, token, params = {}, method = 'POST') {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    body.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
  body.set('access_token', token)
  const url = method === 'GET' ? `${BASE}/${pathname}?${body}` : `${BASE}/${pathname}`
  const res = await fetch(url, { method, body: method === 'GET' ? undefined : body, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const e = data.error || {}
    throw new Error(`Meta Ads: ${e.error_user_msg || e.message || `HTTP ${res.status}`}`)
  }
  return data
}

async function findCityKey(token, city) {
  const r = await fb('search', token, {
    type: 'adgeolocation', location_types: ['city'], q: city, country_code: 'IT', limit: 1,
  }, 'GET')
  const hit = r.data?.[0]
  if (!hit) throw new Error(`Città non trovata per il targeting: ${city}`)
  return hit.key
}

// opts: { mediaId, name, objective, dailyBudgetEur, days, city, radiusKm, ageMin, ageMax, link }
export async function boostPost(opts, fallbackIgUserId, fallbackToken) {
  const cfg = adsConfig(fallbackToken)
  if (!cfg.ready) throw new Error(`Configurazione ads mancante: ${cfg.missing.join(', ')}`)
  const obj = OBJECTIVES[opts.objective] || OBJECTIVES.traffic
  const days = Math.min(Math.max(Number(opts.days) || 7, 1), 30)
  const daily = Math.max(Number(opts.dailyBudgetEur) || 5, 1)
  const ageMin = Math.min(Math.max(Number(opts.ageMin) || 25, 18), 65)
  const ageMax = Math.min(Math.max(Number(opts.ageMax) || 55, ageMin), 65)
  const igUserId = cfg.igUserId || fallbackIgUserId
  const name = opts.name || `Condoreco boost ${new Date().toISOString().slice(0, 10)}`

  const geo = { countries: ['IT'] }
  if (opts.city) {
    const key = await findCityKey(cfg.token, opts.city)
    const radius = Math.min(Math.max(Number(opts.radiusKm) || 15, 1), 80)
    delete geo.countries
    geo.cities = [{ key, radius, distance_unit: 'kilometer' }]
  }

  const campaign = await fb(`${cfg.accountId}/campaigns`, cfg.token, {
    name,
    objective: obj.objective,
    status: 'PAUSED',
    special_ad_categories: cfg.specialCategories,
    is_adset_budget_sharing_enabled: false,
  })

  const start = new Date(Date.now() + 10 * 60 * 1000)
  const end = new Date(start.getTime() + days * 86400000)
  const adset = await fb(`${cfg.accountId}/adsets`, cfg.token, {
    name: `${name} - pubblico`,
    campaign_id: campaign.id,
    daily_budget: Math.round(daily * 100),
    billing_event: 'IMPRESSIONS',
    optimization_goal: obj.optimization,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    targeting: {
      geo_locations: geo,
      age_min: ageMin,
      age_max: ageMax,
      publisher_platforms: ['instagram'],
      instagram_positions: ['stream', 'story', 'explore', 'reels'],
      targeting_automation: { advantage_audience: 0 },
    },
    dsa_beneficiary: cfg.dsaBeneficiary,
    dsa_payor: cfg.dsaPayor,
    status: 'PAUSED',
  })

  const creative = await fb(`${cfg.accountId}/adcreatives`, cfg.token, {
    name: `${name} - creatività`,
    object_id: cfg.pageId,
    instagram_user_id: igUserId,
    source_instagram_media_id: opts.mediaId,
    call_to_action: obj.objective === 'OUTCOME_TRAFFIC'
      ? { type: 'LEARN_MORE', value: { link: opts.link } }
      : undefined,
  })

  const ad = await fb(`${cfg.accountId}/ads`, cfg.token, {
    name: `${name} - inserzione`,
    adset_id: adset.id,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  })

  return {
    status: 'paused',
    objective: opts.objective,
    daily_budget_eur: daily,
    days,
    total_max_eur: daily * days,
    city: opts.city || null,
    campaign_id: campaign.id,
    adset_id: adset.id,
    creative_id: creative.id,
    ad_id: ad.id,
    manager_url: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${cfg.accountId.replace('act_', '')}&selected_campaign_ids=${campaign.id}`,
    created_at: new Date().toISOString(),
  }
}
