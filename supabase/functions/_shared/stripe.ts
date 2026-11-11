// Chiamate REST a Stripe senza SDK (form-encoded), condivise dalle funzioni.
export const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
export const SITE = Deno.env.get('SITE_URL') ?? 'https://www.condoreco.com'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function encode(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (Array.isArray(v)) v.forEach((item, i) => {
      if (typeof item === 'object') out.push(...encode(item as Record<string, unknown>, `${key}[${i}]`))
      else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`)
    })
    else if (typeof v === 'object') out.push(...encode(v as Record<string, unknown>, key))
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
  }
  return out
}

export async function stripe(path: string, params?: Record<string, unknown>, method = 'POST') {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : encode(params ?? {}).join('&'),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`)
  return data
}

// Solo indirizzi di Condoreco (o sviluppo locale) come ritorno dal pagamento
export function safeReturn(url: unknown, fallback: string) {
  try {
    const u = new URL(String(url))
    if (u.hostname === 'www.condoreco.com' || u.hostname === 'condoreco.com' || u.hostname === 'localhost' || u.hostname.endsWith('.vercel.app')) return u
  } catch { /* indirizzo non valido */ }
  return new URL(fallback)
}
