import { requireAdmin, json } from '@/lib/instagram/auth'
import { getAccount, refreshToken, isInstagramLoginToken } from '@/lib/instagram/graph'
import { getCredentials } from '@/lib/instagram/credentials'
import { adsConfig } from '@/lib/instagram/ads'

export const runtime = 'nodejs'

// GET -> stato collegamento (mai il token)
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  try {
    const creds = await getCredentials(auth.supabase)
    const ads = adsConfig(creds?.access_token)
    return json({
      connected: !!creds,
      username: creds?.username ?? null,
      expiresAt: creds?.expires_at ?? null,
      ads: { ready: ads.ready, missing: ads.missing },
    })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

// POST { accessToken } -> verifica il token su Instagram e lo salva
export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { accessToken, igUserId } = await request.json().catch(() => ({}))
  if (!accessToken) return json({ error: 'Incolla il token di accesso' }, 400)
  try {
    let token = accessToken.trim()
    const me = await getAccount(token, igUserId?.trim() || undefined)
    // token utente di sistema (EAA): non scade, niente rinnovo
    let expiresAt = null
    if (isInstagramLoginToken(token)) {
      expiresAt = new Date(Date.now() + 60 * 86400000).toISOString()
      try {
        const r = await refreshToken(token)
        token = r.token
        expiresAt = r.expiresAt
      } catch (e) {
        // un token appena generato (<24h) non si può ancora rinnovare: va bene così
        console.warn('[instagram] initial refresh skipped', e.message)
      }
    }
    const { error } = await auth.supabase.rpc('ig_save_credentials', {
      p_ig_user_id: me.id, p_username: me.username,
      p_access_token: token, p_expires_at: expiresAt,
    })
    if (error) return json({ error: error.message }, 500)
    return json({ connected: true, username: me.username, accountType: me.accountType, expiresAt })
  } catch (e) {
    return json({ error: e.message }, 422)
  }
}
