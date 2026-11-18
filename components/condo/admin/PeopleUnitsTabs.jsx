import Link from 'next/link'
import { Home, Users } from 'lucide-react'

// Tab di navigazione tra Persone e Unità: sono due pagine separate
// (/persone e /unita) con la stessa barra in cima.
export default function PeopleUnitsTabs({ base, active, unitsLabel = 'Unità e millesimi' }) {
  const tabs = [
    ['persone', 'Persone', Users, `${base}/persone`],
    ['unita', unitsLabel, Home, `${base}/unita`],
  ]
  return (
    <nav className="acc-tabs" aria-label="Persone e unità">
      {tabs.map(([k, l, Icon, href]) => (
        <Link key={k} href={href} className={active === k ? 'is-on' : ''} aria-current={active === k ? 'page' : undefined}>
          <Icon size={16} aria-hidden="true" />{l}
        </Link>
      ))}
    </nav>
  )
}
