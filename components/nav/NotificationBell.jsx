'use client'

import Link from 'next/link'
import { useNotifications } from '@/hooks/useNotifications'

// Campanella in navbar: porta a /notifiche, pallino arancione con il numero
// di avvisi non letti.
export default function NotificationBell() {
  const { unread } = useNotifications({ limit: 30 })
  return (
    <Link href="/notifiche" aria-label={unread ? `Notifiche, ${unread} non lette` : 'Notifiche'} className="nav-bell">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
        <path d="M10 19a2 2 0 004 0" />
      </svg>
      {unread > 0 && <span className="nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}
