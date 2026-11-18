'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, AlertTriangle } from 'lucide-react'

// Registra l'assemblea a pezzi da 10 minuti (file piccoli, sotto il limite di 25 MB
// del servizio di trascrizione) e carica ogni pezzo appena chiuso.
// Si attiva solo dopo che l'amministratore conferma il consenso dei presenti.
const SEGMENT_MS = 10 * 60 * 1000

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

export default function AssemblyRecorder({ nextSegment, onSegment, disabled }) {
  const [rec, setRec] = useState(false)
  const [err, setErr] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(0)
  const stream = useRef(null)
  const recorder = useRef(null)
  const timer = useRef(null)
  const tick = useRef(null)
  const seg = useRef(nextSegment)
  const active = useRef(false)

  useEffect(() => () => stopAll(), [])

  function stopAll() {
    active.current = false
    clearTimeout(timer.current); clearInterval(tick.current)
    try { if (recorder.current?.state === 'recording') recorder.current.stop() } catch { /* già fermo */ }
    stream.current?.getTracks().forEach((t) => t.stop())
  }

  function startSegment() {
    const mime = pickMime()
    const r = new MediaRecorder(stream.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 })
    const chunks = []
    r.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    r.onstop = async () => {
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' })
      const n = seg.current++
      if (active.current) startSegment()
      if (blob.size > 0) {
        setUploading((u) => u + 1)
        const { error } = await onSegment(n, blob)
        setUploading((u) => u - 1)
        if (error) setErr(error)
      }
    }
    r.start()
    recorder.current = r
    timer.current = setTimeout(() => { if (r.state === 'recording') r.stop() }, SEGMENT_MS)
  }

  async function start() {
    setErr(null)
    if (pickMime() === null) { setErr('Questo browser non può registrare audio.'); return }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setErr('Serve il permesso di usare il microfono.')
      return
    }
    seg.current = Math.max(seg.current, nextSegment)
    active.current = true
    setRec(true); setElapsed(0)
    tick.current = setInterval(() => setElapsed((x) => x + 1), 1000)
    startSegment()
  }

  function stop() {
    active.current = false
    clearTimeout(timer.current); clearInterval(tick.current)
    try { if (recorder.current?.state === 'recording') recorder.current.stop() } catch { /* già fermo */ }
    setTimeout(() => stream.current?.getTracks().forEach((t) => t.stop()), 500)
    setRec(false)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {rec ? (
        <button type="button" className="acc-btn" onClick={stop} style={{ color: '#B42318', borderColor: '#F5C2C0' }}>
          <Square size={15} aria-hidden="true" />Ferma la registrazione
        </button>
      ) : (
        <button type="button" className="acc-btn is-primary" onClick={start} disabled={disabled}>
          <Mic size={16} aria-hidden="true" />Registra la riunione
        </button>
      )}
      {rec && <span style={{ fontWeight: 700, color: '#B42318' }} aria-live="polite">● {mm}:{ss}</span>}
      {uploading > 0 && <span className="rc-muted">Carico l&apos;audio…</span>}
      {err && <span style={{ color: '#B42318', fontSize: 13 }}><AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {err}</span>}
    </div>
  )
}
