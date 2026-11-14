import { refreshToken, isInstagramLoginToken } from './graph'

// Legge le credenziali Instagram via RPC admin-only e rinnova il token se
// scade entro 10 giorni (i token Instagram Login durano 60 giorni).
export async function getCredentials(supabase) {
  const { data, error } = await supabase.rpc('ig_get_credentials')
  if (error) throw new Error(`Credenziali Instagram: ${error.message}`)
  const creds = Array.isArray(data) ? data[0] : data
  if (!creds) return null

  const expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : null
  if (isInstagramLoginToken(creds.access_token) && expiresAt && expiresAt - Date.now() < 10 * 86400000 && expiresAt > Date.now()) {
    try {
      const r = await refreshToken(creds.access_token)
      const { error: saveError } = await supabase.rpc('ig_save_credentials', {
        p_ig_user_id: creds.ig_user_id, p_username: creds.username,
        p_access_token: r.token, p_expires_at: r.expiresAt,
      })
      if (saveError) console.error('[instagram] save refreshed token', saveError)
      return { ...creds, access_token: r.token, expires_at: r.expiresAt }
    } catch (e) {
      console.error('[instagram] token refresh failed', e)
    }
  }
  return creds
}
