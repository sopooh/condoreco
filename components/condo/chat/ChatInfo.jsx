'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, FileText, FolderOpen, Link2, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadChatFile, extOf, formatSize, signedChatUrl } from '@/lib/chatFiles'
import { fuzzyFilter } from '@/lib/fuzzySearch'

// Info della chat (come WhatsApp): si apre toccando il titolo della chat.
// Membri, Media (foto e video), Documenti (file e vocali), Link.
// Per la chat del condominio anche il collegamento all'archivio documenti.
const TABS = [['members', 'Membri'], ['media', 'Media'], ['docs', 'Documenti'], ['links', 'Link']]
const URL_RE = /https?:\/\/[^\s<>"')]+/gi

export default function ChatInfo({ kind, buildingId, threadId, title, subtitle, avatar, members, userId, onClose }) {
  const [tab, setTab] = useState('members')
  const [files, setFiles] = useState(null)
  const [links, setLinks] = useState(null)
  const [q, setQ] = useState('')
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  useEffect(() => {
    let off = false
    const supabase = createClient()
    const base = (cols) => {
      const qb = kind === 'group'
        ? supabase.from('messages').select(cols).eq('building_id', buildingId).eq('hidden', false)
        : supabase.from('condo_thread_messages').select(cols).eq('thread_id', threadId)
      return qb.is('deleted_at', null).order('created_at', { ascending: false })
    }
    Promise.all([
      base('id, kind, attachment, created_at, created_by').in('kind', ['image', 'video', 'file', 'audio']).limit(500),
      base('id, content, created_at, created_by').eq('kind', 'text').ilike('content', '%http%').limit(300),
    ]).then(([f, l]) => {
      if (off) return
      if (f.error) console.error('[ChatInfo] files', f.error.message)
      if (l.error) console.error('[ChatInfo] links', l.error.message)
      setFiles((f.data || []).filter((m) => m.attachment?.path))
      const out = []
      for (const m of l.data || []) for (const u of (m.content.match(URL_RE) || [])) out.push({ id: `${m.id}-${u}`, url: u, created_at: m.created_at })
      setLinks(out)
    })
    return () => { off = true }
  }, [kind, buildingId, threadId])

  const media = useMemo(() => (files || []).filter((m) => m.kind === 'image' || m.kind === 'video'), [files])
  const docs = useMemo(() => (files || []).filter((m) => m.kind === 'file' || m.kind === 'audio'), [files])
  const shownMembers = useMemo(() => {
    const list = [...(members || [])].sort((a, b) => (a.user_id === userId ? -1 : b.user_id === userId ? 1 : (a.role === 'admin') === (b.role === 'admin') ? (a.display_name || '').localeCompare(b.display_name || '') : a.role === 'admin' ? -1 : 1))
    return q.trim() ? fuzzyFilter(list, q, (p) => [{ text: p.display_name || '', weight: 3 }, { text: p.floor ? `piano ${p.floor}` : '', weight: 1 }]) : list
  }, [members, q, userId])

  const counts = { members: members?.length ?? 0, media: media.length, docs: docs.length, links: links?.length ?? 0 }

  return createPortal(
    <div className="ci-wrap" role="dialog" aria-modal="true" aria-label={`Info ${title}`}>
      <div className="ci-top">
        <button type="button" onClick={onClose} aria-label="Torna alla chat" className="ci-round"><ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" /></button>
        <span className="ci-top-title">Info</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="ci-scroll">
        <div className="ci-hero">
          <div className="ci-hero-av">{avatar}</div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {kind === 'group' && (
          <Link href={`/edificio/${buildingId}/condominio/archivio`} className="ci-card ci-row" onClick={onClose}>
            <span className="ci-ico"><FolderOpen size={20} aria-hidden="true" /></span>
            <span style={{ flex: 1 }}><b>Archivio documenti</b><small>Verbali, bilanci, regolamento e documenti salvati</small></span>
            <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--text-4)' }} />
          </Link>
        )}

        <div className="ci-tabs" role="tablist">
          {TABS.map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? 'is-on' : ''} onClick={() => setTab(v)}>
              {l}{counts[v] ? <span>{counts[v]}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'members' && (
          <div className="ci-card">
            {(members?.length || 0) > 6 && (
              <label className="ci-search">
                <Search size={17} aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un membro" aria-label="Cerca un membro" type="search" />
              </label>
            )}
            {shownMembers.map((p) => (
              <div key={p.user_id} className="ci-row ci-member">
                <span className="ci-av">{initials(p.display_name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.user_id === userId ? 'Tu' : (p.display_name || 'Residente')}</b>
                  {p.floor && <small>{p.floor === 'T' ? 'Piano terra' : `Piano ${p.floor}`}</small>}
                </span>
                {p.role === 'admin' && <span className="ci-tag">Amministratore</span>}
              </div>
            ))}
            {!shownMembers.length && <p className="ci-empty">{members ? 'Nessun membro trovato.' : 'Carico i membri…'}</p>}
          </div>
        )}

        {tab === 'media' && (
          files === null ? <p className="ci-empty">Carico…</p>
            : media.length ? (
              <div className="ci-grid">
                {media.map((m) => <MediaThumb key={m.id} m={m} onOpen={() => setZoom(m)} />)}
              </div>
            ) : <p className="ci-empty">Ancora nessuna foto o video in questa chat.</p>
        )}

        {tab === 'docs' && (
          <div className="ci-card">
            {files === null ? <p className="ci-empty">Carico…</p>
              : docs.length ? docs.map((m) => <DocRow key={m.id} m={m} />)
                : <p className="ci-empty">Ancora nessun documento in questa chat.</p>}
          </div>
        )}

        {tab === 'links' && (
          <div className="ci-card">
            {links === null ? <p className="ci-empty">Carico…</p>
              : links.length ? links.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="ci-row">
                  <span className="ci-ico"><Link2 size={18} aria-hidden="true" /></span>
                  <span style={{ flex: 1, minWidth: 0 }}><b className="ci-ellipsis">{hostOf(l.url)}</b><small className="ci-ellipsis">{l.url}</small></span>
                </a>
              )) : <p className="ci-empty">Ancora nessun link in questa chat.</p>}
          </div>
        )}
      </div>

      {zoom && <MediaZoom m={zoom} onClose={() => setZoom(null)} />}
    </div>,
    document.body,
  )
}

function useSignedUrl(path) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let off = false
    signedChatUrl(path).then((u) => { if (!off) setUrl(u) })
    return () => { off = true }
  }, [path])
  return url
}

function MediaThumb({ m, onOpen }) {
  const url = useSignedUrl(m.attachment.path)
  return (
    <button type="button" className="ci-thumb" onClick={onOpen} aria-label={m.kind === 'video' ? 'Apri video' : 'Apri foto'}>
      {url && (m.kind === 'video'
        ? <video src={url} muted playsInline preload="metadata" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={url} alt="" loading="lazy" />)}
    </button>
  )
}

function MediaZoom({ m, onClose }) {
  const url = useSignedUrl(m.attachment.path)
  return (
    <div className="chat-lightbox" role="dialog" aria-label="Media" onClick={onClose}>
      {url && (m.kind === 'video'
        ? <video src={url} controls playsInline autoPlay onClick={(e) => e.stopPropagation()} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={url} alt={m.attachment.name || 'Foto'} />)}
      <div className="chat-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => downloadChatFile(m.attachment)} aria-label="Scarica"><Download size={22} aria-hidden="true" /></button>
        <button type="button" onClick={onClose} aria-label="Chiudi"><X size={24} aria-hidden="true" /></button>
      </div>
    </div>
  )
}

function DocRow({ m }) {
  const att = m.attachment
  const ext = extOf(att.name)
  async function open() {
    const w = window.open('', '_blank')
    const url = await signedChatUrl(att.path)
    if (!url) { w?.close(); return }
    if (w) w.location.href = url; else window.location.assign(url)
  }
  return (
    <div className="ci-row">
      <button type="button" onClick={open} className="ci-doc">
        <span className="ci-ico ci-ext">{m.kind === 'audio' ? '♪' : ext ? ext.slice(0, 4).toUpperCase() : <FileText size={18} aria-hidden="true" />}</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <b className="ci-ellipsis">{m.kind === 'audio' ? 'Messaggio vocale' : att.name}</b>
          <small>{[formatSize(att.size), new Date(m.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · ')}</small>
        </span>
      </button>
      <button type="button" className="ci-round ci-dl" onClick={() => downloadChatFile(att)} aria-label={`Scarica ${att.name}`}><Download size={18} aria-hidden="true" /></button>
    </div>
  )
}

const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
