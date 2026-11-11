'use client'

import Link from 'next/link'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useBilancio } from '@/hooks/useAdminArea'
import { KIND_LABEL, euro } from '@/lib/accounting'
import Rendicontazione from '@/components/condo/accounting/Rendicontazione'
import { MemberBalances, yearFigures } from '@/components/condo/admin/BilancioPage'

// Pagina Rendicontazione (privata): stessa testata dell'Archivio documenti.
// Il condomino vede la sua situazione; l'amministratore quella di tutti.
export default function RendicontazionePage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading } = useCondoRole(building.id)

  return (
    <div style={{ maxWidth: isCondoAdmin ? 980 : 760, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={base} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Rendicontazione</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>
          {isCondoAdmin ? 'Chi ha pagato, chi no, quanto manca e le spese ordinarie e straordinarie di ognuno.' : 'Le tue quote, le spese del condominio e i pagamenti fatti.'}
        </p>
      </div>

      {loading ? <p className="rc-muted">Caricamento…</p> : isCondoAdmin ? <AdminRendicontazione building={building} base={base} /> : <Rendicontazione building={building} />}
    </div>
  )
}

function AdminRendicontazione({ building, base }) {
  const bil = useBilancio(building.id)
  const year = new Date().getFullYear()
  if (bil.loading) return <p className="rc-muted">Caricamento…</p>
  if (bil.error) return <p className="auth-err">{bil.error}</p>
  const { kinds } = yearFigures(bil, year)

  return (
    <>
      <MemberBalances bil={bil} compact />

      <div className="acc-card">
        <h2 className="acc-h2">Spese del condominio {year}</h2>
        <ul className="rc-lines">
          {kinds.map((k) => (
            <li key={k.kind}>
              <span style={{ flex: 1, minWidth: 0 }}><strong>Spese {KIND_LABEL[k.kind].toLowerCase()}</strong><small>Quote emesse {euro(k.charged)} · incassate {euro(k.collected)}</small></span>
              <b>{euro(k.spent)}</b>
            </li>
          ))}
          <li><span style={{ flex: 1 }}><strong>Totale speso</strong></span><b>{euro(kinds.reduce((n, k) => n + k.spent, 0))}</b></li>
        </ul>
      </div>

      <div className="adm-links">
        <Link href={`${base}/contabilita`} className="rc-admin-link">
          <span><strong>Valida pagamenti</strong><small>Contabili, bonifici da confermare, rate, estratto conto</small></span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href={`${base}/bilancio`} className="rc-admin-link">
          <span><strong>Bilancio</strong><small>Spese sostenute, confronto con il preventivo</small></span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href={`${base}/bilancio/stampa?anno=${year}`} className="rc-admin-link">
          <span><strong>PDF bilancio provvisorio</strong><small>Da stampare o inviare ai condomini</small></span>
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </>
  )
}
