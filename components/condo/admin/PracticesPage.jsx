'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Award, BadgeCheck, Check, ChevronRight, Clock3, FolderOpen, Gavel, Mail, Pencil, Phone, Plus, Receipt, Search, Send, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import { usePractices } from '@/hooks/useAdminArea'
import { MAINTENANCE_CATEGORIES, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import { KIND_LABEL, euro, fmtDay } from '@/lib/accounting'
import Sheet, { toNumber } from '@/components/condo/admin/Sheet'

// Pratiche: una decisione approvata (o un lavoro deciso dall'amministratore)
// diventa una pratica. L'amministratore chiede i preventivi ai fornitori,
// li confronta e affida il lavoro. I condomini vedono a che punto è.

export const PRACTICE_STATUS = {
  open: { label: 'Raccolta preventivi', bg: '#EEF4FF', fg: '#1D4ED8' },
  assigned: { label: 'Lavoro affidato', bg: '#ECFDF3', fg: '#067647' },
  done: { label: 'Conclusa', bg: '#F2F4F7', fg: '#344054' },
  cancelled: { label: 'Annullata', bg: '#F2F4F7', fg: '#667085' },
}
const QUOTE_STATUS = {
  requested: { label: 'In attesa', bg: '#FFF7E6', fg: '#8A5A00' },
  received: { label: 'Ricevuto', bg: '#EEF4FF', fg: '#1D4ED8' },
  chosen: { label: 'Scelto', bg: '#ECFDF3', fg: '#067647' },
  rejected: { label: 'Non scelto', bg: '#F2F4F7', fg: '#667085' },
}

export default function PracticesPage({ building }) {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>}>
      <Inner building={building} />
    </Suspense>
  )
}

function Inner({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(building.id)
  const pr = usePractices(building.id)
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const openId = sp.get('p')
  const pollParam = sp.get('poll')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const open = pr.practices.find((p) => p.id === openId)
  const fromPoll = pollParam && pr.practices.find((p) => p.poll_id === pollParam)
  const go = (id) => router.push(id ? `${pathname}?p=${id}` : pathname, { scroll: true })

  // link dalla notifica: se la pratica esiste già si apre quella
  const redirectTo = fromPoll && !openId ? fromPoll.id : null
  useEffect(() => { if (redirectTo) router.replace(`${pathname}?p=${redirectTo}`) }, [redirectTo, pathname, router])

  if (roleLoading || pr.loading || redirectTo) return <p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>

  if (open) return <PracticeDetail building={building} practice={open} pr={pr} isAdmin={isCondoAdmin} onBack={() => go(null)} />

  async function take(pollId) {
    setBusy(pollId); setErr(null)
    const r = await pr.takeCharge(pollId)
    setBusy(null)
    if (r.error) setErr(r.error)
    else go(r.data)
  }

  const active = pr.practices.filter((p) => p.status === 'open' || p.status === 'assigned')
  const closed = pr.practices.filter((p) => p.status === 'done' || p.status === 'cancelled')

  return (
    <div className="acc-wrap" style={{ maxWidth: 820 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="acc-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="acc-h1">Pratiche e preventivi</h1>
          <p className="rc-muted" style={{ margin: 0 }}>{isCondoAdmin ? 'Prendi in carico le decisioni approvate, chiedi i preventivi e affida i lavori.' : 'A che punto sono i lavori decisi dal condominio.'}</p>
        </div>
        {isCondoAdmin && <button type="button" className="acc-btn is-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Nuova pratica</button>}
      </header>

      {err && <p className="auth-err">{err}</p>}

      {isCondoAdmin && pr.toTake.length > 0 && (
        <section className="acc-card prt-alert">
          <h2 className="acc-h2"><Gavel size={18} aria-hidden="true" />Decisioni da prendere in carico</h2>
          <ul className="acc-list">
            {pr.toTake.map((p) => (
              <li key={p.id} className={p.id === pollParam ? 'is-hl' : ''}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{p.question}</strong>
                  <small>Approvata{p.phase2_status === 'closed' ? ' con la fase 2' : ''} · {fmtDay(p.phase2_closes_at || p.closes_at)}</small>
                </div>
                <button type="button" className="acc-btn is-primary" disabled={busy === p.id} onClick={() => take(p.id)}>
                  {busy === p.id ? 'Apertura…' : 'Prendi in carico'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pr.practices.length === 0 && (
        <div className="acc-card acc-empty">
          <FolderOpen size={30} aria-hidden="true" />
          <strong>Nessuna pratica</strong>
          <p>{isCondoAdmin ? 'Quando una decisione viene approvata ti arriva l’avviso per prenderla in carico. Puoi anche aprire una pratica a mano.' : 'Quando il condominio approva un lavoro, qui vedi i preventivi richiesti e a chi è stato affidato.'}</p>
        </div>
      )}

      {active.length > 0 && <PracticeList title="In corso" list={active} onOpen={go} isAdmin={isCondoAdmin} />}
      {closed.length > 0 && <PracticeList title="Archivio" list={closed} onOpen={go} isAdmin={isCondoAdmin} />}

      {creating && <PracticeSheet onClose={() => setCreating(false)}
        onSave={async (v) => { const r = await pr.createPractice(v); if (!r.error) { setCreating(false); go(r.data.id) } return r.error }} />}
    </div>
  )
}

function PracticeList({ title, list, onOpen, isAdmin }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 className="acc-h2" style={{ fontSize: 16, color: 'var(--text-2)' }}>{title}</h2>
      <div className="acc-card" style={{ padding: 0 }}>
        <ul className="prt-list">
          {list.map((p) => {
            const quotes = p.condo_practice_quotes || []
            const got = quotes.filter((q) => q.amount != null && q.status !== 'rejected')
            const chosen = quotes.find((q) => q.id === p.chosen_quote_id)
            const st = PRACTICE_STATUS[p.status]
            return (
              <li key={p.id}>
                <button type="button" onClick={() => onOpen(p.id)}>
                  <span className="prt-ref">PR-{p.ref_number}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{p.title}</strong>
                    <small>
                      {maintenanceCategoryLabel(p.category)} · {KIND_LABEL[p.kind]}
                      {chosen ? ` · ${chosen.supplier_name}, ${euro(chosen.amount)}` : isAdmin ? ` · ${got.length} di ${quotes.length} preventivi` : ''}
                    </small>
                  </span>
                  <span className="acc-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ───────────── Dettaglio pratica + confronto preventivi ───────────── */

function PracticeDetail({ building, practice: p, pr, isAdmin, onBack }) {
  const base = `/edificio/${building.id}/condominio`
  const [sheet, setSheet] = useState(null) // 'request' | 'quote' | 'edit' | { quote }
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const quotes = useMemo(() => [...(p.condo_practice_quotes || [])].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity)), [p])
  const priced = quotes.filter((q) => q.amount != null && q.status !== 'rejected')
  const cheapest = priced.length > 1 ? priced[0].id : null
  const fastest = priced.filter((q) => q.days != null).sort((a, b) => a.days - b.days)
  const fastestId = priced.length > 1 && fastest.length ? fastest[0].id : null
  const longest = priced.filter((q) => q.warranty_months != null).sort((a, b) => b.warranty_months - a.warranty_months)
  const warrantyId = priced.length > 1 && longest.length && longest[0].warranty_months > 0 ? longest[0].id : null
  const maint = Object.fromEntries(pr.maintainers.map((m) => [m.id, m]))
  const st = PRACTICE_STATUS[p.status]
  const chosen = quotes.find((q) => q.id === p.chosen_quote_id)

  async function run(key, fn, ok) {
    setBusy(key); setErr(null); setMsg(null)
    const r = await fn()
    setBusy(null)
    if (r?.error) setErr(r.error)
    else if (ok) setMsg(ok)
    return r
  }

  return (
    <div className="acc-wrap" style={{ maxWidth: 980 }}>
      <button type="button" className="acc-back prt-backbtn" onClick={onBack}>‹ Tutte le pratiche</button>
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="prt-ref">PR-{p.ref_number}</span>
          <span className="acc-pill" style={{ background: st.bg, color: st.fg, marginTop: 0 }}>{st.label}</span>
          <span className="acc-pill" style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', marginTop: 0 }}>Spesa {KIND_LABEL[p.kind].toLowerCase()}</span>
        </div>
        <h1 className="acc-h1" style={{ marginTop: 8 }}>{p.title}</h1>
        <p className="rc-muted" style={{ margin: '2px 0 0' }}>{maintenanceCategoryLabel(p.category)} · aperta il {fmtDay(p.created_at)}</p>
        {p.description && <p className="prt-desc">{p.description}</p>}
        {p.poll_id && <Link href={`${base}/decisioni/${p.poll_id}`} className="prt-origin"><Gavel size={15} aria-hidden="true" />Nasce da una decisione approvata dal condominio<ChevronRight size={15} aria-hidden="true" /></Link>}
      </header>

      {err && <p className="auth-err">{err}</p>}
      {msg && <p className="acc-msg is-ok">{msg}</p>}

      {chosen && (
        <div className="prt-chosen">
          <BadgeCheck size={22} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Lavoro affidato a {chosen.supplier_name}</strong>
            <small>{euro(chosen.amount)}{chosen.days != null ? ` · ${chosen.days} giorni` : ''}{chosen.warranty_months ? ` · garanzia ${chosen.warranty_months} mesi` : ''}</small>
          </div>
          {isAdmin && chosen.intervention_id && <Link href={`${base}/interventi`} className="acc-btn">Segui l&apos;intervento</Link>}
        </div>
      )}

      {isAdmin ? (
        <>
          <div className="acc-toolbar">
            <h2 className="acc-h2" style={{ margin: 0, flex: 1 }}><Receipt size={18} aria-hidden="true" />Preventivi ({quotes.length})</h2>
            {p.status === 'open' && (
              <>
                <button type="button" className="acc-btn is-primary" onClick={() => setSheet('request')}><Send size={16} aria-hidden="true" />Richiedi preventivo</button>
                <button type="button" className="acc-btn" onClick={() => setSheet({ quote: {} })}><Plus size={16} aria-hidden="true" />Aggiungi ricevuto</button>
              </>
            )}
          </div>

          {quotes.length === 0 ? (
            <div className="acc-card acc-empty">
              <Send size={28} aria-hidden="true" />
              <strong>Nessun preventivo ancora</strong>
              <p>Chiedi il preventivo ai fornitori della rubrica o ai Recofixer della zona. Quelli registrati lo caricano qui da soli, per gli altri lo inserisci tu quando ti arriva.</p>
            </div>
          ) : (
            <div className="prt-compare" role="list">
              {quotes.map((q) => {
                const qs = QUOTE_STATUS[q.status]
                const m = q.maintainer_id ? maint[q.maintainer_id] : null
                const badges = [
                  q.id === cheapest && { icon: Award, label: 'Più conveniente', cls: 'is-best' },
                  q.id === fastestId && { icon: Zap, label: 'Più veloce' },
                  q.id === warrantyId && { icon: ShieldCheck, label: 'Garanzia più lunga' },
                ].filter(Boolean)
                return (
                  <article key={q.id} role="listitem" className={`prt-quote${q.id === cheapest ? ' is-best' : ''}${q.status === 'chosen' ? ' is-chosen' : ''}${q.status === 'rejected' ? ' is-off' : ''}`}>
                    <div className="prt-quote-head">
                      <strong>{q.supplier_name}</strong>
                      <span className="acc-pill" style={{ background: qs.bg, color: qs.fg, marginTop: 0 }}>{qs.label}</span>
                    </div>
                    {m?.supplier_user_id && <span className="prt-recofixer"><BadgeCheck size={13} aria-hidden="true" />Recofixer</span>}
                    {badges.length > 0 && <div className="prt-badges">{badges.map((b) => <span key={b.label} className={b.cls || ''}><b.icon size={13} aria-hidden="true" />{b.label}</span>)}</div>}
                    <dl>
                      <div><dt>Importo</dt><dd className="prt-amount">{q.amount != null ? euro(q.amount) : <span className="prt-na">da ricevere</span>}</dd></div>
                      <div><dt>Tempi</dt><dd>{q.days != null ? `${q.days} giorni` : <span className="prt-na">da ricevere</span>}</dd></div>
                      <div><dt>Garanzia</dt><dd>{q.warranty_months != null ? (q.warranty_months ? `${q.warranty_months} mesi` : 'Nessuna') : <span className="prt-na">da ricevere</span>}</dd></div>
                      {q.notes && <div className="prt-notes"><dt>Note</dt><dd>{q.notes}</dd></div>}
                    </dl>
                    <small className="prt-when">{q.received_at ? `Ricevuto il ${fmtDay(q.received_at)}` : `Richiesto il ${fmtDay(q.requested_at)}`}</small>
                    {q.status === 'requested' && m && (m.email || m.phone) && (
                      <div className="prt-contact">
                        {m.email && <a className="acc-btn" href={mailtoFor(m, p, building)}><Mail size={15} aria-hidden="true" />Email</a>}
                        {m.phone && <a className="acc-btn" href={`tel:${m.phone.replace(/\s+/g, '')}`}><Phone size={15} aria-hidden="true" />Chiama</a>}
                      </div>
                    )}
                    {p.status === 'open' && q.status !== 'rejected' && (
                      <div className="prt-quote-act">
                        <button type="button" className="acc-btn" onClick={() => setSheet({ quote: q })}><Pencil size={15} aria-hidden="true" />{q.amount != null ? 'Modifica' : 'Inserisci importo'}</button>
                        {q.amount != null && (
                          <button type="button" className="acc-btn is-primary" disabled={busy === q.id}
                            onClick={() => window.confirm(`Affidi il lavoro a ${q.supplier_name} per ${euro(q.amount)}? Gli altri preventivi verranno segnati come non scelti.`) && run(q.id, () => pr.chooseQuote(q.id), `Lavoro affidato a ${q.supplier_name}.`)}>
                            <Check size={15} aria-hidden="true" />{busy === q.id ? 'Salvataggio…' : 'Scegli questo'}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          <div className="prt-foot">
            {p.status === 'assigned' && (
              <>
                <Link href={`${base}/bilancio?tab=spese&pratica=${p.id}`} className="acc-btn is-primary"><Receipt size={16} aria-hidden="true" />Registra la fattura nel bilancio</Link>
                <button type="button" className="acc-btn" disabled={!!busy} onClick={() => run('done', () => pr.updatePractice(p.id, { status: 'done' }), 'Pratica conclusa.')}><Check size={16} aria-hidden="true" />Segna conclusa</button>
              </>
            )}
            <button type="button" className="acc-btn" onClick={() => setSheet('edit')}><Pencil size={16} aria-hidden="true" />Modifica pratica</button>
            {(p.status === 'open' || p.status === 'assigned') && (
              <button type="button" className="acc-btn is-danger" disabled={!!busy} onClick={() => window.confirm('Annulli la pratica?') && run('cancel', () => pr.updatePractice(p.id, { status: 'cancelled' }), 'Pratica annullata.')}>Annulla pratica</button>
            )}
            {(p.status === 'done' || p.status === 'cancelled') && (
              <button type="button" className="acc-btn" disabled={!!busy} onClick={() => run('reopen', () => pr.updatePractice(p.id, { status: p.chosen_quote_id ? 'assigned' : 'open' }), 'Pratica riaperta.')}>Riapri</button>
            )}
          </div>
        </>
      ) : (
        <div className="acc-card">
          <h2 className="acc-h2"><Clock3 size={18} aria-hidden="true" />Stato</h2>
          <p className="rc-muted" style={{ margin: 0 }}>
            {p.status === 'open' ? `L’amministratore sta raccogliendo i preventivi (${priced.length} ricevuti finora).`
              : p.status === 'assigned' ? 'Il lavoro è stato affidato. Le date dell’intervento compariranno nel calendario del condominio.'
              : p.status === 'done' ? 'Il lavoro è concluso.' : 'La pratica è stata annullata.'}
          </p>
        </div>
      )}

      {sheet === 'request' && <RequestSheet practice={p} pr={pr} building={building} onClose={() => setSheet(null)} onDone={(m) => { setSheet(null); setMsg(m) }} />}
      {sheet?.quote && <QuoteSheet quote={sheet.quote} maintainers={pr.maintainers} onClose={() => setSheet(null)}
        onSave={async (v) => { const r = await pr.saveQuote(p.id, v); if (!r.error) { setSheet(null); setMsg('Preventivo salvato.') } return r.error }}
        onDelete={sheet.quote.id ? async () => { const r = await pr.deleteQuote(sheet.quote.id); if (!r.error) setSheet(null); return r.error } : null} />}
      {sheet === 'edit' && <PracticeSheet practice={p} onClose={() => setSheet(null)}
        onSave={async (v) => { const r = await pr.updatePractice(p.id, v); if (!r.error) setSheet(null); return r.error }} />}
    </div>
  )
}

function mailtoFor(m, p, building) {
  const addr = `${building.address}${building.street_number ? ` ${building.street_number}` : ''}, ${building.city || ''}`.trim()
  const subject = `Richiesta preventivo: ${p.title}`
  const body = `Buongiorno ${m.name || ''},\n\nper il condominio di ${addr} vi chiediamo un preventivo per:\n\n${p.title}${p.description ? `\n${p.description}` : ''}\n\nVi chiediamo di indicare importo, tempi di esecuzione e garanzia.\n\nGrazie,\nL'amministrazione`
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/* ───────────── Fogli ───────────── */

function PracticeSheet({ practice, onClose, onSave }) {
  const [v, setV] = useState({ title: practice?.title || '', description: practice?.description || '', category: practice?.category || 'building_works', kind: practice?.kind || 'straordinaria' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function submit(e) {
    e.preventDefault()
    if (v.title.trim().length < 3) return setErr('Scrivi di che lavoro si tratta.')
    setBusy(true); setErr(null)
    const e2 = await onSave({ ...v, title: v.title.trim(), description: v.description.trim() || null })
    setBusy(false)
    if (e2) setErr(e2)
  }
  return (
    <Sheet title={practice ? 'Modifica pratica' : 'Nuova pratica'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="ep-field"><span className="ep-label">Lavoro</span>
          <span className="ep-input"><input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} placeholder="Es. Rifacimento facciata" /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Dettagli per i fornitori</span>
          <span className="ep-input" style={{ height: 'auto' }}><textarea rows={4} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={2000} className="prt-textarea" placeholder="Cosa va fatto, misure, accesso, tempi desiderati" /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Tipo di fornitore</span>
          <span className="ep-input"><select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {MAINTENANCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select></span>
        </label>
        <span className="ep-label">Spesa</span>
        <div className="p2-chips" style={{ marginBottom: 14 }}>
          {['ordinaria', 'straordinaria'].map((k) => <button key={k} type="button" className={`p2-chip${v.kind === k ? ' is-on' : ''}`} onClick={() => setV({ ...v, kind: k })}>{KIND_LABEL[k]}</button>)}
        </div>
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Salvataggio…' : practice ? 'Salva' : 'Apri pratica'}</button>
      </form>
    </Sheet>
  )
}

function RequestSheet({ practice: p, pr, building, onClose, onDone }) {
  const [tab, setTab] = useState('rubrica')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const [found, setFound] = useState(null)
  const asked = new Set((p.condo_practice_quotes || []).filter((q) => q.status !== 'rejected').map((q) => q.maintainer_id))
  const list = [...pr.maintainers].sort((a, b) => (b.category === p.category) - (a.category === p.category))

  async function ask(m) {
    setBusy(m.id); setErr(null)
    const r = await pr.requestQuote(p.id, m.id, message.trim())
    setBusy(null)
    if (r.error) return setErr(r.error)
    onDone(m.supplier_user_id
      ? `Richiesta inviata a ${m.company || m.name}: la vede nella sua area Recofixer e carica lì il preventivo.`
      : `Richiesta registrata per ${m.company || m.name}. Mandagliela con il tasto Email o Chiama sulla sua scheda.`)
  }

  async function search() {
    setBusy('search')
    setFound(await pr.searchSuppliers(p.category, building.city))
    setBusy(null)
  }

  async function addAndAsk(s) {
    setBusy(s.id); setErr(null)
    const a = await pr.addSupplier(s.id, p.category)
    if (a.error) { setBusy(null); return setErr(a.error) }
    const r = await pr.requestQuote(p.id, a.id, message.trim())
    setBusy(null)
    if (r.error) return setErr(r.error)
    onDone(`Richiesta inviata a ${s.company_name}: la vede nella sua area Recofixer.`)
  }

  return (
    <Sheet title="Richiedi un preventivo" kicker={p.title} onClose={onClose} wide>
      <label className="ep-field"><span className="ep-label">Messaggio per il fornitore (facoltativo)</span>
        <span className="ep-input" style={{ height: 'auto' }}><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} className="prt-textarea" placeholder="Es. sopralluogo possibile il martedì mattina" /></span>
      </label>
      <div className="p2-chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`p2-chip${tab === 'rubrica' ? ' is-on' : ''}`} onClick={() => setTab('rubrica')}>Rubrica del condominio</button>
        <button type="button" className={`p2-chip${tab === 'recofixer' ? ' is-on' : ''}`} onClick={() => { setTab('recofixer'); if (!found) search() }}>Recofixer in zona</button>
      </div>
      {err && <p className="auth-err">{err}</p>}
      {tab === 'rubrica' ? (
        list.length === 0 ? (
          <p className="rc-muted">La rubrica è vuota. Cerca tra i Recofixer o aggiungi un fornitore da <Link href={`/edificio/${building.id}/condominio/interventi`} style={{ color: 'var(--teal)', fontWeight: 700 }}>Interventi</Link>.</p>
        ) : (
          <ul className="prt-pick">
            {list.map((m) => (
              <li key={m.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{m.company || m.name}{m.supplier_user_id && <span className="prt-recofixer" style={{ marginLeft: 6 }}><BadgeCheck size={12} aria-hidden="true" />Recofixer</span>}</strong>
                  <small>{maintenanceCategoryLabel(m.category)}{m.email ? ` · ${m.email}` : m.phone ? ` · ${m.phone}` : ''}</small>
                </div>
                {asked.has(m.id)
                  ? <span className="acc-pill" style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', marginTop: 0 }}>Già richiesto</span>
                  : <button type="button" className="acc-btn is-primary" disabled={!!busy} onClick={() => ask(m)}>{busy === m.id ? 'Invio…' : 'Richiedi'}</button>}
              </li>
            ))}
          </ul>
        )
      ) : busy === 'search' || !found ? <p className="rc-muted"><Search size={14} aria-hidden="true" /> Cerco i Recofixer di {maintenanceCategoryLabel(p.category).toLowerCase()} a {building.city}…</p>
        : found.length === 0 ? <p className="rc-muted">Nessun Recofixer per questa categoria in zona. Prova con la rubrica o con la pagina <Link href="/fornitori" style={{ color: 'var(--teal)', fontWeight: 700 }}>Fornitori</Link>.</p>
        : (
          <ul className="prt-pick">
            {found.map((s) => (
              <li key={s.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{s.company_name}{s.verified && <span className="prt-recofixer" style={{ marginLeft: 6 }}><BadgeCheck size={12} aria-hidden="true" />Verificato</span>}</strong>
                  <small>{s.jobs} {s.jobs === 1 ? 'lavoro concluso' : 'lavori conclusi'}{s.zones?.length ? ` · ${s.zones.slice(0, 3).join(', ')}` : ''}</small>
                </div>
                <button type="button" className="acc-btn is-primary" disabled={!!busy} onClick={() => addAndAsk(s)}>{busy === s.id ? 'Invio…' : 'Richiedi'}</button>
              </li>
            ))}
          </ul>
        )}
    </Sheet>
  )
}

function QuoteSheet({ quote, maintainers, onClose, onSave, onDelete }) {
  const [v, setV] = useState({
    supplier_name: quote.supplier_name || '', maintainer_id: quote.maintainer_id || '',
    amount: quote.amount != null ? String(quote.amount).replace('.', ',') : '',
    days: quote.days ?? '', warranty_months: quote.warranty_months ?? '', notes: quote.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    const amount = toNumber(v.amount)
    if (v.supplier_name.trim().length < 2) return setErr('Scrivi il nome del fornitore.')
    if (!(amount > 0)) return setErr('Inserisci l’importo del preventivo.')
    const days = v.days === '' ? null : parseInt(v.days, 10)
    const warranty = v.warranty_months === '' ? null : parseInt(v.warranty_months, 10)
    setBusy(true); setErr(null)
    const e2 = await onSave({ id: quote.id, supplier_name: v.supplier_name.trim(), maintainer_id: v.maintainer_id || null, amount: Math.round(amount * 100) / 100, days, warranty_months: warranty, notes: v.notes.trim() })
    setBusy(false)
    if (e2) setErr(e2)
  }
  return (
    <Sheet title={quote.id ? 'Preventivo' : 'Preventivo ricevuto'} kicker="Importo, tempi e garanzia" onClose={onClose}>
      <form onSubmit={submit}>
        {quote.id ? (
          <p style={{ margin: '0 0 12px', fontWeight: 700 }}>{v.supplier_name}</p>
        ) : (
          <label className="ep-field"><span className="ep-label">Fornitore</span>
            <span className="ep-input"><select value={v.maintainer_id} onChange={(e) => {
              const m = maintainers.find((x) => x.id === e.target.value)
              setV({ ...v, maintainer_id: e.target.value, supplier_name: m ? (m.company || m.name) : v.supplier_name })
            }}>
              <option value="">Non in rubrica (scrivi il nome sotto)</option>
              {maintainers.map((m) => <option key={m.id} value={m.id}>{m.company || m.name}</option>)}
            </select></span>
          </label>
        )}
        {!quote.id && !v.maintainer_id && (
          <label className="ep-field"><span className="ep-label">Nome del fornitore</span>
            <span className="ep-input"><input value={v.supplier_name} onChange={set('supplier_name')} maxLength={120} placeholder="Es. Edil Rossi srl" /></span>
          </label>
        )}
        <label className="ep-field"><span className="ep-label">Importo (IVA inclusa)</span>
          <span className="ep-input"><span className="ep-prefix">€</span><input inputMode="decimal" value={v.amount} onChange={set('amount')} placeholder="0,00" /></span>
        </label>
        <div className="ep-row2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="ep-field"><span className="ep-label">Tempi (giorni)</span>
            <span className="ep-input"><input inputMode="numeric" value={v.days} onChange={set('days')} placeholder="Es. 30" /></span>
          </label>
          <label className="ep-field"><span className="ep-label">Garanzia (mesi)</span>
            <span className="ep-input"><input inputMode="numeric" value={v.warranty_months} onChange={set('warranty_months')} placeholder="Es. 24" /></span>
          </label>
        </div>
        <label className="ep-field"><span className="ep-label">Note</span>
          <span className="ep-input" style={{ height: 'auto' }}><textarea rows={3} value={v.notes} onChange={set('notes')} maxLength={1000} className="prt-textarea" placeholder="Cosa include, materiali, condizioni di pagamento" /></span>
        </label>
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva preventivo'}</button>
        {onDelete && (
          <button type="button" className="acc-btn is-danger" style={{ width: '100%', marginTop: 10 }} disabled={busy}
            onClick={async () => { if (!window.confirm('Elimini questo preventivo?')) return; setBusy(true); const e2 = await onDelete(); setBusy(false); if (e2) setErr(e2) }}>
            <Trash2 size={15} aria-hidden="true" />Elimina
          </button>
        )}
      </form>
    </Sheet>
  )
}
