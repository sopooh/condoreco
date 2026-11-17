'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Eraser, FileCheck2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildAutocertificazione } from '@/lib/autocertificazione'

// Autocertificazione compilata nell'app: dati anagrafici, firma col dito e
// foto del documento d'identita'. Produce un unico PDF (onReady(file, nome)).
export default function AutocertForm({ buildingId, unit, onReady, ready }) {
  const [f, setF] = useState({ nome: '', cognome: '', luogoNascita: '', dataNascita: '' })
  const [building, setBuilding] = useState(null)
  const [idImages, setIdImages] = useState([])
  const [signed, setSigned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const sigRef = useRef(null)

  useEffect(() => {
    let off = false
    createClient().from('buildings').select('address, street_number, postal_code, city').eq('id', buildingId).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[AutocertForm] building', error.message)
        if (!off) setBuilding(data)
      })
    return () => { off = true }
  }, [buildingId])

  const indirizzo = building ? [building.address, building.street_number].filter(Boolean).join(' ') : ''
  const comune = building ? [building.postal_code, building.city].filter(Boolean).join(' ') : ''
  const filled = f.nome.trim() && f.cognome.trim() && f.luogoNascita.trim() && f.dataNascita
  const canBuild = filled && signed && idImages.length > 0 && building && !busy

  async function build() {
    setBusy(true); setErr(null)
    try {
      const file = await buildAutocertificazione({
        nome: f.nome.trim(), cognome: f.cognome.trim(), luogoNascita: f.luogoNascita.trim(), dataNascita: f.dataNascita,
        indirizzo, comune, citta: building.city, piano: unit?.floor || null, tenure: unit?.tenure || null,
        signaturePng: sigRef.current.toPng(), idImages,
      })
      onReady(file, `${f.nome.trim()} ${f.cognome.trim()}`)
    } catch (e) {
      console.error('[AutocertForm] build failed', e?.message)
      setErr('Non riesco a preparare il PDF. Prova con un\'altra foto del documento.')
    }
    setBusy(false)
  }

  if (ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: '2px solid var(--teal)', background: 'rgba(13,103,111,0.05)' }}>
        <FileCheck2 size={26} aria-hidden="true" style={{ color: 'var(--teal)', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          <b style={{ display: 'block', color: 'var(--teal-dk)' }}>Autocertificazione pronta</b>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Firmata, con il documento d&apos;identità allegato</span>
        </span>
        <a href={URL.createObjectURL(ready)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>Vedi</a>
        <button type="button" onClick={() => onReady(null, null)} style={{ minHeight: 0, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>Rifai</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Nome" value={f.nome} onChange={(v) => setF({ ...f, nome: v })} autoComplete="given-name" />
        <Field label="Cognome" value={f.cognome} onChange={(v) => setF({ ...f, cognome: v })} autoComplete="family-name" />
        <Field label="Nato/a a" value={f.luogoNascita} onChange={(v) => setF({ ...f, luogoNascita: v })} />
        <Field label="Il" type="date" value={f.dataNascita} onChange={(v) => setF({ ...f, dataNascita: v })} autoComplete="bday" />
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F5F7F7', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
        Dichiari di abitare in <b>{indirizzo || '…'}{comune ? `, ${comune}` : ''}</b>{unit?.floor ? `, piano ${unit.floor}` : ''}
        {unit?.tenure === 'owner' ? ', come proprietario/a' : unit?.tenure === 'tenant' ? ', come inquilino/a' : ''}.
        Una dichiarazione falsa è un reato (art. 76 DPR 445/2000).
      </div>

      <div>
        <div style={lab}>Firma qui con il dito</div>
        <SignaturePad ref={sigRef} onChange={setSigned} />
      </div>

      <div>
        <div style={lab}>Documento d&apos;identità</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 8px' }}>Fronte e, se serve, retro. Va allegato per legge all&apos;autocertificazione.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {idImages.map((img, i) => (
            <span key={i} style={{ position: 'relative', width: 96, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(img)} alt={`Documento ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" aria-label="Rimuovi" onClick={() => setIdImages(idImages.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: 2, right: 2, minHeight: 0, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </span>
          ))}
          {idImages.length < 2 && (
            <label style={{ width: 96, height: 64, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', color: 'var(--teal)', fontSize: 12, fontWeight: 700 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const x = e.target.files?.[0]; if (x) setIdImages([...idImages, x]); e.target.value = '' }} />
              <Camera size={20} aria-hidden="true" />{idImages.length ? 'Retro' : 'Fronte'}
            </label>
          )}
        </div>
      </div>

      {err && <p role="alert" style={{ color: '#B42318', fontSize: 14, margin: 0 }}>{err}</p>}
      <button type="button" disabled={!canBuild} onClick={build}
        style={{ height: 52, borderRadius: 14, border: 'none', background: canBuild ? 'var(--teal)' : '#D5DCDC', color: '#fff', fontWeight: 700, fontSize: 16, cursor: canBuild ? 'pointer' : 'not-allowed' }}>
        {busy ? 'Preparo il PDF…' : 'Crea l\'autocertificazione'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', autoComplete }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={lab}>{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px', fontSize: 16, fontFamily: 'inherit', background: 'var(--white)' }} />
    </label>
  )
}

const lab = { fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }

// Firma col dito (o col mouse). ref.current.toPng() -> Uint8Array PNG.
function SignaturePad({ ref, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const strokes = useRef(0)

  useEffect(() => {
    const c = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0B2545'
  }, [])

  useEffect(() => {
    if (!ref) return
    ref.current = {
      toPng: () => {
        const url = canvasRef.current.toDataURL('image/png')
        const bin = atob(url.split(',')[1])
        return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
      },
    }
  }, [ref])

  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  function down(e) { e.preventDefault(); canvasRef.current.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e) }
  function move(e) {
    if (!drawing.current) return
    const p = pos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    strokes.current += 1
    onChange(true)
  }
  function clear() {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    strokes.current = 0
    onChange(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ width: '100%', height: 150, border: '1.5px dashed var(--border)', borderRadius: 14, background: '#fff', touchAction: 'none', display: 'block' }}
        aria-label="Spazio per la firma" />
      <button type="button" onClick={clear} style={{ position: 'absolute', top: 8, right: 8, minHeight: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--white)', fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
        <Eraser size={14} aria-hidden="true" />Cancella
      </button>
    </div>
  )
}
