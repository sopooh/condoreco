'use client'

import Link from 'next/link'
import { useCondoRole } from '@/hooks/useCondoRole'
import Rendicontazione from '@/components/condo/accounting/Rendicontazione'

// Pagina Rendicontazione (privata): stessa testata dell'Archivio documenti,
// poi la situazione economica del condomino.
export default function RendicontazionePage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin } = useCondoRole(building.id)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={base} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Rendicontazione</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>Le tue quote, le spese del condominio e i pagamenti fatti.</p>
      </div>

      <Rendicontazione building={building} />

      {isCondoAdmin && (
        <Link href={`${base}/contabilita`} className="rc-admin-link">
          <span><strong>Contabilità del condominio</strong><small>Preventivo, rate, bonifici da confermare, estratto conto</small></span>
          <span aria-hidden="true">›</span>
        </Link>
      )}
    </div>
  )
}
