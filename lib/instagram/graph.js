// Instagram API. Due tipi di token:
//  - IGAA... (login Instagram, app vecchie)  -> graph.instagram.com, scade in 60 gg
//  - EAA...  (Unified login / utente di sistema, app nuove) -> graph.facebook.com, non scade
// Il flusso di pubblicazione è identico sui due host.
// Flusso: un container per slide (is_carousel_item) -> container CAROUSEL
// con children + caption -> attesa status FINISHED -> media_publish.
// Limiti: 2-10 slide per carosello, solo JPEG, 50 post / 24h, caption 2200.

const VERSION = process.env.IG_GRAPH_VERSION || 'v25.0'

export function isInstagramLoginToken(token) {
  return typeof token === 'string' && token.startsWith('IG')
}
export function baseFor(token) {
  return isInstagramLoginToken(token)
    ? `https://graph.instagram.com/${VERSION}`
    : `https://graph.facebook.com/${VERSION}`
}

async function igFetch(url, { method = 'GET', token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const msg = data.error?.error_user_msg || data.error?.message || `HTTP ${res.status}`
    throw new Error(`Instagram: ${msg}`)
  }
  return data
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Ritorna { id, username } dell'account Instagram professionale.
// Token IGAA: /me. Token EAA: usa igUserId se dato, altrimenti lo cerca
// tra gli account Instagram collegati alle Pagine accessibili.
export async function getAccount(token, igUserId) {
  const BASE = baseFor(token)
  if (isInstagramLoginToken(token)) {
    const me = await igFetch(`${BASE}/me?fields=user_id,username,account_type`, { token })
    return { id: String(me.user_id || me.id), username: me.username, accountType: me.account_type }
  }
  if (igUserId) {
    const a = await igFetch(`${BASE}/${igUserId}?fields=id,username`, { token })
    return { id: a.id, username: a.username, accountType: 'BUSINESS' }
  }
  const pages = await igFetch(`${BASE}/me/accounts?fields=instagram_business_account{id,username}&limit=100`, { token })
  const ig = (pages.data || []).map((p) => p.instagram_business_account).find(Boolean)
  if (!ig) throw new Error('Nessun account Instagram trovato per questo token: incolla anche l\'ID account Instagram')
  return { id: ig.id, username: ig.username, accountType: 'BUSINESS' }
}

// I token Instagram Login durano 60 giorni e si rinnovano se hanno >24h.
export async function refreshToken(token) {
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(`Rinnovo token: ${data.error?.message || res.status}`)
  return { token: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() }
}

async function waitFinished(containerId, token, { tries = 20, delay = 1500 } = {}) {
  const BASE = baseFor(token)
  for (let i = 0; i < tries; i++) {
    const s = await igFetch(`${BASE}/${containerId}?fields=status_code,status`, { token })
    if (s.status_code === 'FINISHED') return
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
      throw new Error(`Instagram: container ${s.status_code} ${s.status || ''}`.trim())
    }
    await sleep(delay)
  }
  throw new Error('Instagram: timeout in attesa che le immagini siano pronte')
}

// imageUrls: URL pubblici JPEG in ordine. Ritorna { containerId, mediaId, permalink }.
export async function publishImages({ igUserId, token, imageUrls, caption }) {
  if (!imageUrls.length) throw new Error('Nessuna slide da pubblicare')
  if (imageUrls.length > 10) throw new Error('Massimo 10 slide per carosello')
  if ((caption || '').length > 2200) throw new Error('Didascalia oltre 2200 caratteri')
  const BASE = baseFor(token)

  let containerId
  if (imageUrls.length === 1) {
    const c = await igFetch(`${BASE}/${igUserId}/media`, {
      method: 'POST', token, body: { image_url: imageUrls[0], caption },
    })
    containerId = c.id
  } else {
    const children = []
    for (const url of imageUrls) {
      const c = await igFetch(`${BASE}/${igUserId}/media`, {
        method: 'POST', token, body: { image_url: url, is_carousel_item: true },
      })
      children.push(c.id)
    }
    for (const id of children) await waitFinished(id, token)
    const parent = await igFetch(`${BASE}/${igUserId}/media`, {
      method: 'POST', token, body: { media_type: 'CAROUSEL', children: children.join(','), caption },
    })
    containerId = parent.id
  }

  await waitFinished(containerId, token)
  const published = await igFetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', token, body: { creation_id: containerId },
  })
  const media = await igFetch(`${BASE}/${published.id}?fields=permalink`, { token }).catch(() => ({}))
  return { containerId, mediaId: published.id, permalink: media.permalink || null }
}
