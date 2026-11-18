'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ClipboardList, FileText, Gavel, Mail, Plus, Send, Settings, Sparkles, Trash2, Users, Video, XCircle,
} from 'lucide-react'
import Sheet from '@/components/condo/admin/Sheet'
import AssemblyRecorder from '@/components/condo/assemblies/AssemblyRecorder'
import { MAJORITY_RULES, majorityLabel, STATUS_LABEL, MODE_LABEL, loadSendingSettings, saveSendingSettings } from '@/hooks/useAssemblies'

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)
const mill = (v) => Number(v || 0).toLocaleString('it-IT', { maximumFractionDigits: 3 })

function Field({ label, children, hint }) {
  return (
    <label className="ep-field">
      <span className="ep-label">{label}</span>
      <span className="ep-input">{children}</span>
      {hint && <small className="rc-muted" style={{ display: 'block', marginTop: 4 }}>{hint}</small>}
    </label>
  )
}
const Err = ({ msg }) => (msg ? <p className="acc-msg" style={{ color: '#B42318' }}>{msg}</p> : null)
const Ok = ({ msg }) => (msg ? <p className="acc-msg" style={{ color: 'var(--teal-dk)' }}>{msg}</p> : null)

const TABS = [
  ['agenda', 'Ordine del giorno', ClipboardList],
  ['convocation', 'Convocazione', Mail],
  ['proxies', 'Deleghe', Users],
  ['session', 'Seduta', Gavel],
  ['minutes', 'Verbale', FileText],
]

export default function AssemblyAdmin({ A }) {
  const a = A.assembly
  const [tab, setTab] = useState(() => (['in_session'].includes(a.status) ? 'session' : ['closed', 'minutes_final'].includes(a.status) ? 'minutes' : 'agenda'))
  return (
    <>
      <div className="acc-tabs" role="tablist">
        {TABS.map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            <Icon size={16} aria-hidden="true" />{l}
          </button>
        ))}
      </div>
      {tab === 'agenda' && <AgendaTab A={A} />}
      {tab === 'convocation' && <ConvocationTab A={A} />}
      {tab === 'proxies' && <ProxiesTab A={A} />}
      {tab === 'session' && <SessionTab A={A} />}
      {tab === 'minutes' && <MinutesTab A={A} />}
    </>
  )
}

// ---------------- Ordine del giorno ----------------
function AgendaTab({ A }) {
  const [edit, setEdit] = useState(null)
  const [ai, setAi] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const locked = !['draft', 'consent'].includes(A.assembly.status)

  async function propose() {
    setBusy(true); setErr(null)
    const r = await A.invoke('assembly-ai', { mode: 'agenda' })
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    setAi((r.data?.items || []).map((x) => ({ ...x, pick: true })))
  }
  async function addPicked() {
    const start = A.items.length
    const list = ai.filter((x) => x.pick).map((x, i) => ({
      position: start + i + 1, title: x.title.slice(0, 300), description: [x.description, x.reason ? `Motivo: ${x.reason}` : null].filter(Boolean).join('\n').slice(0, 3000),
      majority_rule: x.majority_rule, source: { sources: x.sources || [] }, ai_generated: true,
    }))
    if (!list.length) { setAi(null); return }
    const r = await A.addItems(list)
    if (r.error) setErr(r.error); else setAi(null)
  }

  return (
    <div className="acc-card">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ flex: 1 }}>Ordine del giorno</strong>
        {!locked && <button type="button" className="acc-btn" disabled={busy} onClick={propose}><Sparkles size={15} aria-hidden="true" />{busy ? 'Condor sta leggendo…' : 'Proponi con Condor'}</button>}
        {!locked && <button type="button" className="acc-btn is-primary" onClick={() => setEdit({ title: '', description: '', majority_rule: 'ordinary', position: A.items.length + 1 })}><Plus size={15} aria-hidden="true" />Aggiungi punto</button>}
      </div>
      {locked && <p className="rc-muted">La convocazione è partita: l&apos;ordine del giorno non si può più cambiare. Per nuovi argomenti serve una nuova assemblea.</p>}
      <Err msg={err} />
      {A.items.length === 0 ? <p className="rc-muted">Nessun punto. Condor può proporli leggendo segnalazioni aperte, chat, sondaggi e pratiche del condominio.</p> : (
        <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {A.items.map((it) => (
            <li key={it.id} onClick={() => !locked && setEdit(it)} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', cursor: locked ? 'default' : 'pointer' }}>
              <strong>{it.position}. {it.title}</strong>
              {it.ai_generated && <em className="ppl-tag" style={{ marginLeft: 6 }}>Condor</em>}
              {it.description && <p className="rc-muted" style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{it.description}</p>}
              <small style={{ color: 'var(--teal-dk)', fontWeight: 700 }}>{majorityLabel(it.majority_rule)}</small>
            </li>
          ))}
        </ol>
      )}
      {edit && <ItemSheet item={edit} A={A} onClose={() => setEdit(null)} />}
      {ai && (
        <Sheet title="Proposte di Condor" kicker="Ordine del giorno" onClose={() => setAi(null)} wide>
          {ai.length === 0 ? <p className="rc-muted">Condor non ha trovato argomenti da portare in assemblea.</p> : (
            <>
              <p className="rc-muted" style={{ marginTop: 0 }}>Controlla titoli e maggioranze prima di aggiungerli: la responsabilità della convocazione resta tua.</p>
              {ai.map((x, i) => (
                <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid var(--border)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
                  <input type="checkbox" checked={x.pick} onChange={(e) => setAi(ai.map((y, j) => (j === i ? { ...y, pick: e.target.checked } : y)))} style={{ marginTop: 4 }} />
                  <span>
                    <strong>{x.title}</strong>
                    <span className="rc-muted" style={{ display: 'block' }}>{x.description}</span>
                    <small style={{ display: 'block', color: 'var(--teal-dk)', fontWeight: 700 }}>{majorityLabel(x.majority_rule)}</small>
                    <small className="rc-muted">{x.reason}</small>
                  </span>
                </label>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="acc-btn is-primary" onClick={addPicked}>Aggiungi i punti scelti</button></div>
            </>
          )}
        </Sheet>
      )}
    </div>
  )
}

function ItemSheet({ item, A, onClose }) {
  const [v, setV] = useState({ ...item, description: item.description || '', millesimi_table_id: item.millesimi_table_id || '' })
  const [err, setErr] = useState(null)
  const hint = MAJORITY_RULES.find((m) => m.value === v.majority_rule)?.hint
  async function save() {
    if (v.title.trim().length < 3) { setErr('Scrivi il titolo del punto.'); return }
    const r = await A.saveItem(v)
    if (r.error) setErr(r.error); else onClose()
  }
  return (
    <Sheet title={item.id ? `Punto ${item.position}` : 'Nuovo punto'} kicker="Ordine del giorno" onClose={onClose}>
      <Field label="Titolo"><input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={300} placeholder="Es. Approvazione preventivo lavori facciata" /></Field>
      <label className="ep-field"><span className="ep-label">Descrizione per i condomini</span>
        <textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={3000} rows={4} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: 10, font: 'inherit', fontSize: 15 }} />
      </label>
      <Field label="Maggioranza richiesta" hint={hint}>
        <select value={v.majority_rule} onChange={(e) => setV({ ...v, majority_rule: e.target.value })}>{MAJORITY_RULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
      </Field>
      {A.tables.length > 1 && (
        <Field label="Tabella millesimale per il voto" hint="Di solito la A. Per spese di scale o ascensore usa la tabella dedicata.">
          <select value={v.millesimi_table_id} onChange={(e) => setV({ ...v, millesimi_table_id: e.target.value })}>
            <option value="">Proprietà generale</option>
            {A.tables.filter((t) => t.kind !== 'ownership').map((t) => <option key={t.id} value={t.id}>Tabella {t.code} · {t.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Posizione"><input value={v.position} inputMode="numeric" onChange={(e) => setV({ ...v, position: Number(e.target.value.replace(/\D/g, '')) || 1 })} /></Field>
      <Err msg={err} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {item.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => { const r = await A.deleteItem(item.id); if (r.error) setErr(r.error); else onClose() }}><Trash2 size={15} aria-hidden="true" />Elimina</button> : <span />}
        <button type="button" className="acc-btn is-primary" onClick={save}>Salva</button>
      </div>
    </Sheet>
  )
}

// ---------------- Convocazione ----------------
function ConvocationTab({ A }) {
  const a = A.assembly
  const [v, setV] = useState({
    title: a.title, kind: a.kind, mode: a.mode, location: a.location || '', video_link: a.video_link || '', notes: a.notes || '',
    first: toLocalInput(a.first_call_at), second: toLocalInput(a.second_call_at), video_by_regulation: a.video_by_regulation,
  })
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(false)
  const editable = ['draft', 'consent'].includes(a.status)
  const needsConsent = v.mode !== 'in_person' && !v.video_by_regulation
  const cs = A.consentStatus
  const convRecipients = A.recipients.filter((r) => r.purpose === 'convocation')
  const [now] = useState(() => Date.now())
  const daysBefore = a.first_call_at ? Math.floor((new Date(a.first_call_at) - now) / 86400000) : null

  async function save() {
    setErr(null); setOk(null)
    if (v.first && v.second && new Date(v.second) <= new Date(v.first)) { setErr('La seconda convocazione deve essere dopo la prima.'); return }
    const r = await A.update({
      title: v.title.trim(), kind: v.kind, mode: v.mode, location: v.location.trim() || null, video_link: v.video_link.trim() || null,
      notes: v.notes.trim() || null, first_call_at: fromLocalInput(v.first), second_call_at: fromLocalInput(v.second), video_by_regulation: v.video_by_regulation,
    })
    if (r.error) setErr(r.error); else setOk('Salvato.')
  }
  async function preview() {
    setBusy(true); setErr(null)
    const r = await A.invoke('assembly-send', { purpose: 'convocation', dry_run: true })
    setBusy(false)
    if (r.error) setErr(r.error); else if (r.data?.preview_url) window.open(r.data.preview_url, '_blank')
  }
  async function send() {
    if (!window.confirm('Inviare la convocazione a tutti i titolari? PEC e raccomandate partono subito e hanno un costo.')) return
    setBusy(true); setErr(null); setOk(null)
    const r = await A.invoke('assembly-send', { purpose: 'convocation' })
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    const d = r.data || {}
    setOk(`Convocazione pubblicata. PEC inviate: ${d.pec || 0}. Raccomandate: ${d.raccomandata || 0}. Da consegnare a mano o completare: ${d.manual || 0}.${d.failed ? ` Non riuscite: ${d.failed}.` : ''}${d.not_configured ? ' Il servizio di invio non è ancora attivo: segna le consegne a mano.' : ''}${d.emailed?.sent ? ` Email di cortesia: ${d.emailed.sent}.` : ''}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="acc-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <Field label="Titolo"><input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} disabled={!editable} maxLength={160} /></Field>
          <Field label="Tipo"><select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} disabled={!editable}><option value="ordinary">Ordinaria</option><option value="extraordinary">Straordinaria</option></select></Field>
          <Field label="Prima convocazione"><input type="datetime-local" value={v.first} onChange={(e) => setV({ ...v, first: e.target.value })} disabled={!editable} /></Field>
          <Field label="Seconda convocazione" hint="Entro 10 giorni dalla prima (art. 1136 c. 3)"><input type="datetime-local" value={v.second} onChange={(e) => setV({ ...v, second: e.target.value })} disabled={!editable} /></Field>
          <Field label="Modalità"><select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })} disabled={!editable}>{Object.entries(MODE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          {v.mode !== 'video' && <Field label="Luogo"><input value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} disabled={!editable} placeholder="Es. androne scala A" /></Field>}
          {v.mode !== 'in_person' && <Field label="Link del collegamento video"><input value={v.video_link} onChange={(e) => setV({ ...v, video_link: e.target.value })} disabled={!editable} placeholder="https://meet.google.com/..." /></Field>}
        </div>
        {v.mode !== 'in_person' && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input type="checkbox" checked={v.video_by_regulation} onChange={(e) => setV({ ...v, video_by_regulation: e.target.checked })} disabled={!editable} />
            <span>Il regolamento condominiale prevede già la videoconferenza</span>
          </label>
        )}
        <label className="ep-field" style={{ marginTop: 8 }}><span className="ep-label">Note in fondo alla convocazione (facoltative)</span>
          <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} disabled={!editable} maxLength={2000} rows={3} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: 10, font: 'inherit', fontSize: 15 }} />
        </label>
        <Err msg={err} /><Ok msg={ok} />
        {editable && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" className="acc-btn is-primary" onClick={save}>Salva</button></div>}
      </div>

      {needsConsent && (
        <div className="acc-card">
          <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Video size={17} aria-hidden="true" />Consenso alla videoconferenza</strong>
          <p className="rc-muted">Serve il consenso preventivo della maggioranza dei condomini, raccolto prima della convocazione (art. 66 disp. att. c.c.). Il consenso dato in assemblea non vale.</p>
          {cs && <p style={{ margin: '0 0 8px' }}><b>{cs.yes}</b> sì, <b>{cs.no}</b> no su <b>{cs.heads_total}</b> condomini · {cs.reached ? <span className="bil-ok"><CheckCircle2 size={15} aria-hidden="true" />Maggioranza raggiunta</span> : <span>servono {Math.floor(cs.heads_total / 2) + 1} sì</span>}</p>}
          {a.status === 'draft' && <button type="button" className="acc-btn is-primary" onClick={async () => { const r = await A.update({ status: 'consent' }); if (r.error) setErr(r.error); else setOk('Richiesta pubblicata: i condomini rispondono dalla pagina dell\'assemblea.') }}>Chiedi il consenso ai condomini</button>}
          {a.status === 'consent' && <p className="rc-muted" style={{ margin: 0 }}>Richiesta aperta: i condomini rispondono dalla pagina dell&apos;assemblea in Condoreco. Chi non usa l&apos;app può risponderti per email o lettera: segnalo tu nella scheda dell&apos;unità.</p>}
        </div>
      )}

      <div className="acc-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ flex: 1 }}>Invio legale della convocazione</strong>
          <button type="button" className="acc-btn" onClick={() => setSettings(true)}><Settings size={15} aria-hidden="true" />Mittente e PEC</button>
          {['draft', 'consent'].includes(a.status) && <button type="button" className="acc-btn" onClick={() => A.prepareRecipients('convocation')}>Prepara destinatari</button>}
        </div>
        <p className="rc-muted">Vale solo se arriva per PEC, raccomandata, fax o a mano almeno 5 giorni prima della prima convocazione. In più ogni condomino riceve una email di cortesia con il PDF e la notifica sul sito: non sostituiscono l&apos;invio ufficiale.</p>
        {daysBefore !== null && daysBefore < 6 && ['draft', 'consent'].includes(a.status) && <p style={{ color: '#B42318', fontWeight: 700 }}><AlertTriangle size={15} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Mancano {Math.max(daysBefore, 0)} giorni alla prima convocazione: una raccomandata impiega 4-7 giorni. Sposta la data.</p>}
        <RecipientsList A={A} list={convRecipients} />
        {['draft', 'consent'].includes(a.status) && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" className="acc-btn" disabled={busy} onClick={preview}>Anteprima PDF</button>
            <button type="button" className="acc-btn is-primary" disabled={busy} onClick={send}><Send size={15} aria-hidden="true" />{busy ? 'Invio…' : 'Invia la convocazione'}</button>
          </div>
        )}
      </div>
      {settings && <SendingSettingsSheet onClose={() => setSettings(false)} />}
    </div>
  )
}

const RSTATUS = {
  pending: ['Da inviare', 'muted'], sending: ['In invio', 'muted'], sent: ['Inviata', 'muted'], accepted: ['Accettata dal gestore', 'muted'],
  delivered: ['Consegnata', 'ok'], failed: ['Non riuscita', 'bad'], manual_done: ['Consegnata a mano', 'ok'],
}

function RecipientsList({ A, list }) {
  const [edit, setEdit] = useState(null)
  if (!list.length) return <p className="rc-muted">Nessun destinatario: compila proprietari, PEC e indirizzi in Unità e millesimi, poi premi Prepara destinatari.</p>
  return (
    <>
      <ul className="ppl-list">
        {list.map((r) => {
          const [label, tone] = RSTATUS[r.status] || [r.status, 'muted']
          return (
            <li key={r.id} onClick={() => setEdit(r)} style={{ cursor: 'pointer' }}>
              <span className="ppl-main">
                <strong>{r.full_name}</strong>
                <small>{r.channel === 'pec' ? `PEC ${r.pec}` : r.channel === 'raccomandata' ? `Raccomandata · ${[r.postal?.address, r.postal?.cap, r.postal?.city].filter(Boolean).join(', ')}` : r.channel === 'hand' ? 'Consegna a mano' : 'Nessun invio'}{r.app_read_at ? ' · letta in app' : ''}{r.error ? ` · ${r.error}` : ''}</small>
              </span>
              <span className="ppl-state"><small style={{ fontWeight: 700, color: tone === 'ok' ? 'var(--teal-dk)' : tone === 'bad' ? '#B42318' : undefined }}>{label}</small></span>
            </li>
          )
        })}
      </ul>
      {edit && <RecipientSheet r={edit} A={A} onClose={() => setEdit(null)} />}
    </>
  )
}

function RecipientSheet({ r, A, onClose }) {
  const [v, setV] = useState({ channel: r.channel, pec: r.pec || '', address: r.postal?.address || '', cap: r.postal?.cap || '', city: r.postal?.city || '', province: r.postal?.province || '' })
  const [err, setErr] = useState(null)
  const sent = !['pending', 'failed'].includes(r.status)
  async function save(extra = {}) {
    const res = await A.setRecipient(r.id, { channel: v.channel, pec: v.pec.trim() || null, postal: { address: v.address.trim(), cap: v.cap.trim(), city: v.city.trim(), province: v.province.trim().toUpperCase() }, ...extra })
    if (res.error) setErr(res.error); else onClose()
  }
  return (
    <Sheet title={r.full_name} kicker="Destinatario" onClose={onClose}>
      <Field label="Canale"><select value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value })} disabled={sent}>
        <option value="pec">PEC</option><option value="raccomandata">Raccomandata</option><option value="hand">Consegna a mano</option><option value="none">Nessun invio</option>
      </select></Field>
      {v.channel === 'pec' && <Field label="Indirizzo PEC"><input value={v.pec} onChange={(e) => setV({ ...v, pec: e.target.value })} disabled={sent} /></Field>}
      {v.channel === 'raccomandata' && (
        <>
          <Field label="Indirizzo"><input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} disabled={sent} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 0.6fr', gap: 8 }}>
            <Field label="CAP"><input value={v.cap} onChange={(e) => setV({ ...v, cap: e.target.value })} inputMode="numeric" disabled={sent} /></Field>
            <Field label="Comune"><input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} disabled={sent} /></Field>
            <Field label="Prov."><input value={v.province} onChange={(e) => setV({ ...v, province: e.target.value })} maxLength={2} disabled={sent} /></Field>
          </div>
        </>
      )}
      {r.provider_ref && <p className="rc-muted">Riferimento del gestore: {r.provider_ref}</p>}
      <Err msg={err} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
        {v.channel === 'hand' && r.status !== 'manual_done' && <button type="button" className="acc-btn" onClick={() => save({ status: 'manual_done', delivered_at: new Date().toISOString() })}>Segna consegnata a mano (con ricevuta firmata)</button>}
        {!sent && <button type="button" className="acc-btn is-primary" onClick={() => save(r.status === 'failed' ? { status: 'pending', error: null } : {})}>Salva</button>}
      </div>
    </Sheet>
  )
}

function SendingSettingsSheet({ onClose }) {
  const [v, setV] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let alive = true
    loadSendingSettings().then((d) => {
      if (alive) setV({ sender_name: '', sender_address: '', sender_cap: '', sender_city: '', sender_province: '', sender_email: '', pec_address: '', pec_username: '', ...(d || {}), pec_password: '' })
    })
    return () => { alive = false }
  }, [])
  return (
    <Sheet title="Mittente e PEC" kicker="Invio convocazioni e verbali" onClose={onClose}>
      {!v ? <p className="rc-muted">Caricamento…</p> : (
        <>
          <p className="rc-muted" style={{ marginTop: 0 }}>Le raccomandate partono a tuo nome da questo indirizzo. La PEC parte dalla casella indicata; la password è custodita cifrata e non viene mai mostrata.</p>
          <Field label="Nome e cognome o studio"><input value={v.sender_name} onChange={(e) => setV({ ...v, sender_name: e.target.value })} /></Field>
          <Field label="Indirizzo"><input value={v.sender_address} onChange={(e) => setV({ ...v, sender_address: e.target.value })} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 0.6fr', gap: 8 }}>
            <Field label="CAP"><input value={v.sender_cap} onChange={(e) => setV({ ...v, sender_cap: e.target.value })} inputMode="numeric" /></Field>
            <Field label="Comune"><input value={v.sender_city} onChange={(e) => setV({ ...v, sender_city: e.target.value })} /></Field>
            <Field label="Prov."><input value={v.sender_province} onChange={(e) => setV({ ...v, sender_province: e.target.value })} maxLength={2} /></Field>
          </div>
          <Field label="Email per le notifiche"><input type="email" value={v.sender_email} onChange={(e) => setV({ ...v, sender_email: e.target.value })} /></Field>
          <Field label="Casella PEC mittente"><input value={v.pec_address} onChange={(e) => setV({ ...v, pec_address: e.target.value })} /></Field>
          <Field label="Utente PEC (se diverso)"><input value={v.pec_username} onChange={(e) => setV({ ...v, pec_username: e.target.value })} /></Field>
          <Field label={v.pec_address ? 'Password PEC (lascia vuoto per non cambiarla)' : 'Password PEC'}><input type="password" autoComplete="new-password" value={v.pec_password} onChange={(e) => setV({ ...v, pec_password: e.target.value })} /></Field>
          <Err msg={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="acc-btn is-primary" onClick={async () => { const r = await saveSendingSettings(v); if (r.error) setErr(r.error); else onClose() }}>Salva</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// ---------------- Deleghe ----------------
function ProxiesTab({ A }) {
  const [add, setAdd] = useState(false)
  const unitCode = useMemo(() => new Map(A.units.map((u) => [u.id, u.code])), [A.units])
  const warnings = A.proxyWarnings.filter((w) => w.warning)
  return (
    <div className="acc-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ flex: 1 }}>Deleghe</strong>
        {['consent', 'convened', 'in_session'].includes(A.assembly.status) && <button type="button" className="acc-btn" onClick={() => setAdd(true)}><Plus size={15} aria-hidden="true" />Registra delega cartacea</button>}
      </div>
      <p className="rc-muted">La delega è scritta. Con più di 20 condomini un delegato non può rappresentare più di 1/5 dei condomini e del valore; l&apos;amministratore non può essere delegato (art. 67 disp. att. c.c.).</p>
      {warnings.map((w) => <p key={w.delegate_name} style={{ color: '#B42318', margin: '4px 0' }}><AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {w.delegate_name}: {w.warning}</p>)}
      {A.proxies.length === 0 ? <p className="rc-muted">Nessuna delega ricevuta.</p> : (
        <ul className="ppl-list">
          {A.proxies.map((p) => (
            <li key={p.id}>
              <span className="ppl-main">
                <strong>{p.grantor_name} → {p.delegate_name}</strong>
                <small>Unità {unitCode.get(p.unit_id)}{p.document_id ? ' · delega firmata allegata' : ''}{p.note ? ` · ${p.note}` : ''}</small>
              </span>
              <span className="ppl-state" style={{ display: 'flex', gap: 6 }}>
                {p.status === 'submitted' ? (
                  <>
                    <button type="button" className="acc-btn" onClick={() => A.setProxyStatus(p.id, 'accepted')}><CheckCircle2 size={15} aria-hidden="true" />Accetta</button>
                    <button type="button" className="acc-btn" onClick={() => A.setProxyStatus(p.id, 'rejected')}><XCircle size={15} aria-hidden="true" />Respingi</button>
                  </>
                ) : <small style={{ fontWeight: 700 }}>{p.status === 'accepted' ? 'Accettata' : 'Respinta'}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {add && <ProxySheet A={A} units={A.units} onClose={() => setAdd(false)} />}
    </div>
  )
}

export function ProxySheet({ A, units, onClose, defaultGrantor = '' }) {
  const [v, setV] = useState({ unit_id: units[0]?.id || '', grantor_name: defaultGrantor, delegate_name: '', note: '' })
  const [err, setErr] = useState(null)
  async function save() {
    if (!v.unit_id || v.grantor_name.trim().length < 2 || v.delegate_name.trim().length < 2) { setErr('Indica unità, chi delega e il delegato.'); return }
    const r = await A.submitProxy(v)
    if (r.error) setErr(r.error); else onClose()
  }
  return (
    <Sheet title="Delega" kicker="Assemblea" onClose={onClose}>
      <Field label="Unità"><select value={v.unit_id} onChange={(e) => setV({ ...v, unit_id: e.target.value })}>{units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}</select></Field>
      <Field label="Chi delega (titolare)"><input value={v.grantor_name} onChange={(e) => setV({ ...v, grantor_name: e.target.value })} maxLength={120} /></Field>
      <Field label="Delegato (nome e cognome)"><input value={v.delegate_name} onChange={(e) => setV({ ...v, delegate_name: e.target.value })} maxLength={120} /></Field>
      <Field label="Istruzioni di voto (facoltative)"><input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={500} /></Field>
      <p className="rc-muted">Non puoi delegare l&apos;amministratore. Il delegato porta con sé un documento d&apos;identità.</p>
      <Err msg={err} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="acc-btn is-primary" onClick={save}>Salva delega</button></div>
    </Sheet>
  )
}

// ---------------- Seduta ----------------
function SessionTab({ A }) {
  const a = A.assembly
  const [err, setErr] = useState(null)
  const [itemId, setItemId] = useState(A.items.find((i) => i.majority_rule !== 'info')?.id || A.items[0]?.id || null)
  const [names, setNames] = useState({ president: a.president_name || '', secretary: a.secretary_name || '', call: a.session_call || 'second' })
  const open = a.status === 'in_session'
  const t = A.tally
  const holders = useMemo(() => {
    const m = new Map()
    A.people.filter((p) => p.role !== 'tenant' && (!p.until || p.until >= new Date().toISOString().slice(0, 10))).forEach((p) => m.set(p.unit_id, [...(m.get(p.unit_id) || []), p.full_name]))
    return m
  }, [A.people])
  const own = A.tables.find((x) => x.kind === 'ownership')
  const millOf = (unitId) => {
    const r = A.unitMill.find((x) => x.unit_id === unitId && x.table_id === own?.id)
    return r && own ? Number(r.value) * 1000 / Number(own.total) : 0
  }
  const att = new Map(A.attendance.map((x) => [x.unit_id, x]))
  const proxyByUnit = new Map(A.proxies.filter((p) => p.status === 'accepted').map((p) => [p.unit_id, p]))
  const present = A.units.filter((u) => att.get(u.id)?.present)
  const votes = new Map(A.votes.filter((v) => v.item_id === itemId).map((v) => [v.unit_id, v.vote]))
  const tItem = t?.items?.find((x) => x.item_id === itemId)
  const item = A.items.find((i) => i.id === itemId)
  const nextSeg = (A.recordings.reduce((n, r) => Math.max(n, r.segment), 0) || 0) + 1

  async function openSession() {
    if (!names.president.trim() || !names.secretary.trim()) { setErr('Indica presidente e segretario.'); return }
    const r = await A.update({ status: 'in_session', opened_at: new Date().toISOString(), session_call: names.call, president_name: names.president.trim(), secretary_name: names.secretary.trim() })
    if (r.error) setErr(r.error)
  }
  async function toggle(u, via) {
    const cur = att.get(u.id)
    if (cur?.present && (!via || cur.via === via)) { await A.setAttendance(u.id, null); return }
    const p = proxyByUnit.get(u.id)
    const v = via || (p ? 'proxy' : 'in_person')
    await A.setAttendance(u.id, { via: v, attendee_name: v === 'proxy' && p ? `${p.delegate_name} per ${p.grantor_name}` : (holders.get(u.id) || [u.code]).join(', '), proxy_id: v === 'proxy' ? p?.id : null })
  }

  if (!['convened', 'in_session', 'closed', 'minutes_final'].includes(a.status)) {
    return <div className="acc-card"><p className="rc-muted" style={{ margin: 0 }}>La seduta si apre dopo l&apos;invio della convocazione.</p></div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {a.status === 'convened' && (
        <div className="acc-card">
          <strong>Apri l&apos;assemblea</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 8 }}>
            <Field label="Convocazione"><select value={names.call} onChange={(e) => setNames({ ...names, call: e.target.value })}><option value="first">Prima</option><option value="second">Seconda (la prima è andata deserta)</option></select></Field>
            <Field label="Presidente"><input value={names.president} onChange={(e) => setNames({ ...names, president: e.target.value })} /></Field>
            <Field label="Segretario"><input value={names.secretary} onChange={(e) => setNames({ ...names, secretary: e.target.value })} /></Field>
          </div>
          <Err msg={err} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="acc-btn is-primary" onClick={openSession}>Apri la seduta</button></div>
        </div>
      )}

      {t && (
        <div className="acc-card" style={{ borderColor: t.constituted ? 'var(--teal)' : '#F5C2C0' }}>
          <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {t.constituted ? <CheckCircle2 size={17} aria-hidden="true" style={{ color: 'var(--teal)' }} /> : <AlertTriangle size={17} aria-hidden="true" style={{ color: '#B42318' }} />}
            {t.constituted ? 'Assemblea validamente costituita' : 'Quorum costitutivo non raggiunto'}
          </strong>
          <p className="rc-muted" style={{ margin: '4px 0 0' }}>Presenti {t.heads_present} condomini su {t.heads_total}, {mill(t.value_present)} millesimi su 1000. {t.constitution_rule}.</p>
          {t.heads_total === 0 && <p style={{ color: '#B42318', margin: '4px 0 0' }}>Mancano unità o tabella A in Unità e millesimi: senza, il quorum non si calcola.</p>}
        </div>
      )}

      <div className="acc-card">
        <strong>Presenze</strong>
        <ul className="ppl-list">
          {A.units.map((u) => {
            const x = att.get(u.id)
            const p = proxyByUnit.get(u.id)
            return (
              <li key={u.id}>
                <span className="ppl-main">
                  <strong>{u.code} <small className="rc-muted">{mill(millOf(u.id))}‰</small></strong>
                  <small>{x?.present ? x.attendee_name : (holders.get(u.id) || []).join(', ') || 'Titolare non indicato'}{p ? ` · delega a ${p.delegate_name}` : ''}{x && !x.present && x.left_at ? ' · uscito' : ''}</small>
                </span>
                {open && (
                  <span className="ppl-state" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[['in_person', 'Presente'], ['video', 'Video'], ...(p ? [['proxy', 'Delega']] : [])].map(([k, l]) => (
                      <button key={k} type="button" className={`p2-chip${x?.present && x.via === k ? ' is-on' : ''}`} style={{ height: 34 }} onClick={() => toggle(u, k)}>{l}</button>
                    ))}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {A.items.length > 0 && (
        <div className="acc-card">
          <strong>Votazioni</strong>
          <div className="p2-chips" style={{ margin: '8px 0', flexWrap: 'wrap' }}>
            {A.items.map((i) => <button key={i.id} type="button" className={`p2-chip${itemId === i.id ? ' is-on' : ''}`} onClick={() => setItemId(i.id)}>{i.position}</button>)}
          </div>
          {item && (
            <>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{item.position}. {item.title}</p>
              <p className="rc-muted" style={{ margin: 0 }}>{tItem?.requirement || majorityLabel(item.majority_rule)}</p>
              {item.majority_rule !== 'info' && (
                <>
                  {tItem && (
                    <p style={{ margin: '8px 0', fontWeight: 700, color: tItem.passed ? 'var(--teal-dk)' : '#B42318' }}>
                      Sì {tItem.yes_heads} ({mill(tItem.yes_value)}‰) · No {tItem.no_heads} ({mill(tItem.no_value)}‰) · Astenuti {tItem.abstain_heads} ({mill(tItem.abstain_value)}‰) · {tItem.passed ? 'Approvato' : 'Non approvato'}
                    </p>
                  )}
                  {open && present.length > 0 && <button type="button" className="acc-btn" style={{ marginBottom: 8 }} onClick={() => A.voteAll(item.id, present.filter((u) => !votes.has(u.id)).map((u) => u.id), 'yes')}>Tutti i presenti senza voto: favorevoli</button>}
                  <ul className="ppl-list">
                    {present.map((u) => (
                      <li key={u.id}>
                        <span className="ppl-main"><strong>{u.code}</strong><small>{att.get(u.id)?.attendee_name}</small></span>
                        <span className="ppl-state" style={{ display: 'flex', gap: 4 }}>
                          {[['yes', 'Sì'], ['no', 'No'], ['abstain', 'Ast.']].map(([k, l]) => (
                            <button key={k} type="button" disabled={!open} className={`p2-chip${votes.get(u.id) === k ? ' is-on' : ''}`} style={{ height: 34 }} onClick={() => A.vote(item.id, u.id, votes.get(u.id) === k ? null : k)}>{l}</button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <NoteField key={item.id} item={item} A={A} disabled={!open && a.status !== 'closed'} />
            </>
          )}
        </div>
      )}

      {open && (
        <div className="acc-card">
          <strong>Registrazione per il verbale</strong>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '8px 0' }}>
            <input type="checkbox" checked={a.recording_consent} onChange={(e) => A.update({ recording_consent: e.target.checked })} style={{ marginTop: 3 }} />
            <span>Ho informato i presenti e nessuno si è opposto alla registrazione. L&apos;audio è trascritto da OpenAI e cancellato 30 giorni dopo il verbale definitivo.</span>
          </label>
          <AssemblyRecorder nextSegment={nextSeg} onSegment={A.uploadSegment} disabled={!a.recording_consent} />
          {A.recordings.length > 0 && <p className="rc-muted" style={{ marginBottom: 0 }}>{A.recordings.length} pezzi registrati · trascritti {A.recordings.filter((r) => r.status === 'done').length}{A.recordings.some((r) => r.status === 'error') ? ' · alcuni con errore' : ''}</p>}
        </div>
      )}

      {open && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="acc-btn is-primary" onClick={async () => { if (window.confirm('Chiudere la seduta? Presenze e voti non si potranno più modificare.')) await A.update({ status: 'closed', closed_at: new Date().toISOString() }) }}>Chiudi la seduta</button>
        </div>
      )}
    </div>
  )
}

function NoteField({ item, A, disabled }) {
  const [v, setV] = useState(item.outcome_note || '')
  const [saved, setSaved] = useState(false)
  return (
    <label className="ep-field" style={{ marginTop: 8 }}>
      <span className="ep-label">Appunti del segretario su questo punto</span>
      <textarea value={v} disabled={disabled} rows={3} maxLength={2000} onChange={(e) => { setV(e.target.value); setSaved(false) }}
        onBlur={async () => { if (v !== (item.outcome_note || '')) { const r = await A.setItemNote(item.id, v.trim() || null); setSaved(!r.error) } }}
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: 10, font: 'inherit', fontSize: 15 }} />
      {saved && <small className="rc-muted">Salvato</small>}
    </label>
  )
}

// ---------------- Verbale ----------------
function MinutesTab({ A }) {
  const a = A.assembly
  const m = A.minutes
  const [draft, setDraft] = useState(m?.draft || '')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)
  const final = !!m?.finalized_at
  const pendingTx = A.recordings.filter((r) => ['uploaded', 'transcribing'].includes(r.status)).length

  if (!['closed', 'minutes_final'].includes(a.status)) {
    return <div className="acc-card"><p className="rc-muted" style={{ margin: 0 }}>Il verbale si prepara dopo la chiusura della seduta.</p></div>
  }
  async function run(label, fn) { setBusy(label); setErr(null); setOk(null); const r = await fn(); setBusy(null); if (r.error) setErr(r.error); return r }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="acc-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ flex: 1 }}>Verbale</strong>
          {!final && <button type="button" className="acc-btn" disabled={!!busy} onClick={async () => { const r = await run('ai', () => A.invoke('assembly-ai', { mode: 'minutes' })); if (r.data?.draft) setDraft(r.data.draft) }}><Sparkles size={15} aria-hidden="true" />{busy === 'ai' ? 'Condor sta scrivendo…' : draft ? 'Riscrivi la bozza con Condor' : 'Scrivi la bozza con Condor'}</button>}
        </div>
        {pendingTx > 0 && <p className="rc-muted">{pendingTx} pezzi di audio ancora da trascrivere: aspetta qualche minuto per una bozza completa.</p>}
        <p className="rc-muted">Condor usa presenze, voti e conteggi calcolati da Condoreco e la trascrizione. Rileggi tutto: il verbale lo firmano presidente e segretario.</p>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={final} rows={22} maxLength={60000}
          placeholder="La bozza del verbale comparirà qui."
          style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: 12, font: 'inherit', fontSize: 14.5, lineHeight: 1.5 }} />
        <Err msg={err} /><Ok msg={ok} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!final && <button type="button" className="acc-btn" disabled={!draft || !!busy} onClick={async () => { const r = await run('save', () => A.saveMinutes(draft, false)); if (!r.error) setOk('Bozza salvata.') }}>Salva bozza</button>}
          {!final && <button type="button" className="acc-btn is-primary" disabled={!draft || !!busy} onClick={async () => { if (window.confirm('Approvare il testo definitivo? Dopo potrai inviarlo ai condomini.')) await run('final', () => A.saveMinutes(draft, true)) }}>Approva testo definitivo</button>}
          {final && a.status !== 'minutes_final' && <button type="button" className="acc-btn" onClick={() => A.unfinalize()}>Modifica ancora</button>}
          {final && a.status !== 'minutes_final' && (
            <button type="button" className="acc-btn is-primary" disabled={!!busy} onClick={async () => {
              if (!window.confirm('Inviare il verbale a tutti i condomini con le stesse modalità della convocazione?')) return
              const r = await run('send', () => A.invoke('assembly-send', { purpose: 'minutes' }))
              if (!r.error) { await A.update({ status: 'minutes_final' }); const d = r.data || {}; setOk(`Verbale pubblicato. PEC: ${d.pec || 0}. Raccomandate: ${d.raccomandata || 0}. Da consegnare: ${d.manual || 0}.${d.emailed?.sent ? ` Email di cortesia: ${d.emailed.sent}.` : ''}`) }
            }}><Send size={15} aria-hidden="true" />{busy === 'send' ? 'Invio…' : 'Invia il verbale'}</button>
          )}
        </div>
      </div>

      {final && (
        <div className="acc-card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <strong style={{ flex: 1 }}>Riassunto per chi non c&apos;era</strong>
            <button type="button" className="acc-btn" disabled={!!busy} onClick={() => run('sum', () => A.invoke('assembly-ai', { mode: 'summary' }))}><Sparkles size={15} aria-hidden="true" />{busy === 'sum' ? 'Condor sta riassumendo…' : m?.summary ? 'Rifai il riassunto' : 'Crea il riassunto'}</button>
          </div>
          {m?.summary ? <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{m.summary}</p> : <p className="rc-muted" style={{ marginBottom: 0 }}>I condomini lo vedono nella pagina dell&apos;assemblea, sopra il verbale.</p>}
        </div>
      )}
      {a.status === 'minutes_final' && <RecipientsList A={A} list={A.recipients.filter((r) => r.purpose === 'minutes')} />}
    </div>
  )
}

export { STATUS_LABEL, MODE_LABEL }
