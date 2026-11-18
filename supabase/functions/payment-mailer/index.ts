// Email sulle rate condominiali, chiamata da pg_cron (run_payment_mailer) ogni 15 minuti
// con un gettone monouso in cleanup_tokens: senza gettone valido non fa niente.
// 1. Ricevuta: rata segnata pagata (online, bonifico confermato, import estratto conto).
// 2. Promemoria: rata aperta in scadenza entro 3 giorni.
// 3. Scaduta: rata aperta scaduta da meno di 30 giorni (una volta sola).
// Ogni rata viene "prenotata" (colonna *_emailed_at) prima dell'invio: niente doppioni
// se la funzione gira due volte. Le rate dello stesso utente e condominio vanno in una sola email.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { emailConfigured, euro, render, sendMails, userEmails } from '../_shared/email.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Charge = {
  id: string; building_id: string; user_id: string; title: string; amount: number
  due_date: string; paid_at: string | null; paid_amount: number | null; payment_method: string | null
}
type Kind = 'receipt' | 'reminder' | 'overdue'

const COL: Record<Kind, string> = { receipt: 'receipt_emailed_at', reminder: 'reminder_emailed_at', overdue: 'overdue_emailed_at' }
const METHOD: Record<string, string> = { bonifico: 'bonifico', carta: 'carta', paypal: 'PayPal', contanti: 'contanti', altro: 'altro' }
const fmtDate = (d: string) => new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' })
const romeToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }) // YYYY-MM-DD
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

async function claim(svc: SupabaseClient, kind: Kind): Promise<Charge[]> {
  const today = romeToday()
  const cols = 'id, building_id, user_id, title, amount, due_date, paid_at, paid_amount, payment_method'
  let q = svc.from('condo_charges').select('id').is(COL[kind], null).limit(300)
  if (kind === 'receipt') q = q.eq('status', 'paid').gte('paid_at', new Date(Date.now() - 7 * 864e5).toISOString())
  if (kind === 'reminder') q = q.eq('status', 'open').gte('due_date', today).lte('due_date', addDays(today, 3))
  if (kind === 'overdue') q = q.eq('status', 'open').lt('due_date', today).gte('due_date', addDays(today, -30))
  const { data: ids, error } = await q
  if (error) { console.error('[payment-mailer] select', kind, error.message); return [] }
  if (!ids?.length) return []
  const { data, error: uErr } = await svc.from('condo_charges').update({ [COL[kind]]: new Date().toISOString() })
    .in('id', ids.map((r) => r.id)).is(COL[kind], null).select(cols)
  if (uErr) { console.error('[payment-mailer] claim', kind, uErr.message); return [] }
  return (data ?? []) as Charge[]
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const { token } = await req.json().catch(() => ({}))
  if (!token) return json({ error: 'forbidden' }, 403)
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: ok, error: tErr } = await svc.rpc('use_cleanup_token', { p_token: token })
  if (tErr || !ok) return json({ error: 'forbidden' }, 403)
  if (!emailConfigured()) return json({ skipped: 'email not configured' })

  const out: Record<Kind, number> = { receipt: 0, reminder: 0, overdue: 0 }
  for (const kind of ['receipt', 'reminder', 'overdue'] as Kind[]) {
    const charges = await claim(svc, kind)
    if (!charges.length) continue

    const { data: bs } = await svc.from('buildings').select('id, address, street_number, city').in('id', [...new Set(charges.map((c) => c.building_id))])
    const where = new Map((bs ?? []).map((b) => [b.id, `${b.address}${b.street_number ? ', ' + b.street_number : ''}${b.city ? ' · ' + b.city : ''}`]))
    const addr = await userEmails(svc, charges.map((c) => c.user_id))

    // una email per utente e condominio
    const groups = new Map<string, Charge[]>()
    for (const c of charges) {
      const k = `${c.user_id}|${c.building_id}`
      groups.set(k, [...(groups.get(k) ?? []), c])
    }

    const mails = [], notifs = []
    for (const list of groups.values()) {
      const { user_id, building_id } = list[0]
      const total = list.reduce((s, c) => s + Number(kind === 'receipt' ? c.paid_amount ?? c.amount : c.amount), 0)
      const one = list.length === 1
      const path = `/edificio/${building_id}/condominio/contabilita`
      const rows: [string, string][] = list.map((c) => [c.title, kind === 'receipt'
        ? `${euro(c.paid_amount ?? c.amount)}${c.payment_method ? ' · ' + (METHOD[c.payment_method] ?? c.payment_method) : ''}`
        : `${euro(c.amount)} · scade il ${fmtDate(c.due_date)}`])
      if (!one) rows.push(['Totale', euro(total)])

      const t = kind === 'receipt'
        ? { title: one ? 'Pagamento registrato' : `${list.length} pagamenti registrati`,
          subject: `Pagamento registrato: ${one ? list[0].title : `${list.length} rate`} · ${euro(total)}`,
          p: `L'amministrazione ha registrato il pagamento${one ? ' della rata' : ' delle rate'} qui sotto. Grazie!`,
          cta: 'Vedi i pagamenti',
          notif: null }
        : kind === 'reminder'
        ? { title: one ? 'Rata in scadenza' : `${list.length} rate in scadenza`,
          subject: `Promemoria: ${one ? `${list[0].title} scade il ${fmtDate(list[0].due_date)}` : `${list.length} rate in scadenza`} · ${euro(total)}`,
          p: `${one ? 'Questa rata scade' : 'Queste rate scadono'} nei prossimi giorni. Puoi pagare online o segnalare un bonifico già fatto direttamente da Condoreco.`,
          cta: 'Paga o segnala il bonifico',
          notif: one ? `${list[0].title}: scade il ${fmtDate(list[0].due_date)}` : `${list.length} rate in scadenza, totale ${euro(total)}` }
        : { title: one ? 'Rata scaduta' : `${list.length} rate scadute`,
          subject: `Rata scaduta: ${one ? list[0].title : `${list.length} rate`} · ${euro(total)}`,
          p: `Non risulta ancora il pagamento di ${one ? 'questa rata' : 'queste rate'}. Se hai già pagato con bonifico, segnalalo da Condoreco così l'amministratore può confermarlo.`,
          cta: 'Paga o segnala il bonifico',
          notif: one ? `${list[0].title}: scaduta il ${fmtDate(list[0].due_date)}` : `${list.length} rate scadute, totale ${euro(total)}` }

      const to = addr.get(user_id)
      if (to) {
        mails.push({ to, subject: t.subject.slice(0, 200), ...render({
          title: t.title, paragraphs: [t.p], rows, where: where.get(building_id),
          cta: { label: t.cta, path },
          footer: 'Ricevi questa email perché hai rate condominiali registrate su Condoreco. Per domande sull\'importo rivolgiti al tuo amministratore.',
        }) })
      }
      if (t.notif) notifs.push({ user_id, building_id, kind: 'payment', title: t.title, body: t.notif, link: path })
    }

    if (notifs.length) {
      const { error } = await svc.from('notifications').insert(notifs)
      if (error) console.error('[payment-mailer] notifications', error.message)
    }
    out[kind] = await sendMails(mails, `charges-${kind}-${charges.map((c) => c.id).sort().join('').slice(0, 64)}-${romeToday()}`)
  }
  console.log('[payment-mailer]', JSON.stringify(out))
  return json(out)
})
