'use client'

import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useNeighbourNotices } from '@/hooks/useNeighbourNotices'
import { MyFloorCard, NoticeForm, NoticeIcon } from '@/components/condo/NeighbourNotice'
import { Sheet } from '@/components/condo/InterventionsPage'
import { relTime } from '@/lib/relTime'

// Bacheca: avvisi dei vicini arrivati a me (ultimi 7 giorni) + il mio piano
// + pulsante per mandarne uno.
export default function NoticesForMe({ building }) {
  const notices = useNeighbourNotices(building.id)
  const { items, markRead } = useNotifications({ limit: 50 })
  const [composing, setComposing] = useState(false)
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000)
  const mine = items.filter((n) => n.building_id === building.id && new Date(n.created_at).getTime() > weekAgo)
  const unreadIds = mine.filter((n) => !n.read_at).map((n) => n.id).join(',')

  // aperta la bacheca, gli avvisi visibili qui contano come letti
  useEffect(() => {
    if (unreadIds) {
      const t = setTimeout(() => markRead(unreadIds.split(',')), 1500)
      return () => clearTimeout(t)
    }
  }, [unreadIds]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Avvisi dai vicini</div>
        <button type="button" onClick={() => setComposing(true)} style={{
          minHeight: 0, height: 38, padding: '0 14px', borderRadius: 999, border: '1.5px solid var(--teal)',
          background: 'var(--white)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ Avvisa i vicini</button>
      </div>

      {mine.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Nessun avviso per te negli ultimi 7 giorni.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mine.map((n) => (
            <div key={n.id} style={{
              display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 14,
              border: `1px solid ${n.read_at ? 'var(--border)' : 'rgba(232,101,26,0.35)'}`, background: n.read_at ? 'var(--white)' : '#FFF6EF',
            }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: n.read_at ? '#EEF3F3' : '#FDE3D0', color: n.read_at ? 'var(--teal)' : '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <NoticeIcon name="megaphone" size={20} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{relTime(n.created_at)}</div>
                </div>
                {n.body && <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <MyFloorCard building={building} myFloor={notices.myFloor} saveFloor={notices.saveFloor} />

      {composing && (
        <Sheet onClose={() => setComposing(false)} title="Avviso ai vicini" subtitle="Arriva solo ai residenti verificati">
          <NoticeForm building={building} {...notices} onBack={() => setComposing(false)} onDone={() => setComposing(false)} />
        </Sheet>
      )}
    </section>
  )
}

