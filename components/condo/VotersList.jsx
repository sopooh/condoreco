'use client'

import { useEffect, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Decisioni con voto palese: chi ha votato favorevole e chi contrario.
export default function VotersList({ voters }) {
  const [names, setNames] = useState({})
  const ids = voters.map((v) => v.userId).sort().join(',')

  useEffect(() => {
    if (!ids) return
    let cancelled = false
    createClient().from('profiles').select('id, display_name').in('id', ids.split(','))
      .then(({ data }) => { if (!cancelled) setNames(Object.fromEntries((data || []).map((p) => [p.id, p.display_name]))) })
    return () => { cancelled = true }
  }, [ids])

  const group = (yes) => voters.filter((v) => v.vote === yes).map((v) => names[v.userId] || 'Un residente')
  const cols = [
    { yes: true, t: 'Favorevoli', icon: ThumbsUp, color: 'var(--teal-dk)' },
    { yes: false, t: 'Contrari', icon: ThumbsDown, color: '#B42318' },
  ]

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Chi ha votato</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {cols.map(({ yes, t, icon: Icon, color }) => {
          const list = group(yes)
          return (
            <div key={t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color, marginBottom: 8 }}>
                <Icon size={15} strokeWidth={2} aria-hidden="true" />{t} ({list.length})
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-4)' }}>Nessuno</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {list.map((n, i) => <li key={i} style={{ fontSize: 14, color: 'var(--text)' }}>{n}</li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
