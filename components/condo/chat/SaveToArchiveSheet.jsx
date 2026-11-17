'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { signedChatUrl } from '@/lib/chatFiles'
import { uploadDocument } from '@/hooks/useDocuments'
import { UploadForm } from '@/components/condo/ArchivePage'

// "Salva nell'archivio": copia un allegato della chat nell'archivio documenti
// del condominio (bucket condo-documents) con titolo, categoria e visibilità.
// Il file in chat resta dov'è.
const ARCHIVE_MIME = /^(application\/pdf|image\/(jpeg|png|webp|heic)|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel))$/
const ARCHIVE_EXT = /\.(pdf|jpe?g|png|webp|heic|docx?|xlsx?)$/i

export function canArchive(m) {
  const att = m?.attachment
  if (!att?.path || !['file', 'image'].includes(m.kind)) return false
  return ARCHIVE_MIME.test(att.mime || '') || ARCHIVE_EXT.test(att.name || '')
}

export default function SaveToArchiveSheet({ m, buildingId, userId, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const url = await signedChatUrl(m.attachment.path)
        if (!url) throw new Error('url')
        const blob = await (await fetch(url)).blob()
        if (!off) setFile(new File([blob], m.attachment.name || 'documento', { type: m.attachment.mime || blob.type }))
      } catch (e) {
        console.error('[SaveToArchiveSheet] load failed', e?.message)
        if (!off) setErr('Non riesco a leggere il file. Riprova.')
      }
    })()
    return () => { off = true }
  }, [m.attachment])

  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Salva nell'archivio">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div>
            <div className="dir-sheet-title">Salva nell&apos;archivio</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Una copia va nei documenti del condominio, il file in chat resta.</div>
          </div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {err && <p className="auth-err">{err}</p>}
        {!file && !err && <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Preparo il file…</p>}
        {file && (
          <UploadForm presetFile={file} defaultCategory="other" defaultVisibility="restricted" submitLabel="Salva" onCancel={onClose}
            onUpload={async (f, meta) => {
              const { error } = await uploadDocument({ buildingId, userId, file: f, ...meta })
              if (!error) onDone?.()
              return error
            }} />
        )}
      </div>
    </div>
  )
}
