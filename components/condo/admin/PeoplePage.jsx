'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Search, Share2, UserRound, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCondoRole } from '@/hooks/useCondoRole'
import { euro } from '@/lib/accounting'
import MillesimiReviewList from '@/components/condo/MillesimiReviewList'

// Persone e unità: l'amministratore vede anagrafica, piano, millesimi,
// proprietario/inquilino e situazione pagamenti; i condomini vedono solo
// nomi e piano dei vicini (come nella chat).

export default function PeoplePage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading } = useCondoRole(building.id)
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (loading) return
    const s = createClient()
    const req = isCondoAdmin
      ? s.rpc('admin_member_balances', { p_building: building.id })
      : s.rpc('condo_directory', { p_building: building.id })
    req.then(({ data }) => setRows(data || []))
  }, [loading, isCondoAdmin, building.id])

  const list = (rows || [])
    .filter((r) => !q || (r.display_name || '').toLowerCase().includes(q.toLowerCase()) || (r.floor || '').toLowerCase().includes(q.toLowerCase()))
    .filter((r) => filter === 'all' || (filter === 'owner' ? r.tenure !== 'tenant' : filter === 'tenant' ? r.tenure === 'tenant' : Number(r.overdue) > 0))
  const units = Number(building.units) || null
  const totMill = (rows || []).reduce((n, r) => n + (Number(r.millesimi) || 0), 0)

  async function invite() {
    const url = `${window.location.origin}/edificio/${building.id}`
    const text = `Unisciti al nostro condominio su Condoreco: apri il link, accedi e chiedi l'accesso.`
    if (navigator.share) { try { await navigator.share({ title: 'Condoreco', text, url }) } catch { /* annullato */ } return }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* niente */ }
  }

  return (
    <div className="acc-wrap" style={{ maxWidth: 900 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="acc-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="acc-h1">Persone e unità</h1>
          <p className="rc-muted" style={{ margin: 0 }}>
            {rows ? `${rows.length} ${rows.length === 1 ? 'condomino iscritto' : 'condomini iscritti'}${units ? ` su ${units} unità` : ''}` : 'Caricamento…'}
            {isCondoAdmin && totMill > 0 ? ` · ${totMill.toLocaleString('it-IT')}‰ assegnati` : ''}
          </p>
        </div>
        <button type="button" className="acc-btn is-primary" onClick={invite}><Share2 size={16} aria-hidden="true" />{copied ? 'Link copiato' : 'Invita condomini'}</button>
      </header>

      {isCondoAdmin && <MillesimiReviewList buildingId={building.id} />}

      <div className="acc-card" style={{ padding: 0 }}>
        <div className="bil-filters">
          {isCondoAdmin && (
            <div className="p2-chips">
              {[['all', 'Tutti'], ['owner', 'Proprietari'], ['tenant', 'Inquilini'], ['late', 'In arretrato']].map(([k, l]) => (
                <button key={k} type="button" className={`p2-chip${filter === k ? ' is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          )}
          <label className="acc-search" style={{ maxWidth: 280 }}><Search size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome o piano" aria-label="Cerca" /></label>
        </div>
        {rows === null ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Caricamento…</p> : list.length === 0 ? (
          <div className="acc-empty"><Users size={28} aria-hidden="true" /><strong>Nessuno qui</strong><p>Invita i condomini con il link: dopo l&apos;accesso chiedono di entrare e tu approvi.</p></div>
        ) : (
          <ul className="ppl-list">
            {list.map((r) => {
              const late = Number(r.overdue) > 0
              return (
                <li key={r.user_id}>
                  <span className="ppl-avatar">{r.avatar_url ? <img src={r.avatar_url} alt="" /> : (r.display_name || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="ppl-main">
                    <strong>{r.display_name || 'Condomino'}{r.role === 'admin' && <em className="ppl-tag">Amministratore</em>}</strong>
                    <small>{[r.floor ? `Piano ${r.floor}` : 'Piano non indicato', isCondoAdmin ? (r.tenure === 'tenant' ? 'Inquilino' : 'Proprietario') : null, isCondoAdmin && r.millesimi != null ? `${Number(r.millesimi).toLocaleString('it-IT')}‰` : null].filter(Boolean).join(' · ')}</small>
                  </span>
                  {isCondoAdmin && (
                    <span className="ppl-state">
                      {late ? <><small>Arretrato</small><b className="is-danger">{euro(r.overdue)}</b></>
                        : Number(r.open_amount) > 0 ? <><small>Da pagare</small><b>{euro(r.open_amount)}</b></>
                        : <span className="bil-ok"><CheckCircle2 size={15} aria-hidden="true" />In regola</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {isCondoAdmin && <p className="rc-muted" style={{ marginTop: 10 }}><UserRound size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Il dettaglio dei pagamenti di ognuno è in <Link href={`${base}/rendicontazione`} style={{ color: 'var(--teal)', fontWeight: 700 }}>Contabilità</Link>.</p>}
    </div>
  )
}
