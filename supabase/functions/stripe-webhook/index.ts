// Webhook Stripe: a pagamento riuscito segna pagate le rate (metodo carta o PayPal).
// Configurare su Stripe l'evento checkout.session.completed (anche per gli account collegati).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { stripe, STRIPE_KEY } from '../_shared/stripe.ts'

const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

async function verify(payload: string, header: string | null) {
  if (!header || !SECRET) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const t = parts.t
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return sigs.includes(hex)
}

Deno.serve(async (req) => {
  const payload = await req.text()
  if (!(await verify(payload, req.headers.get('stripe-signature')))) return new Response('firma non valida', { status: 400 })
  const event = JSON.parse(payload)
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return new Response('ignorato')
  const session = event.data.object
  if (session.payment_status !== 'paid') return new Response('in attesa')

  const ids = String(session.metadata?.charge_ids ?? '').split(',').filter(Boolean)
  if (!ids.length) return new Response('nessuna rata')

  let method = 'carta'
  try {
    if (STRIPE_KEY && session.payment_intent) {
      const pi = await stripe(`payment_intents/${session.payment_intent}?expand[]=latest_charge`, undefined, 'GET')
      if (pi?.latest_charge?.payment_method_details?.type === 'paypal') method = 'paypal'
    }
  } catch (e) { console.error('[stripe-webhook] metodo', e) }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { error } = await admin.rpc('mark_charges_paid_online', { p_charges: ids, p_method: method, p_ref: `stripe ${session.payment_intent ?? session.id}` })
  if (error) { console.error('[stripe-webhook]', error); return new Response('errore', { status: 500 }) }
  return new Response('ok')
})
