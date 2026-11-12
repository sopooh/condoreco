'use client'

import { useEffect, useRef, useState } from 'react'
import { Copy, EyeOff, Pencil, Share, TextSelect, X } from 'lucide-react'

// Menu del messaggio: tasto destro (desktop) o pressione lunga (mobile).
// Copia, Modifica (solo i propri messaggi di testo), Seleziona testo,
// Condividi, Nascondi (moderazione dell'amministratore).

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE = 10

// Gestori da mettere sulla bolla. open(x, y) apre il menu in quel punto.
export function useMessagePress(open) {
  const timer = useRef(null)
  const start = useRef(null)
  const fired = useRef(false)

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

  return {
    onContextMenu: (e) => { e.preventDefault(); clear(); open(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()) },
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return // col mouse si usa il tasto destro
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY, el: e.currentTarget }
      clear()
      timer.current = setTimeout(() => {
        fired.current = true
        try { navigator.vibrate?.(10) } catch { /* non supportato */ }
        open(start.current.x, start.current.y, start.current.el?.getBoundingClientRect())
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      if (!start.current) return
      if (Math.abs(e.clientX - start.current.x) > MOVE_TOLERANCE || Math.abs(e.clientY - start.current.y) > MOVE_TOLERANCE) clear()
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    // dopo una pressione lunga il tocco non deve aprire link o pulsanti dentro la bolla
    onClickCapture: (e) => { if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false } },
  }
}

function when(iso) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diff === 0) return `Oggi, ${t}`
  if (diff === 1) return `Ieri, ${t}`
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })}, ${t}`
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fallback sotto */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    return true
  } catch { return false }
}

// Testo "copiabile" di un messaggio, anche per allegati e card
export function messageText(m) {
  if (m.kind === 'text' || !m.kind) return m.content || ''
  const name = m.attachment?.name
  return [m.content, name && name !== m.content ? name : null].filter(Boolean).join('\n')
}

export default function MessageMenu({ menu, onClose, onEdit, onSelect, onHide, toast }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const { m, x, y, rect, mine, canEdit, canHide } = menu
  const text = messageText(m)

  // posizione: vicino al punto toccato, sempre dentro lo schermo
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    // sotto la bolla, allineato al suo lato; se non c'è spazio, sopra
    const anchor = rect || { left: x, right: x, top: y, bottom: y }
    const left = Math.min(Math.max(12, mine ? anchor.right - r.width : anchor.left), vw - r.width - 12)
    let top = anchor.bottom + 8
    if (top + r.height > vh - 12) top = anchor.top - r.height - 8
    if (top < 12) top = Math.max(12, Math.min(y, vh - r.height - 12))
    setPos({ left, top })
  }, [x, y, rect, mine])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const onScroll = () => onClose()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll) }
  }, [onClose])

  const items = [
    text && { key: 'copy', icon: Copy, label: 'Copia', run: async () => { toast(await copyText(text) ? 'Copiato' : 'Non riesco a copiare') } },
    canEdit && { key: 'edit', icon: Pencil, label: 'Modifica', run: () => onEdit(m) },
    text && { key: 'select', icon: TextSelect, label: 'Seleziona testo', run: () => onSelect(m) },
    text && { key: 'share', icon: Share, label: 'Condividi', run: async () => {
      if (navigator.share) { try { await navigator.share({ text }) } catch { /* annullato */ } }
      else toast(await copyText(text) ? 'Copiato, incollalo dove vuoi' : 'Non riesco a condividere')
    } },
    canHide && { key: 'hide', icon: EyeOff, label: 'Nascondi a tutti', danger: true, run: () => onHide(m.id) },
  ].filter(Boolean)

  return (
    <div className="msgm-wrap" role="presentation" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div ref={ref} className="msgm" role="menu" aria-label="Azioni sul messaggio" onClick={(e) => e.stopPropagation()}
        style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}>
        <div className="msgm-when">{when(m.created_at)}{m.edited_at ? ' · modificato' : ''}</div>
        {items.map((it) => (
          <button key={it.key} type="button" role="menuitem" className={it.danger ? 'is-danger' : ''} autoFocus={it === items[0]}
            onClick={() => { onClose(); it.run() }}>
            <it.icon size={20} strokeWidth={1.9} aria-hidden="true" />{it.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function EditMessageSheet({ m, onClose, onSave }) {
  const [v, setV] = useState(m.content || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const changed = v.trim() && v.trim() !== (m.content || '').trim()
  async function save() {
    setBusy(true); setErr(null)
    const r = await onSave(m.id, v)
    setBusy(false)
    if (r?.error) setErr(r.error)
    else onClose()
  }
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Modifica messaggio">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div><div className="dir-sheet-title">Modifica messaggio</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        <textarea className="msgm-textarea" value={v} onChange={(e) => setV(e.target.value)} maxLength={2000} rows={4} autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && changed && !busy) save() }} />
        <p className="msgm-note">Gli altri vedranno l&apos;indicazione &quot;modificato&quot; accanto all&apos;orario.</p>
        {err && <p className="auth-err">{err}</p>}
        <button type="button" className="ep-save" disabled={!changed || busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva'}</button>
      </div>
    </div>
  )
}

export function SelectTextSheet({ m, onClose, toast }) {
  const ref = useRef(null)
  const text = messageText(m)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges(); sel?.addRange(range)
  }, [])
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Seleziona testo">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div><div className="dir-sheet-title">Seleziona testo</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        <div ref={ref} className="msgm-select">{text}</div>
        <button type="button" className="ep-save" onClick={async () => { toast(await copyText(text) ? 'Copiato' : 'Non riesco a copiare'); onClose() }}>Copia tutto</button>
      </div>
    </div>
  )
}
