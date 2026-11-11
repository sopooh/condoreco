// Avvia il pagamento online (carta, PayPal, Apple Pay, Google Pay) delle rate del condomino.
// Il denaro va all'account Stripe collegato dall'amministratore (destination charge).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json, safeReturn, SITE, stripe, STRIPE_KEY } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!STRIPE_KEY) return json({ error: 'I pagamenti online non sono ancora attivi su Condoreco. Usa il bonifico.' }, 503)

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Accedi per pagare.' }, 401)

  const { chargeIds, returnUrl } = await req.json().catch(() => ({}))
  if (!Array.isArray(chargeIds) || !chargeIds.length || chargeIds.length > 36) return json({ error: 'Scegli le rate da pagare.' }, 400)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: charges } = await admin.from('condo_charges').select('id, building_id, title, amount, status, user_id').in('id', chargeIds)
  const mine = (charges ?? []).filter((c) => c.user_id === user.id && (c.status === 'open' || c.status === 'pending'))
  if (mine.length !== chargeIds.length) return json({ error: 'Alcune rate non sono più da pagare. Ricarica la pagina.' }, 409)
  const buildingIds = [...new Set(mine.map((c) => c.building_id))]
  if (buildingIds.length !== 1) return json({ error: 'Paga le rate di un condominio alla volta.' }, 400)

  const { data: settings } = await admin.from('condo_accounting_settings').select('stripe_account_id, stripe_ready').eq('building_id', buildingIds[0]).maybeSingle()
  if (!settings?.stripe_ready || !settings.stripe_account_id) return json({ error: 'Il condominio non ha ancora attivato i pagamenti online. Usa il bonifico.' }, 409)

  const back = safeReturn(returnUrl, `${SITE}/`)
  const ok = new URL(back); ok.searchParams.set('pagamento', 'ok')
  const ko = new URL(back); ko.searchParams.set('pagamento', 'annullato')

  try {
    const session = await stripe('checkout/sessions', {
      mode: 'payment',
      locale: 'it',
      customer_email: user.email,
      success_url: ok.toString(),
      cancel_url: ko.toString(),
      line_items: mine.map((c) => ({ quantity: 1, price_data: { currency: 'eur', unit_amount: Math.round(Number(c.amount) * 100), product_data: { name: c.title } } })),
      payment_intent_data: { transfer_data: { destination: settings.stripe_account_id }, metadata: { charge_ids: mine.map((c) => c.id).join(','), building_id: buildingIds[0] } },
      metadata: { charge_ids: mine.map((c) => c.id).join(','), building_id: buildingIds[0], user_id: user.id },
    })
    return json({ url: session.url })
  } catch (e) {
    console.error('[stripe-checkout]', e)
    return json({ error: 'Stripe non ha accettato il pagamento. Riprova o usa il bonifico.' }, 502)
  }
})
