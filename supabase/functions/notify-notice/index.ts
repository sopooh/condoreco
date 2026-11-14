// Invia per email un avviso ai vicini già creato con send_condo_notice.
// Chiamata dal client subito dopo l'RPC: { notice_id }.
// Solo l'autore dell'avviso può farla partire, una volta sola (emailed_at).
// Senza RESEND_API_KEY configurata non fa nulla: restano le notifiche in app.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTICE_EMAIL_FROM') || 'Condoreco <hello@condoreco.com>'
  const siteUrl = Deno.env.get('SITE_URL') || 'https://www.condoreco.com'

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let noticeId = ''
  try { noticeId = (await req.json()).notice_id } catch { /* body non valido */ }
  if (!noticeId) return json({ error: 'notice_id required' }, 400)

  const { data: notice } = await admin.from('condo_notices')
    .select('id, building_id, created_by, message, emailed_at').eq('id', noticeId).maybeSingle()
  if (!notice || notice.created_by !== user.id) return json({ error: 'not found' }, 404)
  if (notice.emailed_at) return json({ sent: 0, already: true })
  if (!resendKey) return json({ sent: 0, skipped: 'email not configured' })

  // segna subito come inviato: evita doppi invii se la chiamata viene ripetuta
  const { data: claimed } = await admin.from('condo_notices')
    .update({ emailed_at: new Date().toISOString() }).eq('id', noticeId).is('emailed_at', null).select('id')
  if (!claimed?.length) return json({ sent: 0, already: true })

  const { data: notifs } = await admin.from('notifications').select('user_id, title, link').eq('notice_id', noticeId)
  if (!notifs?.length) return json({ sent: 0 })

  const { data: building } = await admin.from('buildings')
    .select('address, street_number, city').eq('id', notice.building_id).maybeSingle()
  const where = building ? `${building.address}${building.street_number ? ', ' + building.street_number : ''}${building.city ? ' · ' + building.city : ''}` : ''

  const emails: { to: string; title: string; link: string }[] = []
  for (const n of notifs) {
    const { data } = await admin.auth.admin.getUserById(n.user_id)
    if (data?.user?.email) emails.push({ to: data.user.email, title: n.title, link: n.link || '' })
  }

  const batch = emails.map((e) => ({
    from,
    to: [e.to],
    subject: `${e.title}${where ? ' · ' + where : ''}`,
    text: `${e.title}\n\n${notice.message}\n\n${where}\n\nApri Condoreco: ${siteUrl}${e.link}\n\nRicevi questa email perché sei un residente verificato di questo condominio.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2937">
      <div style="background:#0D676F;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-weight:700;font-size:18px">${esc(e.title)}</div>
      <div style="border:1px solid #E5E7EB;border-top:none;padding:20px 22px;border-radius:0 0 14px 14px">
        <p style="font-size:16px;line-height:1.5;margin:0 0 14px">${esc(notice.message)}</p>
        ${where ? `<p style="font-size:13px;color:#6B7280;margin:0 0 18px">${esc(where)}</p>` : ''}
        <a href="${siteUrl}${e.link}" style="display:inline-block;background:#0D676F;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Apri Condoreco</a>
        <p style="font-size:12px;color:#9CA3AF;margin:20px 0 0">Ricevi questa email perché sei un residente verificato di questo condominio.</p>
      </div></div>`,
  }))

  let sent = 0
  for (let i = 0; i < batch.length; i += 100) {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.slice(i, i + 100)),
    })
    if (r.ok) sent += Math.min(100, batch.length - i)
    else console.error('resend error', r.status, await r.text())
  }
  return json({ sent })
})
