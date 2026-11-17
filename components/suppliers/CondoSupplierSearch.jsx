'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, ChevronLeft, Hammer, Info, Mail, MapPin, Phone, Search, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MAINTENANCE_CATEGORIES, maintenanceCategory, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import { useCondoRole } from '@/hooks/useCondoRole'
import { telLink } from '@/lib/contact'

// Cerca fornitori dal condominio.
// - Fornitori del condominio (rubrica): si contattano direttamente.
// - Altri fornitori iscritti a Condoreco: il residente li propone
//   all'amministratore, niente contatto diretto. L'amministratore li aggiunge
//   alla rubrica o ignora la proposta.
export default function CondoSupplierSearch({ building }) {
  const buildingId = building.id
  const base = `/edificio/${buildingId}/condominio`
  const { isCondoAdmin } = useCondoRole(buildingId)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [maintainers, setMaintainers] = useState(null)
  const [others, setOthers] = useState(null)
  const [hasAdmin, setHasAdmin] = useState(true)
  const [proposals, setProposals] = useState([])
  const [proposing, setProposing] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => { const t = setTimeout(() => setQuery(q), 250); return () => clearTimeout(t) }, [q])

  const loadCondo = useCallback(async () => {
    const supabase = createClient()
    const [{ data: m }, { data: ha }] = await Promise.all([
      supabase.from('condo_maintainers').select('id, name, company, category, phone, email, notes, supplier_user_id').eq('building_id', buildingId).order('name'),
      supabase.rpc('building_has_admin', { p_building: buildingId }),
    ])
    setMaintainers(m || [])
    setHasAdmin(ha !== false)
  }, [buildingId])

  const loadOthers = useCallback(async () => {
    const { data, error } = await createClient().rpc('condo_supplier_search', { p_building: buildingId, p_category: category, p_query: query || null })
    setOthers(error ? [] : (data || []).filter((s) => !s.in_condo))
  }, [buildingId, category, query])

  const loadProposals = useCallback(async () => {
    if (!isCondoAdmin) { setProposals([]); return }
    const { data } = await createClient().rpc('supplier_proposals_for_admin', { p_building: buildingId })
    setProposals(data || [])
  }, [buildingId, isCondoAdmin])

  useEffect(() => { loadCondo() }, [loadCondo])
  useEffect(() => { loadOthers() }, [loadOthers])
  useEffect(() => { loadProposals() }, [loadProposals])

  const condoList = useMemo(() => {
    if (!maintainers) return null
    const needle = query.trim().toLowerCase()
    return maintainers.filter((m) => (!category || m.category === category)
      && (!needle || [m.name, m.company, m.notes, maintenanceCategoryLabel(m.category)].some((v) => v && v.toLowerCase().includes(needle))))
  }, [maintainers, category, query])

  const canAddDirect = isCondoAdmin || !hasAdmin
  const total = (condoList?.length || 0) + (others?.length || 0)

  async function addToCondo(s) {
    setBusy(s.id); setMsg(null)
    const { error } = await createClient().rpc('add_supplier_to_condo', { p_building: buildingId, p_supplier: s.id, p_category: category || s.categories?.[0] || null })
    setBusy(null)
    if (error) { setMsg('Non sono riuscito ad aggiungerlo. Riprova.'); return }
    setMsg(`${s.company_name} è ora tra i fornitori del condominio.`)
    await Promise.all([loadCondo(), loadOthers(), loadProposals()])
  }

  async function decide(p, accept) {
    setBusy(p.supplier_id); setMsg(null)
    const { error } = await createClient().rpc('decide_supplier_proposal', { p_building: buildingId, p_supplier: p.supplier_id, p_accept: accept })
    setBusy(null)
    if (error) { setMsg('Operazione non riuscita. Riprova.'); return }
    setMsg(accept ? `${p.company_name} aggiunto ai fornitori del condominio.` : 'Proposta ignorata.')
    await Promise.all([loadCondo(), loadOthers(), loadProposals()])
  }

  async function withdraw(s) {
    setBusy(s.id)
    await createClient().rpc('withdraw_supplier_proposal', { p_building: buildingId, p_supplier: s.id })
    setBusy(null)
    loadOthers()
  }

  return (
    <div className="sx-page">
      <header className="sx-head">
        <Link href={`${base}/interventi`} className="sx-back" aria-label="Torna agli interventi"><ChevronLeft size={26} aria-hidden="true" /></Link>
        <div style={{ minWidth: 0 }}>
          <h1>Cerca fornitori</h1>
          <p>Ditte per il tuo condominio</p>
        </div>
      </header>

      <label className="sx-search">
        <Search size={20} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca ditta, servizio o zona" aria-label="Cerca ditta, servizio o zona" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Cancella la ricerca"><X size={16} aria-hidden="true" /></button>}
      </label>

      <div className="sx-chips" role="tablist" aria-label="Categorie">
        {[{ value: null, label: 'Tutti' }, ...MAINTENANCE_CATEGORIES.filter((c) => c.value !== 'other')].map((c) => (
          <button key={c.label} type="button" role="tab" aria-selected={category === c.value}
            className={category === c.value ? 'is-on' : ''} onClick={() => setCategory(c.value)}>{c.label}</button>
        ))}
      </div>

      {msg && <p className="sx-msg" role="status">{msg}</p>}

      {isCondoAdmin && proposals.length > 0 && (
        <section className="sx-sec">
          <h2>Proposte dei residenti <span>{proposals.length}</span></h2>
          {proposals.map((p) => (
            <article key={p.supplier_id} className="sx-card is-proposal">
              <div className="sx-top">
                <span className="sx-logo"><MaintenanceIcon name={maintenanceCategory(p.categories?.[0]).icon} size={26} /></span>
                <div className="sx-main">
                  <div className="sx-name">{p.company_name}{p.verified && <BadgeCheck size={18} aria-label="Verificata" className="sx-ok" />}</div>
                  <div className="sx-cats">{(p.categories || []).map(maintenanceCategoryLabel).join(' • ')}</div>
                  <div className="sx-meta">Proposto da {p.proposers.join(', ')}</div>
                </div>
              </div>
              {p.notes?.length > 0 && <p className="sx-note">“{p.notes[p.notes.length - 1]}”</p>}
              <div className="sx-actions">
                <button type="button" className="sx-btn is-main" disabled={busy === p.supplier_id} onClick={() => decide(p, true)}>Aggiungi al condominio</button>
                <button type="button" className="sx-btn" disabled={busy === p.supplier_id} onClick={() => decide(p, false)}>Ignora</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="sx-count">{maintainers === null || others === null ? 'Cerco...' : `${total} ${total === 1 ? 'ditta disponibile' : 'ditte disponibili'}`}</div>

      <section className="sx-sec">
        <h2>Del condominio <span>{condoList?.length ?? ''}</span></h2>
        <p className="sx-sub">Scelti per il condominio: puoi contattarli direttamente.</p>
        {condoList === null ? null : condoList.length === 0 ? (
          <p className="sx-empty">{query || category ? 'Nessun fornitore del condominio corrisponde alla ricerca.' : 'Il condominio non ha ancora fornitori in rubrica.'}</p>
        ) : condoList.map((m) => (
          <article key={m.id} className="sx-card">
            <div className="sx-top">
              <span className="sx-logo"><MaintenanceIcon name={maintenanceCategory(m.category).icon} size={26} /></span>
              <div className="sx-main">
                <div className="sx-name">{m.name}{m.supplier_user_id && <BadgeCheck size={18} aria-label="Su Condoreco" className="sx-ok" />}</div>
                <div className="sx-cats">{maintenanceCategoryLabel(m.category)}{m.company && m.company !== m.name ? ` • ${m.company}` : ''}</div>
                {m.notes && <div className="sx-meta">{m.notes}</div>}
              </div>
              <span className="sx-tag">Del condominio</span>
            </div>
            <div className="sx-actions">
              {m.phone && <a className="sx-btn is-main" href={telLink(m.phone)}><Phone size={16} aria-hidden="true" />Chiama</a>}
              {m.email && <a className="sx-btn" href={`mailto:${m.email}`}><Mail size={16} aria-hidden="true" />Email</a>}
              <Link className="sx-btn" href={`${base}/interventi?nuova=1`}><Hammer size={16} aria-hidden="true" />Nuovo intervento</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="sx-sec">
        <h2>Altri fornitori su Condoreco <span>{others?.length ?? ''}</span></h2>
        <p className="sx-sub">
          {canAddDirect
            ? 'Iscritti a Condoreco ma non ancora nella rubrica del condominio.'
            : 'Puoi proporli all\'amministratore: se li aggiunge ai fornitori del condominio, potrai contattarli direttamente.'}
        </p>
        {others === null ? null : others.length === 0 ? (
          <p className="sx-empty">{query || category ? 'Nessun altro fornitore corrisponde alla ricerca.' : 'Non ci sono ancora altri fornitori iscritti in questa zona.'}</p>
        ) : others.map((s) => (
          <article key={s.id} className="sx-card">
            <div className="sx-top">
              <span className="sx-logo is-ext"><MaintenanceIcon name={maintenanceCategory(s.categories?.[0]).icon} size={26} /></span>
              <div className="sx-main">
                <div className="sx-name">{s.company_name}{s.verified && <BadgeCheck size={18} aria-label="Verificata" className="sx-ok" />}</div>
                <div className="sx-cats">{(s.categories || []).map(maintenanceCategoryLabel).join(' • ')}</div>
                <div className="sx-meta">
                  {s.jobs > 0 && <span>{s.jobs} {s.jobs === 1 ? 'lavoro' : 'lavori'} su Condoreco</span>}
                  {s.zones?.length > 0 && <span><MapPin size={13} aria-hidden="true" />{s.zones.join(', ')}</span>}
                </div>
              </div>
            </div>
            {s.description && <p className="sx-desc">{s.description}</p>}
            <div className="sx-actions">
              {canAddDirect ? (
                <button type="button" className="sx-btn is-main" disabled={busy === s.id} onClick={() => addToCondo(s)}>{busy === s.id ? 'Aggiungo...' : 'Aggiungi al condominio'}</button>
              ) : s.proposed_by_me ? (
                <>
                  <span className="sx-btn is-done"><Send size={15} aria-hidden="true" />Proposto all&apos;amministratore</span>
                  <button type="button" className="sx-link" disabled={busy === s.id} onClick={() => withdraw(s)}>Ritira</button>
                </>
              ) : (
                <button type="button" className="sx-btn is-main" onClick={() => setProposing(s)}><Send size={15} aria-hidden="true" />Proponi all&apos;amministratore</button>
              )}
              {s.proposals > 0 && !s.proposed_by_me && <span className="sx-hint">{s.proposals} {s.proposals === 1 ? 'proposta' : 'proposte'} di altri residenti</span>}
            </div>
          </article>
        ))}
        {!canAddDirect && (
          <p className="sx-info"><Info size={16} aria-hidden="true" />Per ora i fornitori fuori dalla rubrica non si contattano direttamente: passa dall&apos;amministratore.</p>
        )}
      </section>

      {proposing && (
        <ProposeSheet supplier={proposing} onClose={() => setProposing(null)} onSent={async () => {
          setProposing(null); setMsg(`Proposta inviata all'amministratore per ${proposing.company_name}.`); await loadOthers()
        }} buildingId={buildingId} />
      )}
    </div>
  )
}

function ProposeSheet({ supplier, buildingId, onClose, onSent }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  async function send() {
    setBusy(true); setErr(null)
    const { error } = await createClient().rpc('propose_supplier', { p_building: buildingId, p_supplier: supplier.id, p_note: note.trim() || null })
    setBusy(false)
    if (error) { setErr('Non sono riuscito a inviare la proposta. Riprova.'); return }
    onSent()
  }
  return (
    <div className="sx-overlay" role="dialog" aria-modal="true" aria-label="Proponi all'amministratore" onClick={onClose}>
      <div className="sx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sx-sheet-head">
          <h3>Proponi {supplier.company_name}</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi"><X size={20} aria-hidden="true" /></button>
        </div>
        <p>L&apos;amministratore riceve una notifica e decide se aggiungerla ai fornitori del condominio. Se la aggiunge, potrai contattarla direttamente.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder="Perché la proponi? (facoltativo)" />
        {err && <p className="sx-err">{err}</p>}
        <button type="button" className="sx-btn is-main is-wide" disabled={busy} onClick={send}><Send size={16} aria-hidden="true" />{busy ? 'Invio...' : 'Invia la proposta'}</button>
      </div>
    </div>
  )
}
