// Funzioni comuni alle edge function delle assemblee:
// - PDF di convocazione e verbale (pdf-lib, carattere Helvetica);
// - invio tramite Openapi.it: PEC massiva e raccomandata online, con ricevute.
// OPENAPI_ENV = 'prod' per gli invii veri; qualsiasi altro valore usa i server di test.
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const isProd = () => Deno.env.get('OPENAPI_ENV') === 'prod'
export const openapiConfigured = () => !!Deno.env.get('OPENAPI_TOKEN')
const PEC_BASE = () => (isProd() ? 'https://ws.pecmassiva.com' : 'https://test.ws.pecmassiva.com')
const POST_BASE = () => (isProd() ? 'https://ws.ufficiopostale.com' : 'https://test.ws.ufficiopostale.com')
const auth = () => ({ Authorization: `Bearer ${Deno.env.get('OPENAPI_TOKEN')}` })

export const ROME = { timeZone: 'Europe/Rome' } as const
export const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { ...ROME, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'da definire'

export const MAJORITY_LABEL: Record<string, string> = {
  info: 'Punto informativo, senza votazione',
  ordinary: 'Maggioranza ordinaria (art. 1136 c. 2 e 3 c.c.)',
  art1136_c4: 'Maggioranza degli intervenuti e almeno 500 millesimi (art. 1136 c. 4 c.c.)',
  innov_1120_c2: 'Maggioranza degli intervenuti e almeno 500 millesimi (art. 1120 c. 2 c.c.)',
  innov_1120_c1: 'Maggioranza dei condomini e almeno 2/3 del valore (art. 1120 c. 1 c.c.)',
  unanimity: 'Unanimità',
}

// Helvetica (WinAnsi) non ha tutti i caratteri: sostituisce quelli non stampabili.
function safe(s: string) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ€]/g, '')
}

// PDF semplice: titolo + paragrafi (le righe che iniziano con "## " sono sottotitoli, "**...**" in grassetto).
export async function textPdf(title: string, body: string, footer: string) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const W = 595, H = 842, M = 56, LH = 15
  let page = doc.addPage([W, H])
  let y = H - M
  const newPage = () => { page = doc.addPage([W, H]); y = H - M }
  const write = (text: string, f = font, size = 10.5) => {
    const words = safe(text).split(/\s+/)
    let line = ''
    for (const w of words) {
      const t = line ? line + ' ' + w : w
      if (f.widthOfTextAtSize(t, size) > W - 2 * M) {
        if (y < M + LH) newPage()
        page.drawText(line, { x: M, y, size, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= LH; line = w
      } else line = t
    }
    if (line) { if (y < M + LH) newPage(); page.drawText(line, { x: M, y, size, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= LH }
  }
  write(title, bold, 15); y -= 8
  for (const raw of body.split('\n')) {
    const l = raw.trim()
    if (!l) { y -= 6; continue }
    if (l.startsWith('## ')) { y -= 4; write(l.slice(3), bold, 12); continue }
    if (l.startsWith('# ')) { y -= 4; write(l.slice(2), bold, 13); continue }
    const m = l.match(/^\*\*(.+)\*\*$/)
    if (m) { write(m[1], bold); continue }
    write(l.replace(/\*\*/g, '').replace(/^[-*] /, '• '))
  }
  const pages = doc.getPages()
  pages.forEach((p, i) => p.drawText(safe(`${footer} · pagina ${i + 1} di ${pages.length}`), { x: M, y: 28, size: 8, font, color: rgb(0.45, 0.45, 0.45) }))
  return await doc.save()
}

export function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// ---------- Openapi.it ----------
export type Sender = {
  sender_name: string | null; sender_address: string | null; sender_cap: string | null; sender_city: string | null
  sender_province: string | null; sender_email: string | null; pec_address: string | null; pec_username: string | null
}

export async function sendPec(opts: { sender: Sender; password: string; to: string; subject: string; html: string; pdfName: string; pdf: Uint8Array }) {
  const r = await fetch(`${PEC_BASE()}/send`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: opts.sender.pec_address,
      recipient: opts.to,
      subject: opts.subject,
      body: opts.html,
      attachments: [{ name: opts.pdfName, file: `data:application/pdf;base64,${toBase64(opts.pdf)}` }],
      username: opts.sender.pec_username || opts.sender.pec_address,
      password: opts.password,
    }),
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok || !out.success) throw new Error(`pec ${r.status}: ${String(out.message || '').slice(0, 160)}`)
  return String(out.message_id)
}

// Stato PEC: 'delivered' se c'è la ricevuta di CONSEGNA, 'accepted' con la sola ACCETTAZIONE.
export async function pecStatus(opts: { sender: Sender; password: string; code: string }) {
  const r = await fetch(`${PEC_BASE()}/send/${encodeURIComponent(opts.code)}`, {
    headers: { ...auth(), 'x-username': opts.sender.pec_username || opts.sender.pec_address || '', 'x-password': opts.password },
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`pec status ${r.status}`)
  const objs: string[] = (out.data ?? []).map((d: { object?: string }) => String(d.object || '').toUpperCase())
  if (objs.some((o) => o.startsWith('CONSEGNA'))) return { status: 'delivered' as const, at: (out.data ?? []).find((d: { object?: string }) => String(d.object).toUpperCase().startsWith('CONSEGNA'))?.data }
  if (objs.some((o) => o.includes('MANCATA CONSEGNA') || o.includes('ERRORE'))) return { status: 'failed' as const }
  if (objs.some((o) => o.startsWith('ACCETTAZIONE'))) return { status: 'accepted' as const }
  return { status: 'sent' as const }
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/)
  return parts.length > 1 ? { nome: parts.slice(0, -1).join(' '), cognome: parts[parts.length - 1] } : { nome: '', cognome: full.trim() }
}

export async function sendRaccomandata(opts: {
  sender: Sender; to: { name: string; address: string; cap: string; city: string; province: string }; pdf: Uint8Array
}) {
  const s = opts.sender
  const r = await fetch(`${POST_BASE()}/raccomandate/`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mittente: {
        ...splitName(s.sender_name || ''), indirizzo: s.sender_address, comune: s.sender_city, cap: s.sender_cap,
        provincia: s.sender_province, nazione: 'Italia', email: s.sender_email,
      },
      destinatari: [{
        ...splitName(opts.to.name), indirizzo: opts.to.address, comune: opts.to.city, cap: opts.to.cap,
        provincia: opts.to.province, nazione: 'Italia',
      }],
      documento: [`data:application/pdf;base64,${toBase64(opts.pdf)}`],
      opzioni: { fronteretro: false, colori: false, ar: true, autoconfirm: true },
    }),
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`raccomandata ${r.status}: ${JSON.stringify(out?.data?.wrong_fields ?? out?.message ?? '').slice(0, 200)}`)
  const id = out?.data?.[0]?.id ?? out?.data?.id
  if (!id) throw new Error('raccomandata: id mancante')
  return String(id)
}

export async function raccomandataStatus(id: string) {
  const r = await fetch(`${POST_BASE()}/raccomandate/${encodeURIComponent(id)}`, { headers: auth() })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`raccomandata status ${r.status}`)
  const d = Array.isArray(out.data) ? out.data[0] : out.data
  const state = String(d?.state || '').toUpperCase()
  const dest = d?.destinatari?.[0]
  const recipientState = String(dest?.stato || dest?.state || '').toUpperCase()
  if (/CONSEGNAT|RECAPITAT|DELIVERED/.test(recipientState)) return { status: 'delivered' as const, tracking: dest?.NumeroRaccomandata }
  if (/ERROR|ANNULL|CANCEL|RESPINT/.test(state + recipientState)) return { status: 'failed' as const }
  if (/SENT|INVIAT|PRESA|ACCETTAT|CONFIRMED/.test(state)) return { status: 'accepted' as const, tracking: dest?.NumeroRaccomandata }
  return { status: 'sent' as const }
}
