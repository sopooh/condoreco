'use client'

import { useState } from 'react'
import Link from 'next/link'
import { REPORT_CATEGORIES, reportCategoryLabel } from '@/lib/reviewOptions'
import { isTicketOpen } from '@/hooks/useTickets'

// "Bacheca urgente del mese": ticket del condominio con stato Aperto/Chiuso.
// Schede Aperti / Chiusi, tocco su un ticket per vedere la descrizione e,
// per chi l'ha aperto o per l'admin del condominio, chiuderlo o riaprirlo.

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

const CATEGORY_TONE = {
  maintenance: '#D97706', elevator: '#D97706', heating: '#D97706', infiltration: '#2F80ED',
  security: '#DC2626', noise: '#7C3AED', cleaning: '#16A34A', waste: '#16A34A', pests: '#16A34A',
  common_areas: '#0D676F', admin: '#0D676F', other: '#6B7280',
}
const tone = (c) => CATEGORY_TONE[c] || CATEGORY_TONE.other

const shortDate = (iso) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export default function TicketBoardCard({ tickets, userId, isCondoAdmin, onOpenTicket, onSetOpen, calendarHref }) {
  const [tab, setTab] = useState('open')
  const [expanded, setExpanded] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const open = tickets.filter(isTicketOpen)
  const closed = tickets.filter((t) => !isTicketOpen(t))
  const list = tab === 'open' ? open : closed
  const now = new Date()

  async function toggle(t) {
    setBusy(t.id)
    const { error } = await onSetOpen(t.id, !isTicketOpen(t))
    setError(error)
    setBusy(null)
    if (!error) setExpanded(null)
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.2px' }}>Bacheca urgente del mese</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, textTransform: 'capitalize' }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()}
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} style={smallPrimary}>+ Apri ticket</button>
      </div>

      {/* schede Aperti / Chiusi */}
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: '#F1F3F4', margin: '16px 0 12px' }}>
        <Tab active={tab === 'open'} onClick={() => { setTab('open'); setExpanded(null) }} label="Aperti" count={open.length} dot="#E8651A" />
        <Tab active={tab === 'closed'} onClick={() => { setTab('closed'); setExpanded(null) }} label="Chiusi" count={closed.length} dot="#16A34A" />
      </div>

      {list.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '6px 2px 4px' }}>
          {tab === 'open' ? 'Nessun ticket aperto. Tutto in ordine.' : 'Nessun ticket chiuso questo mese.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((t) => {
            const isOpen = isTicketOpen(t)
            const mine = t.user_id === userId
            const canEdit = mine || isCondoAdmin
            const isExpanded = expanded === t.id
            const fromPrevMonth = new Date(t.created_at) < new Date(now.getFullYear(), now.getMonth(), 1)
            return (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 14, background: isExpanded ? '#FAFBFB' : 'var(--white)' }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : t.id)}
                  aria-expanded={isExpanded}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', minHeight: 0 }}
                >
                  <span style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${tone(t.category)}1A`, color: tone(t.category),
                  }}>
                    <AlertIcon />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: isOpen ? 'none' : 'line-through', textDecorationColor: 'var(--text-4)',
                    }}>
                      {t.title || reportCategoryLabel(t.category)}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {reportCategoryLabel(t.category)} · {shortDate(t.created_at)}{mine ? ' · aperto da te' : ''}
                      {fromPrevMonth && isOpen ? ' · dal mese scorso' : ''}
                    </span>
                  </span>
                  <StatusPill open={isOpen} />
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 12px 12px 64px' }}>
                    {t.description
                      ? <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{t.description}</p>
                      : <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 10px' }}>Nessuna descrizione.</p>}
                    {!isOpen && t.resolved_at && (
                      <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '0 0 10px' }}>Chiuso il {shortDate(t.resolved_at)}</p>
                    )}
                    {canEdit && (
                      <button onClick={() => toggle(t)} disabled={busy === t.id} style={isOpen ? closeBtn : reopenBtn}>
                        {busy === t.id ? 'Aggiornamento...' : isOpen ? 'Segna come chiuso' : 'Riapri ticket'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: '#B42318', margin: '10px 0 0' }}>{error}</p>}

      {calendarHref && (
        <Link href={calendarHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 14, fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>
          Calendario del condominio ›
        </Link>
      )}

      {formOpen && <TicketForm onClose={() => setFormOpen(false)} onSubmit={onOpenTicket} onDone={() => { setFormOpen(false); setTab('open') }} />}
    </div>
  )
}

function Tab({ active, onClick, label, count, dot }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} style={{
      height: 40, minHeight: 0, borderRadius: 9, border: 'none', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: active ? 'var(--white)' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      fontSize: 14, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-3)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      {label}
      <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: active ? '#F1F3F4' : 'rgba(0,0,0,0.05)', color: 'var(--text-2)' }}>{count}</span>
    </button>
  )
}

function StatusPill({ open }) {
  return (
    <span style={{
      flexShrink: 0, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: open ? '#FDEBDD' : '#E3F5E9', color: open ? '#B4510F' : '#15803D',
    }}>
      {open ? 'Aperto' : 'Chiuso'}
    </span>
  )
}

function TicketForm({ onClose, onSubmit, onDone }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('maintenance')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const canSave = title.trim().length > 2 && !saving

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,41,38,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--white)', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0',
        padding: '10px 20px calc(20px + env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0 auto' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Apri un ticket</div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 36, height: 36, minHeight: 0, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
        </div>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Luce delle scale rotta al 3° piano" style={{ ...field, fontWeight: 600 }} />
        <div>
          <div style={fieldLabel}>Categoria</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REPORT_CATEGORIES.map((c) => {
              const on = category === c.value
              return (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)} style={{
                  minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)',
                }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrivi il problema (dove, da quando, cosa serve)" style={{ ...field, minHeight: 90, resize: 'vertical' }} />
        <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
          Categoria e stato del ticket compaiono anche nelle statistiche pubbliche delle segnalazioni dell&apos;edificio.
        </p>
        {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{error}</p>}
        <button
          disabled={!canSave}
          onClick={async () => {
            setSaving(true)
            const { error } = await onSubmit({ title, category, description })
            setSaving(false)
            if (error) setError(error)
            else onDone()
          }}
          style={{ ...smallPrimary, height: 48, fontSize: 15, opacity: canSave ? 1 : 0.5 }}
        >
          {saving ? 'Invio...' : 'Apri ticket'}
        </button>
      </div>
    </div>
  )
}

const smallPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40, minHeight: 0, padding: '0 14px',
  borderRadius: 12, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0,
}
const closeBtn = { ...smallPrimary, height: 40 }
const reopenBtn = { ...smallPrimary, height: 40, background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }
const fieldLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9L2.4 17.6A2 2 0 004.1 20.6h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}
