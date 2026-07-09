'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ANIMAL_AVATARS } from '@/lib/avatars'
import Modal from '@/components/ui/Modal'

// Ridimensiona a max 240px → JPEG base64
function resizeImage(file) {
  return new Promise((resolve) => {
    const MAX = 240
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.src = URL.createObjectURL(file)
  })
}

// Capture frame from a <video> element and return JPEG base64
function captureFromVideo(videoEl, maxSize = 240) {
  const { videoWidth: vw, videoHeight: vh } = videoEl
  const ratio = Math.min(maxSize / vw, maxSize / vh, 1)
  const w = Math.round(vw * ratio)
  const h = Math.round(vh * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(videoEl, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.82)
}

// ── Camera overlay ──────────────────────────────────────────────
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [captured, setCaptured] = useState(null)
  const [error, setError] = useState('')

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setReady(true)
          }
        }
      })
      .catch(err => {
        if (!cancelled) setError('Fotocamera non disponibile: ' + (err.message || err))
      })
    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  function shoot() {
    if (!videoRef.current) return
    setCaptured(captureFromVideo(videoRef.current))
    stopStream()
  }

  function retake() {
    setCaptured(null)
    setReady(false)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); setReady(true) }
      })
      .catch(err => setError(err.message || String(err)))
  }

  function confirm() {
    if (captured) { onCapture(captured); onClose() }
  }

  function handleClose() { stopStream(); onClose() }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 700,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: 24,
    }}>
      {error ? (
        <div style={{ color: '#FCA5A5', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
          ⚠ {error}
          <br />
          <button onClick={handleClose} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Chiudi</button>
        </div>
      ) : captured ? (
        // ── Preview ──
        <>
          <img src={captured} alt="Anteprima"
            style={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--teal)', boxShadow: '0 0 0 4px rgba(13,103,111,0.3)' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={retake} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Ritenta
            </button>
            <button onClick={confirm} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ✓ Usa questa foto
            </button>
          </div>
        </>
      ) : (
        // ── Live camera ──
        <>
          <div style={{ position: 'relative', borderRadius: '50%', overflow: 'hidden', width: 260, height: 260, border: '4px solid rgba(255,255,255,0.3)', background: '#111' }}>
            <video ref={videoRef} playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            {!ready && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                Avvio fotocamera…
              </div>
            )}
          </div>

          {/* Shutter button */}
          <button onClick={shoot} disabled={!ready}
            style={{
              width: 68, height: 68, borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.6)',
              background: ready ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: ready ? 'pointer' : 'default',
              boxShadow: ready ? '0 2px 16px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.15s',
            }}
            title="Scatta"
          />
          <button onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', marginTop: -8 }}>
            Annulla
          </button>
        </>
      )}
    </div>
  )
}

// ── Main AvatarPicker ───────────────────────────────────────────
export default function AvatarPicker({ open, onClose, current, onSelect, onSelectPhoto }) {
  const [tab, setTab] = useState('animals')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  if (!open) return null

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const dataUri = await resizeImage(file)
    setPreview(dataUri)
    setLoading(false)
    e.target.value = ''
  }

  function confirmPhoto() {
    if (preview && onSelectPhoto) {
      onSelectPhoto(preview)
      setPreview(null)
      onClose()
    }
  }

  function handleCameraCapture(dataUri) {
    setPreview(dataUri)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Il tuo avatar"
             subtitle="Scegli un animale o carica una tua foto.">

        {/* Tab selector */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
          {[['animals', '🐾 Animali'], ['photo', '📷 Foto personale']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: tab === key ? 'var(--teal)' : 'var(--white)',
              color: tab === key ? '#fff' : 'var(--text-3)',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Animali ── */}
        {tab === 'animals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {ANIMAL_AVATARS.map((a) => {
              const active = current === a.id
              return (
                <button key={a.id} onClick={() => { onSelect(a.id); onClose() }} title={a.label}
                  style={{
                    aspectRatio: '1', borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                    border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                    background: 'var(--bg)', padding: 0,
                    boxShadow: active ? '0 0 0 3px var(--teal-lt)' : 'none',
                  }}>
                  <img src={a.src} alt={a.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              )
            })}
          </div>
        )}

        {/* ── Foto personale ── */}
        {tab === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {preview ? (
              <>
                <img src={preview} alt="Anteprima"
                  style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--teal)' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setPreview(null)} style={{
                    padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                    background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)',
                  }}>Cambia</button>
                  <button onClick={confirmPhoto} style={{
                    padding: '9px 24px', borderRadius: 8, border: 'none',
                    background: 'var(--teal)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>✓ Usa questa foto</button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%', border: '2px dashed var(--border)',
                  background: 'var(--bg)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-4)',
                }}>
                  <span style={{ fontSize: 32 }}>👤</span>
                  <span style={{ fontSize: 11 }}>Nessuna foto</span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  {/* Carica da galleria */}
                  <label style={{
                    padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--teal)',
                    background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                  }}>
                    {loading ? 'Caricamento...' : '📁 Carica foto'}
                    <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  </label>

                  {/* Apri fotocamera (getUserMedia) */}
                  <button onClick={() => setCameraOpen(true)} style={{
                    padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                    background: '#fff', color: 'var(--text-2)', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                  }}>
                    📷 Scatta foto
                  </button>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', maxWidth: 240 }}>
                  La foto viene ridimensionata automaticamente e salvata nel tuo profilo.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Camera overlay — portato fuori dal Modal per evitare z-index issues */}
      {cameraOpen && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  )
}
