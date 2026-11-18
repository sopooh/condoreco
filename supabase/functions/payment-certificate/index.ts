// Attestazione dello stato dei pagamenti per il rogito (art. 1130 n. 9 c.c.).
// action 'create' (amministratore): legge le rate dell'anno in corso e del precedente
//   (art. 63 c. 4 disp. att.: l'acquirente risponde in solido per questi due anni),
//   crea il PDF, lo salva nell'archivio come documento riservato e avvisa il condomino.
// action 'download' (amministratore o condomino interessato): link temporaneo al PDF.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS, json, textPdf } from '../_shared/assembly.ts'

const BUCKET = 'condo-documents'
const eur = (n: number) => Number(n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const day = (d: string | null) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('it-IT') : '')
const STATUS: Record<string, string> = { paid: 'pagata', open: 'da pagare', pending: 'pagamento da verificare' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const body = await req.json().catch(() => ({}))
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

    if (body.action === 'download') {
      // RLS: la riga è visibile solo all'amministratore o al condomino interessato
      const { data: cert } = await userClient.from('condo_payment_certificates').select('id, document_id').eq('id', body.certificate_id).maybeSingle()
      if (!cert?.document_id) return json({ error: 'Attestazione non trovata' }, 404)
      const { data: doc } = await svc.from('condo_documents').select('file_path').eq('id', cert.document_id).maybeSingle()
      if (!doc) return json({ error: 'File non trovato' }, 404)
      const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(doc.file_path, 300)
      return json({ url: signed?.signedUrl })
    }

    if (body.action !== 'create') return json({ error: 'Richiesta non valida' }, 400)
    const { building_id, user_id, notes } = body
    const asOf = String(body.as_of || new Date().toISOString().slice(0, 10)).slice(0, 10)
    const { data: isAdmin } = await userClient.rpc('is_condo_admin', { p_building: building_id })
    if (!isAdmin) return json({ error: 'Solo l\'amministratore può rilasciare l\'attestazione' }, 403)

    const { data: st, error: stErr } = await userClient.rpc('payment_statement', { p_building: building_id, p_user: user_id, p_as_of: asOf })
    if (stErr || !st) { console.error('[payment-certificate] statement', stErr?.message); return json({ error: 'Non riesco a leggere i pagamenti' }, 500) }

    const [{ data: b }, { data: prof }, { data: units }] = await Promise.all([
      svc.from('buildings').select('address, street_number, city').eq('id', building_id).maybeSingle(),
      svc.from('profiles').select('display_name').eq('id', user_id).maybeSingle(),
      svc.from('condo_unit_people').select('full_name, role, condo_units(code)').eq('building_id', building_id).eq('user_id', user_id),
    ])
    const condo = `Condominio di ${[b?.address, b?.street_number].filter(Boolean).join(' ')}${b?.city ? `, ${b.city}` : ''}`
    const name = units?.[0]?.full_name || prof?.display_name || 'Condomino'
    // deno-lint-ignore no-explicit-any
    const unitCodes = (units ?? []).map((u: any) => u.condo_units?.code).filter(Boolean).join(', ')
    const [y0, y1] = st.years as number[]
    const settled = Number(st.open_due) === 0 && Number(st.pending_check) === 0

    const lines = [
      `Il sottoscritto amministratore del ${condo}, ai sensi dell'art. 1130 n. 9 del codice civile,`,
      `**ATTESTA**`,
      `che alla data del ${day(asOf)} la situazione dei pagamenti degli oneri condominiali di ${name}${unitCodes ? ` (unità ${unitCodes})` : ''}, per gli anni ${y0} e ${y1}, è la seguente:`,
      '',
      `**Totale dovuto alla data: ${eur(st.due)}**`,
      `**Totale pagato: ${eur(st.paid)}**`,
      `**Rate scadute non pagate: ${eur(st.open_due)}**`,
      ...(Number(st.pending_check) > 0 ? [`Pagamenti segnalati e ancora da verificare: ${eur(st.pending_check)}`] : []),
      `Rate non ancora scadute: ${eur(st.open_future)}`,
      '',
      settled
        ? `Alla data indicata il condomino risulta in regola con i pagamenti delle rate scadute.`
        : `Alla data indicata risultano rate scadute non pagate per ${eur(Number(st.open_due))}.`,
      '',
      '## Dettaglio delle rate',
      // deno-lint-ignore no-explicit-any
      ...((st.charges ?? []) as any[]).map((c) => `- ${day(c.due_date)} · ${c.title} (${c.kind || 'ordinaria'}) · ${eur(c.amount)} · ${STATUS[c.status] || c.status}${c.paid_at ? ` il ${day(c.paid_at)}` : ''}`),
      '',
      '## Note',
      'Ai sensi dell\'art. 63 c. 4 disp. att. c.c., chi subentra nei diritti di un condomino è obbligato in solido con questo al pagamento dei contributi relativi all\'anno in corso e a quello precedente.',
      'L\'attestazione riguarda le rate registrate su Condoreco alla data indicata. Liti in corso e spese straordinarie deliberate ma non ancora ripartite: [da indicare a cura dell\'amministratore].',
      ...(notes ? ['', String(notes).slice(0, 2000)] : []),
      '',
      `Data: ${day(new Date().toISOString())}`,
      'L\'amministratore',
    ].join('\n')

    const pdf = await textPdf(`Attestazione dello stato dei pagamenti`, lines, condo)
    const path = `${building_id}/certificates/${user_id}-${Date.now()}.pdf`
    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf' })
    if (upErr) { console.error('[payment-certificate] upload', upErr.message); return json({ error: 'Non riesco a salvare il PDF' }, 500) }
    const { data: doc, error: dErr } = await svc.from('condo_documents').insert({
      building_id, uploaded_by: user.id, category: 'other', title: `Attestazione pagamenti: ${name}`.slice(0, 160),
      doc_date: asOf, visibility: 'restricted', file_path: path, file_name: 'attestazione-pagamenti.pdf',
      mime_type: 'application/pdf', size_bytes: pdf.byteLength,
    }).select('id').single()
    if (dErr) { console.error('[payment-certificate] doc', dErr.message); return json({ error: 'Non riesco a salvare il PDF' }, 500) }

    const totals = { due: st.due, paid: st.paid, open_due: st.open_due, open_future: st.open_future, pending_check: st.pending_check, years: st.years }
    const { data: cert, error: cErr } = await svc.from('condo_payment_certificates').insert({
      building_id, user_id, as_of: asOf, totals, document_id: doc.id, notes: notes ? String(notes).slice(0, 2000) : null, created_by: user.id,
    }).select('id').single()
    if (cErr) { console.error('[payment-certificate] row', cErr.message); return json({ error: 'Errore inatteso' }, 500) }

    if (user_id !== user.id) {
      const { error: nErr } = await svc.from('notifications').insert({
        user_id, building_id, kind: 'certificate', title: 'Attestazione dei pagamenti pronta',
        body: `Situazione al ${day(asOf)}: la trovi in Rendicontazione`, link: `/edificio/${building_id}/condominio/rendicontazione`,
      })
      if (nErr) console.error('[payment-certificate] notify', nErr.message)
    }
    const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(path, 300)
    return json({ id: cert.id, url: signed?.signedUrl, totals })
  } catch (e) {
    console.error('[payment-certificate]', e instanceof Error ? e.message : String(e))
    return json({ error: 'Errore inatteso' }, 500)
  }
})
