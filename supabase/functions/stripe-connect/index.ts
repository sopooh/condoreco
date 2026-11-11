// Collega l'account Stripe del condominio (Express) e ne aggiorna lo stato.
// action: 'onboard' → link alla verifica Stripe; 'status' → controlla se può incassare.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json, safeReturn, SITE, stripe, STRIPE_KEY } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!STRIPE_KEY) return json({ error: 'Stripe non è ancora configurato su Condoreco: serve la chiave segreta della piattaforma.' }, 503)

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Accedi di nuovo.' }, 401)

  const { buildingId, action, returnUrl } = await req.json().catch(() => ({}))
  const { data: isAdmin } = await userClient.rpc('is_condo_admin', { p_building: buildingId })
  if (!isAdmin) return json({ error: 'Solo l’amministratore del condominio può collegare Stripe.' }, 403)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: s } = await admin.from('condo_accounting_settings').select('stripe_account_id').eq('building_id', buildingId).maybeSingle()
  let account = s?.stripe_account_id as string | undefined

  try {
    if (action === 'status') {
      if (!account) return json({ ready: false })
      const acc = await stripe(`accounts/${account}`, undefined, 'GET')
      const ready = Boolean(acc.charges_enabled && acc.payouts_enabled)
      await admin.from('condo_accounting_settings').upsert({ building_id: buildingId, stripe_account_id: account, stripe_ready: ready, updated_at: new Date().toISOString() })
      return json({ ready })
    }
    if (!account) {
      const acc = await stripe('accounts', {
        type: 'express', country: 'IT', email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { building_id: buildingId },
      })
      account = acc.id
      await admin.from('condo_accounting_settings').upsert({ building_id: buildingId, stripe_account_id: account, stripe_ready: false, updated_at: new Date().toISOString() })
    }
    const back = safeReturn(returnUrl, `${SITE}/`)
    const link = await stripe('account_links', { account, type: 'account_onboarding', refresh_url: back.toString(), return_url: back.toString() })
    return json({ url: link.url })
  } catch (e) {
    console.error('[stripe-connect]', e)
    return json({ error: 'Stripe non ha risposto. Riprova tra poco.' }, 502)
  }
})
