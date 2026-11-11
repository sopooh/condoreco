'use client'

import Link from 'next/link'
import { Bell, CalendarDays, ChevronLeft, Coins, Folder, Wrench } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import Rendicontazione from '@/components/condo/accounting/Rendicontazione'

// Pagina Rendicontazione (privata): testata del condominio con le schede
// delle sezioni e, sotto, la situazione economica del condomino.
export default function RendicontazionePage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin } = useCondoRole(building.id)
  const address = `${building.address}${building.street_number ? `, ${building.street_number}` : ''}`
  const tabs = [
    { href: `${base}/rendicontazione`, label: 'Rendicontazione', icon: Coins, on: true },
    { href: `${base}/bacheca`, label: 'Avvisi', icon: Bell },
    { href: `${base}/calendario`, label: 'Assemblee', icon: CalendarDays },
    { href: `${base}/interventi`, label: 'Interventi', icon: Wrench },
    { href: `${base}/archivio`, label: 'Documenti', icon: Folder },
  ]

  return (
    <div className="rp2">
      <header className="rp2-hero">
        <svg className="rp2-wave" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120C80 70 150 160 240 120s120-80 160-50V0H0z" fill="rgba(255,255,255,0.05)" />
          <path d="M0 200C90 150 170 210 260 170s110-70 140-40V220H0z" fill="rgba(255,255,255,0.06)" />
        </svg>
        <div className="rp2-inner">
          <Link href={base} className="rp2-back"><ChevronLeft size={18} aria-hidden="true" />Torna al condominio</Link>
          <div className="rp2-building">
            <span className="rp2-thumb" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="100%" height="100%">
                <rect width="64" height="64" fill="#BFE0E0" />
                <rect x="10" y="14" width="30" height="50" fill="#F4F8F8" />
                <rect x="40" y="26" width="16" height="38" fill="#DCEBEB" />
                {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={14 + c * 9} y={19 + r * 11} width="6" height="7" rx="1" fill={r === 1 && c === 2 ? '#E8651A' : '#7FB8BC'} />))}
                <rect x="44" y="31" width="8" height="6" rx="1" fill="#7FB8BC" /><rect x="44" y="42" width="8" height="6" rx="1" fill="#7FB8BC" />
              </svg>
            </span>
            <span style={{ minWidth: 0 }}>
              <small>Condominio</small>
              <strong>{address}</strong>
              {building.city && <small>{building.city}</small>}
            </span>
          </div>
          <h1>Rendicontazione</h1>
          <p>Quote, spese e pagamenti del tuo condominio</p>
        </div>
      </header>

      <div className="rp2-body">
        <nav className="rp2-tabs" aria-label="Sezioni del condominio">
          {tabs.map((t) => (
            <Link key={t.label} href={t.href} className={t.on ? 'is-on' : ''} aria-current={t.on ? 'page' : undefined}>
              <t.icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>

        <Rendicontazione building={building} />

        {isCondoAdmin && (
          <Link href={`${base}/contabilita`} className="rc-admin-link">
            <span><strong>Contabilità del condominio</strong><small>Preventivo, rate, bonifici da confermare, estratto conto</small></span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
      </div>
    </div>
  )
}
