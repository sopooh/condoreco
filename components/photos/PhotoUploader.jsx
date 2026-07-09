'use client'

import { useRef, useState } from 'react'
import { processImageFile } from '@/lib/imageUtils'

const ACCEPTED = 'image/jpeg,image/png,image/webp,.heic,.heif'

export default function PhotoUploader({ files = [], onChange, maxFiles = 5 }) {
  const inputRef = useRef(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  async function handleRawFiles(rawFiles) {
    setError('')
    const remaining = maxFiles - files.length
    if (remaining <= 0) {
      setError(`Puoi aggiungere al massimo ${maxFiles} foto.`)
      return
    }
    const toProcess = Array.from(rawFiles).slice(0, remaining)
    setProcessing(true)
    const processed = []
    for (const raw of toProcess) {
      try {
        const { blob, qualityScore, width, height } = await processImageFile(raw)
        const preview = URL.createObjectURL(blob)
        processed.push({ blob, qualityScore, width, height, preview, originalName: raw.name })
      } catch (e) {
        setError(e.message)
      }
    }
    setProcessing(false)
    if (processed.length > 0) onChange([...files, ...processed])
  }

  function remove(index) {
    URL.revokeObjectURL(files[index].preview)
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => remove(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 18, height: 18, borderRadius: 4,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700,
                  lineHeight: '18px', textAlign: 'center', padding: 0,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleRawFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 10,
            padding: '16px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--bg)', transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--teal)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { handleRawFiles(e.target.files); e.target.value = '' }}
          />
          {processing ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Elaborazione in corso...</div>
          ) : (
            <>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📷</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                Aggiungi foto
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>
                JPG · PNG · WEBP · HEIC · max 10 MB · {maxFiles - files.length} disponibil{maxFiles - files.length === 1 ? 'e' : 'i'}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}

      <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 6, lineHeight: 1.5 }}>
        Le foto vengono compresse automaticamente e i dati GPS rimossi prima dell'invio.
        Saranno visibili solo dopo approvazione.
      </p>
    </div>
  )
}
