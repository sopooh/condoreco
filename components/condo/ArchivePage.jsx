'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, ChevronRight, ChevronLeft, Users, Lock, Eye, Download, Ellipsis, Plus, Upload, FileText, Image as ImageIcon, FileSpreadsheet, Sparkles, RefreshCw,
} from 'lucide-react'
import { useDocuments, MAX_DOC_BYTES } from '@/hooks/useDocuments'
import { DOCUMENT_CATEGORIES, documentCategory } from '@/lib/documentCategories'
import { fuzzyFilter } from '@/lib/fuzzySearch'
import { Sheet } from '@/components/condo/InterventionsPage'

const fmtDate = (iso) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function ArchivePage({ building }) {
  const buildingId = building.id
  const { docs, loading, error, upload, remove, setVisibility, fileUrl, canManage, searchContent, reindex } = useDocuments(buildingId)
  const [q, setQ] = useState('')
  const [vis, setVis] = useState('all')       // all | shared | restricted
  const [category, setCategory] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [menuFor, setMenuFor] = useState(null)
  const [actionErr, setActionErr] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [content, setContent] = useState({ q: '', results: [], error: null })

  // ricerca nel contenuto dei documenti (testo estratto), con una piccola attesa mentre si scrive
  const term = q.trim()
  useEffect(() => {
    if (term.length < 3) return
    let alive = true
    const t = setTimeout(async () => {
      const { results, error } = await searchContent(term)
      if (alive) setContent({ q: term, results, error })
    }, 450)
    return () => { alive = false; clearTimeout(t) }
  }, [term, searchContent])
  const contentLoading = term.length >= 3 && content.q !== term
  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs])
  const contentHits = (content.q === term ? content.results : []).filter((r) => docById.has(r.document_id)
    && (vis === 'all' || docById.get(r.document_id).visibility === vis)
    && (!category || r.category === category))

  const counts = useMemo(() => {
    const c = {}
    docs.forEach((d) => { c[d.category] = (c[d.category] || 0) + 1 })
    return c
  }, [docs])

  const query = q.trim().toLowerCase()
  // ricerca per corrispondenza o somiglianza (errori di battitura, sinonimi), risultati in ordine di pertinenza
  const filtered = fuzzyFilter(
    docs.filter((d) => (vis === 'all' || d.visibility === vis) && (!category || d.category === category)),
    query,
    (d) => [
      { text: d.title, weight: 3 },
      { text: d.file_name, weight: 1.5 },
      { text: `${documentCategory(d.category).label} ${documentCategory(d.category).hint}`, weight: 1 },
      { text: d.doc_date ? fmtDate(d.doc_date) : fmtDate(d.created_at), weight: 0.8 },
    ],
  )
  const showingList = category || query || vis !== 'all' || showAll

  async function open(doc, download) {
    // la finestra va aperta subito (Safari blocca i popup aperti dopo un await)
    const w = download ? null : window.open('', '_blank')
    const url = await fileUrl(doc, download)
    if (!url) { w?.close(); setActionErr('Non riesco ad aprire il documento.'); return }
    if (download) window.location.assign(url)
    else if (w) w.location.assign(url)
    else window.location.assign(url)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={`/edificio/${buildingId}/condominio`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Archivio documenti</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>Tutti i documenti del condominio, organizzati per categoria.</p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ flex: 1, position: 'relative', display: 'block' }}>
          <Search size={18} strokeWidth={2} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un documento..." aria-label="Cerca un documento" type="search" enterKeyHint="search"
            style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border)', padding: '0 14px 0 42px', fontSize: 16, background: 'var(--white)', boxSizing: 'border-box' }} />
        </label>
        <button type="button" onClick={() => setUploading(true)} className="docs-btn primary" style={{ height: 48, borderRadius: 14, padding: '0 16px', fontSize: 15 }}>
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" /> Carica
        </button>
      </div>

      {!category && !query && (
        <div className="docs-cats">
          {DOCUMENT_CATEGORIES.map((c) => {
            const Icon = c.icon
            const n = counts[c.value] || 0
            return (
              <button key={c.value} type="button" className="docs-cat" onClick={() => setCategory(c.value)}>
                <span className="docs-cat-icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="docs-cat-title">{c.label}</span>
                  <span className="docs-cat-count">{n === 1 ? '1 documento' : `${n} documenti`}</span>
                </span>
                <ChevronRight className="docs-cat-chev" size={18} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      <div className="docs-seg" role="group" aria-label="Visibilità">
        {[['all', 'Tutti i documenti', null], ['shared', 'Condivisi', Users], ['restricted', 'Riservati', Lock]].map(([v, l, Icon]) => (
          <button key={v} type="button" className={vis === v ? 'is-on' : ''} onClick={() => setVis(v)} aria-pressed={vis === v}>
            {Icon && <Icon size={16} strokeWidth={2} aria-hidden="true" />}{l}
          </button>
        ))}
      </div>

      <section style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {category ? (
            <button type="button" onClick={() => setCategory(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 19, fontWeight: 800, color: 'var(--text)', textAlign: 'left' }}>
              <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" style={{ color: 'var(--teal)' }} />{documentCategory(category).label}
            </button>
          ) : (
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{query ? `Risultati per “${q.trim()}”` : showingList ? 'Risultati' : 'Documenti recenti'}</h2>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{filtered.length}</span>
        </div>
        {category && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>{documentCategory(category).hint}</p>}
        {actionErr && <p style={{ fontSize: 13, color: '#B42318', margin: '8px 0 0' }}>{actionErr}</p>}

        {loading ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '12px 0 0' }}>Caricamento...</p>
        ) : error ? (
          <p style={{ fontSize: 14, color: '#B42318', margin: '12px 0 0' }}>Non riesco a caricare i documenti. Riprova tra poco.</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '18px 0 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 12px' }}>
              {docs.length === 0 ? "L'archivio è vuoto. Carica il primo documento del condominio." : query ? 'Nessun documento simile. Prova con un\'altra parola o controlla i filtri.' : 'Nessun documento trovato.'}
            </p>
            {docs.length === 0 && (
              <button type="button" className="docs-btn primary" onClick={() => setUploading(true)}><Upload size={16} strokeWidth={2} aria-hidden="true" /> Carica un documento</button>
            )}
          </div>
        ) : (
          <div>
            {(showingList ? filtered : filtered.slice(0, 8)).map((d) => (
              <div key={d.id} className="docs-row">
                <FileBadge doc={d} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflowWrap: 'anywhere' }}>{d.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                        {documentCategory(d.category).label} · {fmtDate(d.doc_date || d.created_at)}{d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ''}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span className={`docs-pill ${d.visibility}`}>
                          {d.visibility === 'restricted' && <Lock size={12} strokeWidth={2.2} aria-hidden="true" />}
                          {d.visibility === 'restricted' ? 'Riservato' : 'Condiviso'}
                        </span>
                        {TEXT_STATUS[d.text_status] && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{TEXT_STATUS[d.text_status]}</span>}
                      </div>
                    </div>
                    {canManage(d) && (
                      <button type="button" aria-label="Altre azioni" onClick={() => setMenuFor(d)} style={{ minHeight: 0, width: 32, height: 28, border: 'none', background: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ellipsis size={20} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="docs-actions">
                    <button type="button" className="docs-btn" onClick={() => open(d, false)}><Eye size={16} strokeWidth={2} aria-hidden="true" /> Visualizza</button>
                    <button type="button" className="docs-btn primary" onClick={() => open(d, true)}><Download size={16} strokeWidth={2} aria-hidden="true" /> Scarica</button>
                  </div>
                </div>
              </div>
            ))}
            {!showingList && filtered.length > 8 && (
              <button type="button" onClick={() => setShowAll(true)} style={{ minHeight: 0, border: 'none', background: 'none', color: 'var(--teal)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '8px 0 0' }}>
                Vedi tutti
              </button>
            )}
          </div>
        )}
      </section>

      {query.length >= 3 && (
        <section style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--teal)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, flex: 1 }}>Dentro i documenti</h2>
            {!contentLoading && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{contentHits.length}</span>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>Passaggi che parlano di quello che cerchi, anche con parole diverse.</p>
          {contentLoading ? (
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '12px 0 0' }}>Sto cercando nei testi...</p>
          ) : content.q === term && content.error ? (
            <p style={{ fontSize: 14, color: '#B42318', margin: '12px 0 0' }}>{content.error}</p>
          ) : contentHits.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '12px 0 0' }}>Nessun passaggio trovato. I documenti appena caricati sono leggibili dopo qualche minuto.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {contentHits.map((r) => {
                const d = docById.get(r.document_id)
                return (
                  <button key={r.chunk_id} type="button" onClick={() => open(d, false)} className="docs-hit"
                    style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: 0, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: '#FAFBFB', cursor: 'pointer', color: 'var(--text)' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{r.title}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', margin: '2px 0 6px' }}>
                      {documentCategory(r.category).label}{r.page ? ` · pagina ${r.page}` : ''}
                    </span>
                    <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)' }}>{highlight(snippet(r.content, content.q), content.q)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <p style={{ fontSize: 12.5, color: 'var(--text-4)', margin: 0, lineHeight: 1.5 }}>
        I documenti <strong>condivisi</strong> li vedono tutti i residenti verificati. I <strong>riservati</strong>{' '}solo chi li ha caricati e l&apos;amministratore del condominio.
      </p>

      {uploading && (
        <Sheet onClose={() => setUploading(false)} title="Carica un documento" subtitle="PDF, immagini, Word o Excel, fino a 20 MB">
          <UploadForm defaultCategory={category || 'assemblies'} onCancel={() => setUploading(false)} onUpload={async (file, meta) => {
            const { error } = await upload(file, meta)
            if (!error) { setUploading(false); setCategory(meta.category) }
            return error
          }} />
        </Sheet>
      )}

      {menuFor && (
        <Sheet onClose={() => setMenuFor(null)} title={menuFor.title} subtitle={documentCategory(menuFor.category).label}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="docs-btn" style={{ height: 48 }} onClick={async () => {
              const { error } = await setVisibility(menuFor, menuFor.visibility === 'shared' ? 'restricted' : 'shared')
              setActionErr(error); setMenuFor(null)
            }}>
              {menuFor.visibility === 'shared' ? <><Lock size={16} strokeWidth={2} aria-hidden="true" /> Rendi riservato</> : <><Users size={16} strokeWidth={2} aria-hidden="true" /> Condividi con i residenti</>}
            </button>
            {['error', 'no_text'].includes(menuFor.text_status) && (
              <button type="button" className="docs-btn" style={{ height: 48 }} onClick={async () => {
                const { error } = await reindex(menuFor)
                setActionErr(error); setMenuFor(null)
              }}><RefreshCw size={16} strokeWidth={2} aria-hidden="true" /> Rileggi il testo</button>
            )}
            <button type="button" className="docs-btn" style={{ height: 48, color: '#B42318', borderColor: '#F5C2C0' }} onClick={async () => {
              if (!window.confirm(`Eliminare "${menuFor.title}"? Non si può annullare.`)) return
              const { error } = await remove(menuFor)
              setActionErr(error); setMenuFor(null)
            }}>Elimina documento</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

const TEXT_STATUS = {
  pending: 'Lettura del testo in corso',
  processing: 'Lettura del testo in corso',
  no_text: 'Scansione: testo non ancora leggibile',
  error: 'Testo non letto',
}

// Pezzo di testo attorno alla prima parola cercata trovata.
function snippet(text, q, size = 220) {
  const t = text.replace(/\s+/g, ' ')
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
  const low = t.toLowerCase()
  let at = -1
  for (const w of words) { at = low.indexOf(w.slice(0, Math.max(4, w.length - 2))); if (at >= 0) break }
  if (at < 0 || t.length <= size) return t.length > size ? t.slice(0, size) + '…' : t
  const start = Math.max(0, at - 60)
  return (start > 0 ? '…' : '') + t.slice(start, start + size) + (start + size < t.length ? '…' : '')
}

function highlight(text, q) {
  const stems = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 3).map((w) => w.slice(0, Math.max(4, w.length - 2)))
  if (!stems.length) return text
  const esc = (x) => x.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')
  const re = new RegExp('(' + stems.map(esc).join('|') + ')', 'gi')
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i} style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', borderRadius: 3, padding: '0 1px' }}>{part}</mark> : part))
}

function FileBadge({ doc }) {
  const m = doc.mime_type || ''
  if (m.startsWith('image/')) return <span className="docs-file-icon" style={{ background: '#E6F1F1', color: 'var(--teal-dk)' }}><ImageIcon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
  if (/sheet|excel/.test(m)) return <span className="docs-file-icon" style={{ background: '#E3F4E7', color: '#1E7A3A' }}><FileSpreadsheet size={20} strokeWidth={1.8} aria-hidden="true" /></span>
  if (/word/.test(m)) return <span className="docs-file-icon" style={{ background: '#E8EEFB', color: '#2B5BB8' }}><FileText size={20} strokeWidth={1.8} aria-hidden="true" /></span>
  return <span className="docs-file-icon">PDF</span>
}

export function UploadForm({ defaultCategory, onCancel, onUpload, presetFile = null, defaultVisibility = 'shared', submitLabel = 'Carica' }) {
  const [file, setFile] = useState(presetFile)
  const [title, setTitle] = useState(presetFile ? presetFile.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') : '')
  const [category, setCategory] = useState(defaultCategory)
  const [docDate, setDocDate] = useState('')
  const [visibility, setVisibility] = useState(defaultVisibility)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const tooBig = file && file.size > MAX_DOC_BYTES
  const canSave = file && !tooBig && title.trim().length >= 2 && !saving

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {presetFile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(13,103,111,0.05)', border: '1.5px solid var(--teal)' }}>
          <FileText size={22} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--teal)', flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--teal-dk)', wordBreak: 'break-all' }}>{presetFile.name}</span>
            <span style={{ fontSize: 12.5, color: tooBig ? '#B42318' : 'var(--text-4)' }}>{tooBig ? 'Il file supera 20 MB' : fmtSize(presetFile.size)}</span>
          </span>
        </div>
      ) : (
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 14px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
        border: `2px dashed ${file ? 'var(--teal)' : 'var(--border)'}`, background: file ? 'rgba(13,103,111,0.05)' : '#FAFBFB' }}>
        <input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={(e) => {
          const f = e.target.files?.[0] || null
          setFile(f)
          if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
        }} />
        <Upload size={26} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--teal)' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: file ? 'var(--teal-dk)' : 'var(--text)', wordBreak: 'break-all' }}>{file ? file.name : 'Scegli un file'}</span>
        <span style={{ fontSize: 12.5, color: tooBig ? '#B42318' : 'var(--text-4)' }}>{file ? (tooBig ? 'Il file supera 20 MB' : `${fmtSize(file.size)} · tocca per cambiare`) : 'PDF · JPG · PNG · Word · Excel'}</span>
      </label>
      )}

      <label><div style={lab}>Titolo</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Es. Verbale assemblea ordinaria" style={fld} />
      </label>

      <div><div style={lab}>Categoria</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DOCUMENT_CATEGORIES.map((c) => {
            const on = category === c.value
            return (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)} style={{ minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)' }}>{c.label}</button>
            )
          })}
        </div>
      </div>

      <label><div style={lab}>Data del documento <span style={{ fontWeight: 500, color: 'var(--text-4)' }}>(facoltativa)</span></div>
        <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} style={fld} />
      </label>

      <div><div style={lab}>Chi lo vede</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['shared', 'Condiviso', 'Tutti i residenti verificati', Users], ['restricted', 'Riservato', "Solo tu e l'amministratore", Lock]].map(([v, t, d, Icon]) => {
            const on = visibility === v
            return (
              <button key={v} type="button" onClick={() => setVisibility(v)} aria-pressed={on} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, minHeight: 0, padding: '10px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--text)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14 }}><Icon size={15} strokeWidth={2} aria-hidden="true" />{t}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{d}</span>
              </button>
            )
          })}
        </div>
      </div>

      {err && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
        <button type="button" onClick={onCancel} className="docs-btn" style={{ height: 48, color: 'var(--text)' }}>Annulla</button>
        <button type="button" disabled={!canSave} className="docs-btn primary" style={{ height: 48, opacity: canSave ? 1 : 0.5 }} onClick={async () => {
          setSaving(true); setErr(null)
          const e = await onUpload(file, { title, category, docDate, visibility })
          setSaving(false)
          if (e) setErr(e)
        }}>{saving ? 'Salvataggio...' : submitLabel}</button>
      </div>
    </div>
  )
}

const lab = { fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }
const fld = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
