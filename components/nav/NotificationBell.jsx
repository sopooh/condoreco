'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

// Campanella in navbar: porta a /notifiche, pallino arancione con il numero
// di avvisi non letti.
export default function NotificationBell() {
  const { unread } = useNotifications({ limit: 30 })
  return (
    <Link href="/notifiche" aria-label={unread ? `Notifiche, ${unread} non lette` : 'Notifiche'} className="nav-bell">
      <Bell size={24} strokeWidth={1.9} aria-hidden="true" />
      {unread > 0 && <span className="nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}
