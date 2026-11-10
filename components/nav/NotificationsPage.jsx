'use client'

import Link from 'next/link'
import { useNotifications } from '@/hooks/useNotifications'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { NoticeIcon } from '@/components/condo/NeighbourNotice'
import { relTime } from '@/lib/relTime'

export default function NotificationsPage() {
  const session = useSession()
  const ready = useSessionReady()
  const { items, unread, loading, markRead, markAllRead } = useNotifications({ limit: 100 })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Notifiche</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>Gli avvisi dei tuoi vicini di condominio.</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} style={{ minHeight: 0, border: 'none', background: 'none', color: 'var(--teal)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
            Segna tutte lette
          </button>
        )}
      </div>

      {!ready || (session && loading) ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento...</p>
      ) : !session ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Accedi dal menu in alto per vedere le tue notifiche.</p>
      ) : items.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nessuna notifica</div>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Qui arrivano gli avvisi dei vicini per il tuo piano o per tutto il palazzo.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          {items.map((n, i) => (
            <Link key={n.id} href={n.link || '#'} onClick={() => markRead(n.id)} style={{
              display: 'flex', gap: 12, padding: '14px 16px', borderTop: i ? '1px solid var(--border)' : 'none',
              background: n.read_at ? 'var(--white)' : '#FFF6EF', color: 'inherit',
            }}>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: n.read_at ? 'var(--teal-lt)' : '#FDE3D0', color: n.read_at ? 'var(--teal-dk)' : '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <NoticeIcon name="megaphone" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: n.read_at ? 600 : 800 }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{relTime(n.created_at)}</span>
                </span>
                {n.body && <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.4 }}>{n.body}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
