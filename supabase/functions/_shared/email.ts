// Email di servizio via Resend, condivise dalle edge function.
// Senza RESEND_API_KEY non parte nulla: restano le notifiche in app.
// Mittente: NOTICE_EMAIL_FROM (hello@condoreco.com, dominio verificato su Resend);
// le risposte vanno all'unico indirizzo di contatto, hello@condoreco.com.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const KEY = () => Deno.env.get('RESEND_API_KEY') ?? ''
export const emailConfigured = () => !!KEY()
export const FROM = () => Deno.env.get('NOTICE_EMAIL_FROM') || 'Condoreco <hello@condoreco.com>'
export const REPLY_TO = 'hello@condoreco.com'
export const SITE = () => Deno.env.get('SITE_URL') || 'https://www.condoreco.com'

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export const euro = (n: number | string) =>
  Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

export type Mail = { to: string; subject: string; text: string; html: string }

// Layout unico, uguale all'avviso ai vicini: intestazione verde, testo, righe di dettaglio, pulsante.
export function render(o: {
  title: string
  paragraphs: string[]
  rows?: [string, string][]
  list?: string[]
  where?: string
  cta: { label: string; path: string }
  footer: string
}): { html: string; text: string } {
  const href = `${SITE()}${o.cta.path}`
  const rows = o.rows?.length
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 16px">${o.rows.map(([k, v]) =>
      `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top;width:42%">${esc(k)}</td><td style="padding:6px 0;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('')}</table>`
    : ''
  const list = o.list?.length
    ? `<ol style="font-size:15px;line-height:1.5;margin:0 0 16px;padding-left:20px">${o.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`
    : ''
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2937">
  <div style="background:#0D676F;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-weight:700;font-size:18px">${esc(o.title)}</div>
  <div style="border:1px solid #E5E7EB;border-top:none;padding:20px 22px;border-radius:0 0 14px 14px">
    ${o.paragraphs.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 14px">${esc(p)}</p>`).join('')}
    ${rows}${list}
    ${o.where ? `<p style="font-size:13px;color:#6B7280;margin:0 0 18px">${esc(o.where)}</p>` : ''}
    <a href="${href}" style="display:inline-block;background:#0D676F;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">${esc(o.cta.label)}</a>
    <p style="font-size:12px;color:#9CA3AF;margin:20px 0 0">${esc(o.footer)}</p>
  </div></div>`
  const text = [
    o.title, '',
    ...o.paragraphs.flatMap((p) => [p, '']),
    ...(o.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(o.list ?? []).map((l, i) => `${i + 1}. ${l}`),
    ...(o.rows?.length || o.list?.length ? [''] : []),
    ...(o.where ? [o.where, ''] : []),
    `${o.cta.label}: ${href}`, '',
    o.footer,
  ].join('\n')
  return { html, text }
}

// Email degli utenti (da auth), una sola richiesta per utente.
export async function userEmails(svc: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const id of [...new Set(ids)]) {
    const { data, error } = await svc.auth.admin.getUserById(id)
    if (error) { console.error('[email] user', id, error.message); continue }
    if (data?.user?.email) out.set(id, data.user.email)
  }
  return out
}

// Invio a blocchi di 100 (API batch di Resend). idemKey rende sicuri i tentativi
// ripetuti: Resend scarta per 24 ore un blocco già inviato con la stessa chiave.
export async function sendMails(mails: Mail[], idemKey: string): Promise<number> {
  if (!emailConfigured() || !mails.length) return 0
  let sent = 0
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => ({ from: FROM(), reply_to: REPLY_TO, ...m, to: [m.to] }))
    try {
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY()}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${idemKey}-${i / 100}`.slice(0, 256),
        },
        body: JSON.stringify(chunk),
      })
      if (r.ok) sent += chunk.length
      else console.error('[email] resend', r.status, (await r.text()).slice(0, 300))
    } catch (e) {
      console.error('[email] resend', e instanceof Error ? e.message : String(e))
    }
  }
  return sent
}
