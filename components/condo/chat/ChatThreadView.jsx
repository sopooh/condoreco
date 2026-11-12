'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import Composer from '@/components/condo/chat/Composer'
import MessageBody from '@/components/condo/chat/MessageBody'
import MessageMenu, { EditMessageSheet, SelectTextSheet, useMessagePress } from '@/components/condo/chat/MessageMenu'

const time = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Ieri'
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Vista di una conversazione: intestazione, bolle dei messaggi, campo di scrittura.
// composer: { buildingId, threadId, isGroup, onAction }; ctx: dati per sondaggi, eventi, contatti
export default function ChatThreadView({ title, subtitle, avatar, headerRight, messages, names, userId, onSend, onEdit, onBack, onHide, banner, emptyText, composer = {}, ctx }) {
  const endRef = useRef(null)
  const [menu, setMenu] = useState(null) // { m, x, y, mine, canEdit, canHide }
  const [editing, setEditing] = useState(null)
  const [selecting, setSelecting] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimer = useRef(null)
  const toast = useCallback((t) => {
    setToastMsg(t)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 1600)
  }, [])
  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 58px)', background: 'var(--bg)' }}>
      <header style={{ position: 'sticky', top: 58, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onBack} aria-label="Torna alle chat" style={{ minHeight: 0, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
        </button>
        {avatar}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
        {headerRight}
      </header>

      {banner}

      <div style={{ flex: 1, padding: '14px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-3)', textAlign: 'center', margin: '28px 16px' }}>{emptyText || 'Ancora nessun messaggio. Scrivi il primo.'}</p>
        )}
        {messages.map((m, idx) => {
          const mine = m.created_by === userId
          const prev = messages[idx - 1]
          const showDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const showName = !mine && (!prev || prev.created_by !== m.created_by || showDay)
          const who = names[m.created_by]?.display_name || 'Residente'
          return (
            <div key={m.id}>
              {showDay && (
                <div style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px', textTransform: 'capitalize' }}>{dayLabel(m.created_at)}</span>
                </div>
              )}
              <Bubble m={m} mine={mine} showName={showName} who={who} ctx={{ ...ctx, userId }}
                active={menu?.m.id === m.id}
                onOpen={(x, y, rect) => setMenu({ m, x, y, rect, mine, canEdit: mine && !!onEdit && (m.kind || 'text') === 'text', canHide: !!onHide && !mine })} />
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {menu && <MessageMenu menu={menu} onClose={closeMenu} onEdit={setEditing} onSelect={setSelecting} onHide={(id) => onHide?.(id)} toast={toast} />}
      {editing && <EditMessageSheet m={editing} onClose={() => setEditing(null)} onSave={onEdit} />}
      {selecting && <SelectTextSheet m={selecting} onClose={() => setSelecting(null)} toast={toast} />}
      {toastMsg && <div className="msgm-toast" role="status">{toastMsg}</div>}

      <Composer onSend={onSend} buildingId={composer.buildingId} threadId={composer.threadId} isGroup={composer.isGroup} onAction={composer.onAction} />
    </div>
  )
}

function Bubble({ m, mine, showName, who, ctx, active, onOpen }) {
  const press = useMessagePress(onOpen)
  const media = ['image', 'video'].includes(m.kind)
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: showName ? 6 : 0 }}>
      <div {...press} className={`chat-bubble kind-${m.kind || 'text'}${active ? ' is-pressed' : ''}`} style={{
        maxWidth: '80%', padding: media ? 4 : '8px 12px 6px', borderRadius: 16,
        borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4,
        background: mine ? 'var(--teal)' : 'var(--white)', color: mine ? '#fff' : 'var(--text)',
        border: mine ? 'none' : '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        {showName && <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-dk)', margin: media ? '4px 8px 4px' : '0 0 2px' }}>{who}</div>}
        <MessageBody m={m} mine={mine} ctx={ctx} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2, padding: media ? '0 8px 2px' : 0 }}>
          {m.edited_at && <span style={{ fontSize: 11, opacity: 0.7, fontStyle: 'italic' }}>modificato</span>}
          <span style={{ fontSize: 11, opacity: 0.7 }}>{time(m.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
