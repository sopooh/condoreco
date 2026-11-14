'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Camera, CalendarDays, FileText, Headphones, Images, Mic, Plus, Send, Trash2, UserRound, X } from 'lucide-react'
import { extOf, formatSize, kindFromMime, labelFor, MAX_CHAT_FILE, uploadChatFile } from '@/lib/chatFiles'
import posthog from 'posthog-js'

const nowMs = () => Date.now()

const MENU = [
  { id: 'file', label: 'Documento', icon: FileText, color: '#7C5CFC', accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.odt,.ods,application/pdf' },
  { id: 'media', label: 'Foto e video', icon: Images, color: '#1D7AF2', accept: 'image/*,video/*', multiple: true },
  { id: 'camera', label: 'Fotocamera', icon: Camera, color: '#F0436A', accept: 'image/*', capture: 'environment' },
  { id: 'audio', label: 'Audio', icon: Headphones, color: '#F2702C', accept: 'audio/*' },
  { id: 'contact', label: 'Contatto', icon: UserRound, color: '#2B8FD9' },
  { id: 'poll', label: 'Sondaggio', icon: BarChart3, color: '#E9B528', groupOnly: true },
  { id: 'event', label: 'Evento', icon: CalendarDays, color: '#E8457C', groupOnly: true },
]

// Campo di scrittura della chat.
// onSend(text, extra?) con extra = { kind, attachment, ref_id, meta }
// onAction('contact' | 'poll' | 'event') apre i fogli gestiti dalla pagina.
export default function Composer({ onSend, onAction, buildingId, threadId, isGroup }) {
  const [draft, setDraft] = useState('')
  const [menu, setMenu] = useState(false)
  const [menuMax, setMenuMax] = useState(null)
  const [pending, setPending] = useState(null) // { files: File[] }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const inputs = useRef({})
  const menuRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [menu])

  // textarea che cresce con il testo
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 132)}px`
  }, [draft])

  async function sendText(e) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true); setErr(null)
    const { error } = await onSend(text)
    setBusy(false)
    if (error) setErr(error)
    else {
      posthog.capture('chat_message_sent')
      setDraft('')
    }
  }

  function pick(item) {
    setMenu(false)
    if (item.accept) inputs.current[item.id]?.click()
    else onAction?.(item.id)
  }

  function onFiles(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    const tooBig = files.find((f) => f.size > MAX_CHAT_FILE * 4) // le foto vengono ridotte, i 25 MB si controllano dopo
    if (tooBig) { setErr(`"${tooBig.name}" è troppo grande (massimo 25 MB).`); return }
    setErr(null)
    setPending({ files })
  }

  async function sendFiles(caption) {
    setBusy(true); setErr(null)
    const files = pending.files
    for (let i = 0; i < files.length; i++) {
      const up = await uploadChatFile({ buildingId, threadId, file: files[i] })
      if (up.error) { setErr(up.error); setBusy(false); return }
      const text = (i === files.length - 1 && caption.trim()) || labelFor(up.kind, up.attachment.name)
      const { error } = await onSend(text, { kind: up.kind, attachment: up.attachment })
      if (error) { setErr(error); setBusy(false); return }
      posthog.capture('chat_attachment_sent', { attachment_type: up.kind })
    }
    setBusy(false)
    setPending(null)
  }

  const items = MENU.filter((m) => isGroup || !m.groupOnly)
  const hasText = draft.trim().length > 0

  return (
    <div className="chat-composer">
      {err && <p className="chat-composer-err" role="alert">{err}<button type="button" onClick={() => setErr(null)} aria-label="Chiudi"><X size={14} /></button></p>}
      <Recorder disabled={busy} buildingId={buildingId} threadId={threadId} onSend={onSend} onError={setErr}>
        {(mic) => (
          <form onSubmit={sendText} className="chat-composer-row">
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button type="button" className={`chat-plus${menu ? ' is-open' : ''}`}
                onClick={(e) => {
                  // spazio libero tra la barra del sito (58px) e il pulsante: il menu non ci finisce sotto
                  setMenuMax(Math.max(160, e.currentTarget.getBoundingClientRect().top - 58 - 18))
                  setMenu((v) => !v)
                }}
                aria-label="Allega" aria-expanded={menu} aria-haspopup="menu">
                <Plus size={26} strokeWidth={2} aria-hidden="true" />
              </button>
              {menu && (
                <div className="chat-menu" role="menu" style={menuMax ? { maxHeight: menuMax } : undefined}>
                  {items.map((it) => (
                    <button key={it.id} type="button" role="menuitem" onClick={() => pick(it)}>
                      <it.icon size={22} strokeWidth={2} color={it.color} aria-hidden="true" />
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea ref={taRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={2000}
              placeholder="Scrivi un messaggio…" aria-label="Messaggio"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) sendText(e) }} />

            {hasText ? (
              <button type="submit" className="chat-send" aria-label="Invia messaggio" disabled={busy}>
                <Send size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button type="button" className="chat-icon" aria-label="Scatta una foto" onClick={() => inputs.current.camera?.click()}>
                  <Camera size={24} strokeWidth={1.9} aria-hidden="true" />
                </button>
                {mic}
              </>
            )}
          </form>
        )}
      </Recorder>

      {MENU.filter((m) => m.accept).map((m) => (
        <input key={m.id} ref={(el) => { inputs.current[m.id] = el }} type="file" hidden accept={m.accept}
          multiple={m.multiple} capture={m.capture} onChange={onFiles} />
      ))}

      {pending && <SendPreview files={pending.files} busy={busy} onCancel={() => setPending(null)} onSend={sendFiles} />}
    </div>
  )
}

/* Anteprima prima dell'invio, con didascalia */
function SendPreview({ files, busy, onCancel, onSend }) {
  const [caption, setCaption] = useState('')
  const urls = useMemo(() => files.map((f) => (/^(image|video)\//.test(f.type) ? URL.createObjectURL(f) : null)), [files])
  useEffect(() => () => urls.forEach((x) => x && URL.revokeObjectURL(x)), [urls])
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Invia allegato">
      <div className="dir-sheet-backdrop" onClick={busy ? undefined : onCancel} />
      <div className="dir-sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="dir-sheet-head">
          <div className="dir-sheet-title">{files.length > 1 ? `Invia ${files.length} file` : 'Invia allegato'}</div>
          <button type="button" className="dir-sheet-close" onClick={onCancel} disabled={busy} aria-label="Annulla"><X size={22} /></button>
        </div>
        <div className="chat-preview-grid">
          {files.map((f, i) => {
            const k = kindFromMime(f.type, f.name)
            return (
              <div key={i} className="chat-preview-item">
                {k === 'image' && urls[i] ? <img src={urls[i]} alt="" />
                  : k === 'video' && urls[i] ? <video src={urls[i]} muted playsInline />
                  : (
                    <div className="chat-preview-file">
                      <span className="chat-file-ico" style={{ background: extOf(f.name) === 'pdf' ? '#D93025' : 'var(--teal)' }}><span>{(extOf(f.name) || 'file').slice(0, 4).toUpperCase()}</span></span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', overflowWrap: 'anywhere', fontSize: 14.5 }}>{f.name}</strong>
                        <small style={{ color: 'var(--text-3)' }}>{formatSize(f.size)}</small>
                      </span>
                    </div>
                  )}
              </div>
            )
          })}
        </div>
        <label className="ep-field" style={{ marginTop: 14 }}>
          <span className="ep-input"><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Aggiungi un messaggio (facoltativo)" maxLength={2000} /></span>
        </label>
        <button type="button" className="ep-save" disabled={busy} onClick={() => onSend(caption)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Send size={18} aria-hidden="true" />{busy ? 'Invio in corso…' : 'Invia'}
        </button>
      </div>
    </div>
  )
}

/* Messaggio vocale: tocca il microfono, parla, tocca invia (o il cestino per annullare) */
function Recorder({ children, disabled, buildingId, threadId, onSend, onError }) {
  const [rec, setRec] = useState(null) // { start }
  const [secs, setSecs] = useState(0)
  const [sending, setSending] = useState(false)
  const mr = useRef(null)
  const chunks = useRef([])
  const cancelled = useRef(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!rec) return
    const t = setInterval(() => setSecs(Math.floor((nowMs() - rec.start) / 1000)), 250)
    return () => clearInterval(t)
  }, [rec])
  useEffect(() => () => mr.current?.stream?.getTracks().forEach((t) => t.stop()), [])

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Questo browser non registra audio. Usa Allega > Audio per inviare un file.'); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunks.current = []; cancelled.current = false
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => finish(r)
      r.start()
      mr.current = r
      startedAt.current = nowMs()
      setSecs(0); setRec({ start: startedAt.current })
    } catch {
      onError('Serve il permesso del microfono per registrare un vocale.')
    }
  }

  async function finish(r) {
    r.stream.getTracks().forEach((t) => t.stop())
    const duration = (nowMs() - startedAt.current) / 1000
    setRec(null)
    if (cancelled.current || !chunks.current.length) return
    const mime = r.mimeType || 'audio/webm'
    const ext = mime.includes('mp4') ? 'm4a' : 'webm'
    const file = new File(chunks.current, `vocale-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`, { type: mime.split(';')[0] })
    setSending(true)
    const up = await uploadChatFile({ buildingId, threadId, file })
    if (up.error) { onError(up.error); setSending(false); return }
    const { error } = await onSend('Messaggio vocale', { kind: 'audio', attachment: { ...up.attachment, duration: Math.round(duration) } })
    setSending(false)
    if (error) onError(error)
    else posthog.capture('voice_message_sent')
  }

  const stop = (cancel) => { cancelled.current = cancel; mr.current?.state === 'recording' && mr.current.stop() }

  if (rec || sending) {
    return (
      <div className="chat-composer-row chat-rec">
        <button type="button" className="chat-icon" aria-label="Annulla vocale" onClick={() => stop(true)} disabled={sending}><Trash2 size={22} aria-hidden="true" /></button>
        <div className="chat-rec-bar"><span className="chat-rec-dot" />{sending ? 'Invio del vocale…' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}</div>
        <button type="button" className="chat-send" aria-label="Invia vocale" onClick={() => stop(false)} disabled={sending}><Send size={20} aria-hidden="true" /></button>
      </div>
    )
  }
  return children(
    <button type="button" className="chat-mic" aria-label="Registra un messaggio vocale" onClick={start} disabled={disabled}>
      <Mic size={22} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
