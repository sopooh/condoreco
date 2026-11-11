'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useBilancio } from '@/hooks/useAdminArea'
import { KIND_LABEL, categoryOf, euro, fmtDay } from '@/lib/accounting'
import { yearFigures } from '@/components/condo/admin/BilancioPage'

// Bilancio provvisorio stampabile: "Stampa" del browser → Salva come PDF.

export default function BilancioPrint({ building }) {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Caricamento…</p>}>
      <Inner building={building} />
    </Suspense>
  )
}

function Inner({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const sp = useSearchParams()
  const year = Number(sp.get('anno')) || new Date().getFullYear()
  const { isCondoAdmin, loading } = useCondoRole(building.id)
  const bil = useBilancio(isCondoAdmin ? building.id : null)

  if (loading || (isCondoAdmin && bil.loading)) return <p style={{ padding: 24, color: 'var(--text-3)' }}>Preparo il bilancio…</p>
  if (!isCondoAdmin) return <p style={{ padding: 24 }}>Il bilancio è riservato all&apos;amministratore.</p>

  const { cats, kinds, t, expenses } = yearFigures(bil, year)
  const rows = bil.balances
  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const addr = `${building.address}${building.street_number ? ` ${building.street_number}` : ''}${building.city ? `, ${building.city}` : ''}`
  const tot = (f) => rows.reduce((n, r) => n + Number(f(r) || 0), 0)

  return (
    <div className="bp-page">
      <div className="bp-bar bp-noprint">
        <Link href={`${base}/bilancio`} className="acc-back" style={{ margin: 0 }}>‹ Torna al bilancio</Link>
        <button type="button" className="acc-btn is-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Stampa o salva PDF</button>
      </div>

      <article className="bp-doc">
        <header className="bp-head">
          <div>
            <div className="bp-brand">Condoreco</div>
            <h1>Bilancio provvisorio {year}</h1>
            <p>Condominio di {addr}</p>
          </div>
          <div className="bp-meta">
            <span>Situazione al {today}</span>
            <span>Documento provvisorio</span>
          </div>
        </header>

        <section>
          <h2>1. Riepilogo</h2>
          <table className="bp-table">
            <tbody>
              <tr><td>Spese preventivate</td><td>{euro(t.budget)}</td></tr>
              <tr><td>Quote emesse ai condomini</td><td>{euro(t.charged)}</td></tr>
              <tr><td>Quote incassate</td><td>{euro(t.collected)}</td></tr>
              <tr><td>Spese sostenute</td><td>{euro(t.spent)}</td></tr>
              <tr className="bp-strong"><td>Saldo di cassa (incassato meno speso)</td><td>{euro(t.collected - t.spent)}</td></tr>
              <tr><td>Quote ancora da incassare</td><td>{euro(t.charged - t.collected)}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>2. Gestione ordinaria e straordinaria</h2>
          <table className="bp-table">
            <thead><tr><th>Gestione</th><th>Preventivo</th><th>Quote emesse</th><th>Incassato</th><th>Speso</th></tr></thead>
            <tbody>{kinds.map((k) => <tr key={k.kind}><td>{KIND_LABEL[k.kind]}</td><td>{euro(k.budget)}</td><td>{euro(k.charged)}</td><td>{euro(k.collected)}</td><td>{euro(k.spent)}</td></tr>)}</tbody>
          </table>
        </section>

        <section>
          <h2>3. Spese per voce</h2>
          {cats.length === 0 ? <p className="bp-muted">Nessun dato per il {year}.</p> : (
            <table className="bp-table">
              <thead><tr><th>Voce</th><th>Preventivo</th><th>Consuntivo provvisorio</th><th>Differenza</th></tr></thead>
              <tbody>{cats.map((c) => <tr key={c.id}><td>{c.label}</td><td>{euro(c.budget)}</td><td>{euro(c.spent)}</td><td>{euro(c.budget - c.spent)}</td></tr>)}</tbody>
              <tfoot><tr><td>Totale</td><td>{euro(t.budget)}</td><td>{euro(t.spent)}</td><td>{euro(t.budget - t.spent)}</td></tr></tfoot>
            </table>
          )}
        </section>

        <section>
          <h2>4. Situazione dei condomini</h2>
          {rows.length === 0 ? <p className="bp-muted">Nessun condomino con quote.</p> : (
            <table className="bp-table bp-small">
              <thead><tr><th>Condomino</th><th>Millesimi</th><th>Ordinarie</th><th>Straord.</th><th>Pagato</th><th>Residuo</th><th>Arretrato</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td>{r.display_name || 'Condomino'}{r.floor ? ` (piano ${r.floor})` : ''}</td>
                    <td>{r.millesimi != null ? Number(r.millesimi).toLocaleString('it-IT') : ''}</td>
                    <td>{euro(r.ord_total)}</td><td>{euro(r.straord_total)}</td><td>{euro(r.paid)}</td><td>{euro(r.open_amount)}</td>
                    <td className={Number(r.overdue) > 0 ? 'bp-late' : ''}>{euro(r.overdue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Totale</td><td /><td>{euro(tot((r) => r.ord_total))}</td><td>{euro(tot((r) => r.straord_total))}</td><td>{euro(tot((r) => r.paid))}</td><td>{euro(tot((r) => r.open_amount))}</td><td>{euro(tot((r) => r.overdue))}</td></tr></tfoot>
            </table>
          )}
        </section>

        <section>
          <h2>5. Registro delle spese sostenute</h2>
          {expenses.length === 0 ? <p className="bp-muted">Nessuna spesa registrata.</p> : (
            <table className="bp-table bp-small">
              <thead><tr><th>Data</th><th className="bp-left">Descrizione</th><th>Voce</th><th>Tipo</th><th>Importo</th></tr></thead>
              <tbody>
                {[...expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on)).map((e) => (
                  <tr key={e.id}><td>{fmtDay(e.spent_on)}</td><td className="bp-left">{e.description}{e.supplier ? ` · ${e.supplier}` : ''}</td><td>{categoryOf(e.category).label}</td><td>{KIND_LABEL[e.kind]}</td><td>{euro(e.amount)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Totale</td><td>{euro(t.spent)}</td></tr></tfoot>
            </table>
          )}
        </section>

        <footer className="bp-foot">
          Bilancio provvisorio redatto con Condoreco sui dati registrati al {today}. Non sostituisce il rendiconto
          consuntivo approvato dall&apos;assemblea dei condomini.
        </footer>
      </article>
    </div>
  )
}
