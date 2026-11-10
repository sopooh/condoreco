'use client'

import Link from 'next/link'
import { Megaphone, FolderOpen, Users } from 'lucide-react'

// Schede in cima a Bacheca / Archivio documenti / Fornitori
export default function BachecaTabs({ buildingId, active }) {
  const base = `/edificio/${buildingId}/condominio`
  const tabs = [
    { id: 'bacheca', label: 'Bacheca', href: `${base}/bacheca`, icon: Megaphone },
    { id: 'archivio', label: 'Archivio documenti', href: `${base}/archivio`, icon: FolderOpen },
    { id: 'fornitori', label: 'Fornitori', href: `${base}/interventi#fornitori`, icon: Users },
  ]
  return (
    <nav aria-label="Sezioni della bacheca" className="bacheca-tabs">
      {tabs.map(({ id, label, href, icon: Icon }) => {
        const on = active === id
        return (
          <Link key={id} href={href} aria-current={on ? 'page' : undefined} className={on ? 'is-on' : ''}>
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
