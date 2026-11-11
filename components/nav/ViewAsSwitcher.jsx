'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Briefcase, Eye, House, Wrench, X } from 'lucide-react'
import { VIEW_AS, useViewAs } from '@/hooks/useViewAs'

const ICON = { recoer: House, amministratore: Briefcase, recofixer: Wrench }
// pagina di partenza di ogni vista quando si cambia
const HOME = { recoer: '/profilo', amministratore: '/profilo', recofixer: '/fornitore' }

function useSwitch() {
  const v = useViewAs()
  const router = useRouter()
  const pathname = usePathname()
  const pick = (id) => {
    v.setViewAs(id)
    const leavingSupplier = pathname?.startsWith('/fornitore') && id !== 'recofixer'
    if (id === 'recofixer' || leavingSupplier || pathname === '/admin') router.push(HOME[id])
  }
  return { ...v, pick }
}

// Selettore a tre voci: profilo admin e pannello /admin
export function ViewAsPicker({ current, style }) {
  const { canSwitch, pick, viewAs } = useSwitch()
  if (!canSwitch) return null
  const active = current || viewAs || 'amministratore'
  return (
    <div className="vas-picker" style={style}>
      <span className="vas-label"><Eye size={15} aria-hidden="true" />Vedi il sito come</span>
      <div className="cadm-switch vas-seg" role="tablist" aria-label="Vedi il sito come">
        {Object.entries(VIEW_AS).map(([id, c]) => {
          const I = ICON[id]
          return (
            <button key={id} type="button" role="tab" aria-selected={active === id} className={active === id ? 'is-on' : ''} onClick={() => pick(id)}>
              <I size={16} aria-hidden="true" />{c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Pillola fissa in basso: compare su tutte le pagine mentre si simula una vista
export default function ViewAsBadge() {
  const { canSwitch, viewAs, pick, setViewAs } = useSwitch()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  if (!canSwitch || !viewAs) return null
  const I = ICON[viewAs]
  return (
    <div className="vas-float">
      {open && (
        <div className="vas-menu" role="menu">
          {Object.entries(VIEW_AS).map(([id, c]) => {
            const J = ICON[id]
            return (
              <button key={id} type="button" role="menuitemradio" aria-checked={viewAs === id} className={viewAs === id ? 'is-on' : ''} onClick={() => { setOpen(false); pick(id) }}>
                <J size={17} aria-hidden="true" /><span><strong>{c.label}</strong><small>{c.sub}</small></span>
              </button>
            )
          })}
          <button type="button" className="vas-exit" onClick={() => { setOpen(false); setViewAs(null); router.push('/admin') }}>
            <X size={17} aria-hidden="true" /><span><strong>Esci dall&apos;anteprima</strong><small>Torna al pannello admin</small></span>
          </button>
        </div>
      )}
      <button type="button" className="vas-pill" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Eye size={16} aria-hidden="true" />Vista: <I size={15} aria-hidden="true" /><strong>{VIEW_AS[viewAs].label}</strong>
      </button>
    </div>
  )
}
