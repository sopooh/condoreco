// Invio della convocazione o del verbale di un'assemblea.
// 1. Controlla i requisiti di legge (5 giorni prima, consenso per la videoconferenza).
// 2. Crea il PDF e lo salva nell'archivio documenti (categoria Assemblee, condiviso).
// 3. Spedisce a ogni titolare con il canale legale: PEC se ha una PEC, altrimenti
//    raccomandata online (Openapi.it). La consegna a mano la segna l'amministratore.
// 4. Avvisa in app tutti i membri del condominio (copia di cortesia).
// Body: { assembly_id, purpose: 'convocation' | 'minutes', dry_run?: boolean }
// dry_run: crea solo il PDF, senza spedire (anteprima).
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  CORS, json, fmtDateTime, MAJORITY_LABEL, textPdf, openapiConfigured, sendPec, sendRaccomandata, toBase64, type Sender,
} from '../_shared/assembly.ts'

const BUCKET = 'condo-documents'
const MIN_NOTICE_MS = 5 * 24 * 3600 * 1000

const esc = (t: string) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const CHANNEL_TEXT: Record<string, string> = {
  pec: 'via PEC al tuo indirizzo PEC',
  raccomandata: 'per raccomandata con ricevuta di ritorno',
  hand: 'con consegna a mano',
}

// Email a tutti gli iscritti del condominio e ai titolari dell'anagrafe con un'email,
// con il PDF allegato. Dice chiaramente che è una copia di cortesia: la comunicazione
// valida per legge è quella inviata per PEC, raccomandata o a mano.
// Senza RESEND_API_KEY non fa nulla (restano le notifiche sul sito).
// deno-lint-ignore no-explicit-any
async function courtesyEmails(svc: any, o: {
  buildingId: string; adminId: string; purpose: string; title: string; condoName: string
  firstCall: string | null; link: string; pdf: Uint8Array; assemblyId: string
}) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { sent: 0, skipped: 'email not configured' }
  const from = Deno.env.get('NOTICE_EMAIL_FROM') || 'Condoreco <hello@condoreco.com>'
  const siteUrl = Deno.env.get('SITE_URL') || 'https://www.condoreco.com'

  // una sola volta per convocazione e per verbale: un nuovo invio ai destinatari
  // falliti non deve rimandare la copia di cortesia a tutti
  const col = o.purpose === 'convocation' ? 'convocation_emailed_at' : 'minutes_emailed_at'
  const { data: claimed, error: cErr } = await svc.from('condo_assemblies')
    .update({ [col]: new Date().toISOString() }).eq('id', o.assemblyId).is(col, null).select('id')
  if (cErr) console.error('[assembly-send] email claim', cErr.message)
  if (!claimed?.length) return { sent: 0, already: true }

  // canale ufficiale per persona (per dire come arriva la copia valida)
  const { data: recs } = await svc.from('condo_assembly_recipients').select('user_id, channel, person_id')
    .eq('assembly_id', o.assemblyId).eq('purpose', o.purpose)
  const channelByUser = new Map<string, string>()
  for (const r of recs ?? []) if (r.user_id) channelByUser.set(r.user_id, r.channel)

  const to = new Map<string, string | null>() // email -> canale ufficiale
  const { data: members } = await svc.from('condo_members').select('user_id').eq('building_id', o.buildingId)
  for (const m of members ?? []) {
    if (m.user_id === o.adminId) continue
    const { data } = await svc.auth.admin.getUserById(m.user_id)
    const email = data?.user?.email?.toLowerCase()
    if (email) to.set(email, channelByUser.get(m.user_id) ?? null)
  }
  // titolari senza account ma con email nell'anagrafe
  const { data: people } = await svc.from('condo_unit_people').select('id, email, user_id, role, until')
    .eq('building_id', o.buildingId).not('email', 'is', null)
  const channelByPerson = new Map<string, string>()
  for (const r of recs ?? []) if (r.person_id) channelByPerson.set(r.person_id, r.channel)
  const today = new Date().toISOString().slice(0, 10)
  for (const p of people ?? []) {
    if (p.until && p.until < today) continue
    const email = String(p.email).trim().toLowerCase()
    if (email && !to.has(email)) to.set(email, channelByPerson.get(p.id) ?? null)
  }
  if (!to.size) return { sent: 0 }

  const isConv = o.purpose === 'convocation'
  const subject = isConv ? `Convocazione assemblea: ${o.title}` : `Verbale dell'assemblea: ${o.title}`
  const pdfB64 = toBase64(o.pdf)
  const filename = isConv ? 'convocazione-assemblea.pdf' : 'verbale-assemblea.pdf'
  const batch = [...to.entries()].map(([email, channel]) => {
    const official = channel && CHANNEL_TEXT[channel]
      ? `La comunicazione ufficiale, valida per legge, ti è stata inviata anche ${CHANNEL_TEXT[channel]}.`
      : 'La comunicazione ufficiale, valida per legge, arriva separatamente per PEC, raccomandata o consegna a mano.'
    const lead = isConv
      ? `È stata convocata l'assemblea "${o.title}" del ${o.condoName}. Prima convocazione: ${fmtDateTime(o.firstCall)}.`
      : `È disponibile il verbale dell'assemblea "${o.title}" del ${o.condoName}, con il riassunto per chi non c'era.`
    return {
      from, reply_to: 'hello@condoreco.com', to: [email], subject,
      text: `${lead}\n\nTrovi il documento in allegato e su Condoreco: ${siteUrl}${o.link}\n\n${official} Questa email è una copia di cortesia.\n\nRicevi questa email perché sei un condomino di questo edificio.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2937">
        <div style="background:#0D676F;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-weight:700;font-size:18px">${esc(subject)}</div>
        <div style="border:1px solid #E5E7EB;border-top:none;padding:20px 22px;border-radius:0 0 14px 14px">
          <p style="font-size:16px;line-height:1.5;margin:0 0 14px">${esc(lead)}</p>
          <p style="font-size:15px;line-height:1.5;margin:0 0 18px">Trovi il documento in allegato.${isConv ? ' Su Condoreco puoi anche delegare qualcuno se non puoi partecipare.' : ''}</p>
          <a href="${siteUrl}${o.link}" style="display:inline-block;background:#0D676F;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">Apri su Condoreco</a>
          <p style="font-size:13px;line-height:1.5;color:#374151;background:#F3F7F7;border-radius:10px;padding:10px 12px;margin:18px 0 0">${esc(official)} Questa email è una copia di cortesia.</p>
          <p style="font-size:12px;color:#9CA3AF;margin:16px 0 0">Ricevi questa email perché sei un condomino di questo edificio.</p>
        </div></div>`,
      attachments: [{ filename, content: pdfB64 }],
    }
  })

  // Il batch di Resend non supporta allegati: un invio per destinatario, con una pausa breve.
  let sent = 0
  for (const mail of batch) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `assembly-${o.assemblyId}-${o.purpose}-${mail.to[0]}`.slice(0, 256) },
      body: JSON.stringify(mail),
    })
    if (r.ok) sent++
    else console.error('[assembly-send] resend', r.status, (await r.text()).slice(0, 160))
    await new Promise((res) => setTimeout(res, 550)) // limite Resend: 2 richieste al secondo
  }
  return { sent, total: batch.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const { assembly_id, purpose = 'convocation', dry_run = false } = await req.json().catch(() => ({}))
    if (!assembly_id || !['convocation', 'minutes'].includes(purpose)) return json({ error: 'Richiesta non valida' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non autenticato' }, 401)
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

    const { data: a, error: aErr } = await svc.from('condo_assemblies').select('*').eq('id', assembly_id).maybeSingle()
    if (aErr || !a) return json({ error: 'Assemblea non trovata' }, 404)
    const { data: isAdmin } = await userClient.rpc('is_condo_admin', { p_building: a.building_id })
    if (!isAdmin) return json({ error: 'Solo l\'amministratore può inviare' }, 403)

    const { data: b } = await svc.from('buildings').select('address, street_number, city').eq('id', a.building_id).maybeSingle()
    const condoName = `Condominio di ${[b?.address, b?.street_number].filter(Boolean).join(' ')}${b?.city ? `, ${b.city}` : ''}`
    const { data: items } = await svc.from('condo_assembly_items').select('position, title, description, majority_rule').eq('assembly_id', a.id).order('position')

    // ---- requisiti ----
    if (purpose === 'convocation') {
      if (!a.first_call_at || !a.second_call_at) return json({ error: 'Indica data e ora di prima e seconda convocazione.' }, 422)
      if (!items?.length) return json({ error: 'Aggiungi almeno un punto all\'ordine del giorno.' }, 422)
      if (!dry_run && new Date(a.first_call_at).getTime() - Date.now() < MIN_NOTICE_MS) {
        return json({ error: 'La convocazione deve arrivare almeno 5 giorni prima della prima convocazione (art. 66 disp. att. c.c.). Sposta la data.' }, 422)
      }
      if (a.mode !== 'in_person' && !a.video_by_regulation) {
        const { data: cs } = await userClient.rpc('assembly_video_consent_status', { p_assembly: a.id })
        if (!dry_run && !cs?.reached) return json({ error: 'Per la videoconferenza serve prima il consenso della maggioranza dei condomini (art. 66 disp. att. c.c.).' }, 422)
      }
      if (a.mode !== 'in_person' && !a.video_link) return json({ error: 'Indica il link del collegamento video.' }, 422)
    } else {
      const { data: m } = await svc.from('condo_assembly_minutes').select('draft, finalized_at').eq('assembly_id', a.id).maybeSingle()
      if (!m?.finalized_at || !m.draft) return json({ error: 'Approva prima il testo definitivo del verbale.' }, 422)
    }

    // ---- PDF ----
    let title: string, body: string
    if (purpose === 'convocation') {
      title = `${condoName}: convocazione di assemblea ${a.kind === 'extraordinary' ? 'straordinaria' : 'ordinaria'}`
      const where = a.mode === 'video' ? `in videoconferenza (${a.video_link})`
        : a.mode === 'mixed' ? `presso ${a.location || 'luogo da indicare'} e in videoconferenza (${a.video_link})`
        : `presso ${a.location || 'luogo da indicare'}`
      body = [
        'Gentili condomini,',
        `è convocata l'assemblea ${a.kind === 'extraordinary' ? 'straordinaria' : 'ordinaria'} del condominio ${where}:`,
        `**Prima convocazione: ${fmtDateTime(a.first_call_at)}**`,
        `**Seconda convocazione: ${fmtDateTime(a.second_call_at)}**`,
        '',
        '## Ordine del giorno',
        ...(items ?? []).flatMap((it) => [`**${it.position}. ${it.title}**`, ...(it.description ? [it.description] : []), `Maggioranza richiesta: ${MAJORITY_LABEL[it.majority_rule] || ''}`, '']),
        '## Deleghe',
        "Chi non può partecipare può delegare per iscritto un'altra persona (art. 67 disp. att. c.c.), anche direttamente da Condoreco. L'amministratore non può ricevere deleghe.",
        ...(a.mode !== 'in_person' ? ['', '## Partecipazione in videoconferenza', 'Il collegamento sarà attivo 15 minuti prima dell\'orario. Tieni a portata di mano un documento per l\'identificazione.'] : []),
        ...(a.notes ? ['', a.notes] : []),
        '',
        `${fmtDateTime(new Date().toISOString())}`,
        'L\'amministratore',
      ].join('\n')
    } else {
      const { data: m } = await svc.from('condo_assembly_minutes').select('draft').eq('assembly_id', a.id).maybeSingle()
      title = `${condoName}: verbale dell'assemblea del ${new Date(a.opened_at || a.first_call_at).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}`
      body = m!.draft!
    }
    const pdf = await textPdf(title, body, condoName)

    const stamp = Date.now()
    const path = `${a.building_id}/assemblies/${a.id}-${purpose}-${stamp}.pdf`
    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf' })
    if (upErr) { console.error('[assembly-send] upload', upErr.message); return json({ error: 'Non riesco a salvare il PDF' }, 500) }
    const docTitle = purpose === 'convocation' ? `Convocazione: ${a.title}` : `Verbale: ${a.title}`
    const { data: doc, error: dErr } = await svc.from('condo_documents').insert({
      building_id: a.building_id, uploaded_by: user.id, category: 'assemblies', title: docTitle.slice(0, 160),
      doc_date: new Date().toISOString().slice(0, 10), visibility: dry_run ? 'restricted' : 'shared',
      file_path: path, file_name: `${purpose === 'convocation' ? 'convocazione' : 'verbale'}-assemblea.pdf`,
      mime_type: 'application/pdf', size_bytes: pdf.byteLength,
    }).select('id').single()
    if (dErr) { console.error('[assembly-send] doc', dErr.message); return json({ error: 'Non riesco a salvare il PDF' }, 500) }
    if (dry_run) {
      const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(path, 600)
      return json({ preview_url: signed?.signedUrl, document_id: doc.id })
    }
    await svc.from('condo_assemblies').update(purpose === 'convocation'
      ? { convocation_document_id: doc.id, status: 'convened', convened_at: new Date().toISOString() }
      : { minutes_document_id: doc.id }).eq('id', a.id)

    // ---- destinatari ----
    await userClient.rpc('assembly_prepare_recipients', { p_assembly: a.id, p_purpose: purpose })
    const { data: recipients } = await svc.from('condo_assembly_recipients').select('*')
      .eq('assembly_id', a.id).eq('purpose', purpose).in('status', ['pending', 'failed'])

    const results = { pec: 0, raccomandata: 0, manual: 0, failed: 0, not_configured: false }
    const { data: sender } = await svc.from('admin_sending_settings').select('*').eq('user_id', user.id).maybeSingle()
    const { data: password } = await svc.rpc('get_sending_secret', { p_user: user.id })
    const canPec = openapiConfigured() && !!sender?.pec_address && !!password
    const canPost = openapiConfigured() && !!sender?.sender_name && !!sender?.sender_address && !!sender?.sender_cap && !!sender?.sender_city
    if (!openapiConfigured()) results.not_configured = true

    const subject = purpose === 'convocation' ? `Convocazione assemblea condominiale: ${a.title}` : `Verbale assemblea condominiale: ${a.title}`
    const html = `<p>Gentile condomino,</p><p>in allegato ${purpose === 'convocation' ? 'la convocazione' : 'il verbale'} dell'assemblea del ${condoName}.</p><p>Puoi consultarlo anche su Condoreco.</p>`

    for (const r of recipients ?? []) {
      try {
        let ref: string | null = null, provider: string | null = null
        if (r.channel === 'pec' && r.pec && canPec) {
          ref = await sendPec({ sender: sender as Sender, password: password as string, to: r.pec, subject, html, pdfName: `${purpose}.pdf`, pdf })
          provider = 'openapi_pec'; results.pec++
        } else if (r.channel === 'raccomandata' && r.postal?.address && r.postal?.cap && r.postal?.city && canPost) {
          ref = await sendRaccomandata({ sender: sender as Sender, to: { name: r.full_name, address: r.postal.address, cap: r.postal.cap, city: r.postal.city, province: r.postal.province || '' }, pdf })
          provider = 'openapi_raccomandata'; results.raccomandata++
        } else {
          results.manual++
          continue // resta 'pending': l'amministratore consegna a mano o completa i dati
        }
        await svc.from('condo_assembly_recipients').update({ status: 'sent', provider, provider_ref: ref, sent_by: user.id, sent_at: new Date().toISOString(), error: null }).eq('id', r.id)
        await new Promise((res) => setTimeout(res, 1100)) // PEC massiva: max 1 richiesta al secondo
      } catch (e) {
        results.failed++
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[assembly-send] recipient', r.id, msg.slice(0, 200))
        await svc.from('condo_assembly_recipients').update({ status: 'failed', error: msg.slice(0, 300) }).eq('id', r.id)
      }
    }

    // ---- avviso in app a tutti i membri ----
    const { data: members } = await svc.from('condo_members').select('user_id').eq('building_id', a.building_id)
    const link = `/edificio/${a.building_id}/condominio/assemblee?a=${a.id}`
    const notifs = (members ?? []).filter((m) => m.user_id !== user.id).map((m) => ({
      user_id: m.user_id, building_id: a.building_id, kind: 'assembly',
      title: purpose === 'convocation' ? `Convocata l'assemblea: ${a.title}` : `Verbale disponibile: ${a.title}`,
      body: purpose === 'convocation' ? `Prima convocazione ${fmtDateTime(a.first_call_at)}` : 'Leggi il verbale e il riassunto',
      link,
    }))
    if (notifs.length) {
      const { error: nErr } = await svc.from('notifications').insert(notifs)
      if (nErr) console.error('[assembly-send] notifications', nErr.message)
    }

    // ---- email di cortesia (Resend): finché non c'è l'app, le notifiche arrivano solo sul sito ----
    const emailed = await courtesyEmails(svc, {
      buildingId: a.building_id, adminId: user.id, purpose, title: a.title, condoName,
      firstCall: a.first_call_at, link, pdf, assemblyId: a.id,
    })

    return json({ ok: true, document_id: doc.id, ...results, emailed })
  } catch (e) {
    console.error('[assembly-send]', e instanceof Error ? e.message : String(e))
    return json({ error: 'Errore inatteso' }, 500)
  }
})
