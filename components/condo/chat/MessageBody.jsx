'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, CalendarDays, Clock, Download, FileText, MapPin, MessageCircle, UserRound, X } from 'lucide-react'
import { extOf, formatSize, signedChatUrl } from '@/lib/chatFiles'
import { pollImageUrl } from '@/lib/pollImages'

// Contenuto di una bolla in base al tipo di messaggio.
// ctx: { polls, events, onVote, onOpenContact, buildingId, userId }
export default function MessageBody({ m, mine, ctx }) {
  const caption = captionOf(m)
  switch (m.kind) {
    case 'image': return <><ImageAtt att={m.attachment} />{caption && <Text mine={mine}>{caption}</Text>}</>
    case 'video': return <><VideoAtt att={m.attachment} />{caption && <Text mine={mine}>{caption}</Text>}</>
    case 'audio': return <AudioAtt att={m.attachment} mine={mine} />
    case 'file': return <><FileAtt att={m.attachment} mine={mine} />{caption && <Text mine={mine}>{caption}</Text>}</>
    case 'contact': return <ContactCard meta={m.meta} mine={mine} ctx={ctx} />
    case 'poll': return m.meta?.phase === 2
      ? <Phase2Card poll={ctx?.polls?.[m.ref_id]} mine={mine} ctx={ctx} fallback={m.content} />
      : <PollCard poll={ctx?.polls?.[m.ref_id]} mine={mine} ctx={ctx} fallback={m.content} />
    case 'event': return <EventCard ev={ctx?.events?.[m.ref_id]} mine={mine} ctx={ctx} fallback={m.content} />
    default: return <Text mine={mine}>{m.content}</Text>
  }
}

// Didascalia: il testo del messaggio se non è l'etichetta automatica
function captionOf(m) {
  if (!m.attachment) return null
  const auto = ['Foto', 'Video', 'Audio', `Documento: ${m.attachment.name}`]
  return auto.includes(m.content) ? null : m.content
}

function Text({ children }) {
  return <div style={{ fontSize: 15, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</div>
}

function useSigned(path) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let off = false
    if (path) signedChatUrl(path).then((u) => { if (!off) { if (u) setUrl(u); else setFailed(true) } })
    return () => { off = true }
  }, [path])
  return { url, failed }
}

function Missing() {
  return <div style={{ fontSize: 13.5, opacity: 0.75, padding: '6px 0' }}>File non disponibile</div>
}

function ImageAtt({ att }) {
  const { url, failed } = useSigned(att?.path)
  const [zoom, setZoom] = useState(false)
  if (failed) return <Missing />
  return (
    <>
      <button type="button" onClick={() => url && setZoom(true)} aria-label="Apri foto" className="chat-media">
        {url ? <img src={url} alt={att.name || 'Foto'} loading="lazy" /> : <span className="chat-media-ph" />}
      </button>
      {zoom && (
        <div className="chat-lightbox" role="dialog" aria-label="Foto" onClick={() => setZoom(false)}>
          <img src={url} alt={att.name || 'Foto'} />
          <div className="chat-lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <a href={url} download={att.name} target="_blank" rel="noopener noreferrer" aria-label="Scarica"><Download size={22} aria-hidden="true" /></a>
            <button type="button" onClick={() => setZoom(false)} aria-label="Chiudi"><X size={24} aria-hidden="true" /></button>
          </div>
        </div>
      )}
    </>
  )
}

function VideoAtt({ att }) {
  const { url, failed } = useSigned(att?.path)
  if (failed) return <Missing />
  return (
    <div className="chat-media">
      {url ? <video src={url} controls playsInline preload="metadata" /> : <span className="chat-media-ph" />}
    </div>
  )
}

function AudioAtt({ att, mine }) {
  const { url, failed } = useSigned(att?.path)
  if (failed) return <Missing />
  return (
    <div style={{ minWidth: 230, padding: '2px 0' }}>
      {url ? <audio src={url} controls preload="metadata" style={{ width: '100%', height: 40, colorScheme: mine ? 'dark' : 'light' }} />
        : <div style={{ height: 40 }} />}
      {att?.duration ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Messaggio vocale · {fmtDur(att.duration)}</div> : null}
    </div>
  )
}
const nowMs = () => Date.now()
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

const EXT_COLOR = { pdf: '#D93025', doc: '#2B579A', docx: '#2B579A', xls: '#217346', xlsx: '#217346', csv: '#217346', ppt: '#D24726', pptx: '#D24726', zip: '#6B7280' }

function FileAtt({ att, mine }) {
  const [busy, setBusy] = useState(false)
  if (!att) return <Missing />
  const ext = extOf(att.name)
  async function open() {
    setBusy(true)
    // apre subito una scheda (Safari blocca le aperture dopo un'attesa), poi la riempie
    const w = window.open('', '_blank')
    const url = await signedChatUrl(att.path)
    setBusy(false)
    if (!url) { w?.close(); alert('File non disponibile.'); return }
    if (w) w.location.href = url; else window.location.assign(url)
  }
  return (
    <button type="button" onClick={open} className={`chat-file${mine ? ' is-mine' : ''}`} aria-label={`Apri ${att.name}`}>
      <span className="chat-file-ico" style={{ background: EXT_COLOR[ext] || 'var(--teal)' }}>
        {ext ? <span>{ext.slice(0, 4).toUpperCase()}</span> : <FileText size={20} aria-hidden="true" />}
      </span>
      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <span className="chat-file-name">{att.name}</span>
        <span className="chat-file-meta">{busy ? 'Apertura…' : [formatSize(att.size), ext].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  )
}

function ContactCard({ meta, mine, ctx }) {
  const name = meta?.name || 'Residente'
  const sub = [meta?.role === 'admin' ? 'Amministratore' : 'Residente', meta?.floor ? (meta.floor === 'T' ? 'piano terra' : `piano ${meta.floor}`) : null].filter(Boolean).join(' · ')
  const canWrite = meta?.user_id && meta.user_id !== ctx?.userId && ctx?.onOpenContact
  return (
    <div className={`chat-card${mine ? ' is-mine' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="chat-card-ico" style={{ borderRadius: '50%' }}><UserRound size={20} aria-hidden="true" /></span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 15 }}>{name}</strong>
          <span style={{ display: 'block', fontSize: 12.5, opacity: 0.75 }}>{sub}</span>
        </span>
      </div>
      {canWrite && (
        <button type="button" className="chat-card-btn" onClick={() => ctx.onOpenContact(meta.user_id)}>
          <MessageCircle size={16} aria-hidden="true" />Scrivi in privato
        </button>
      )}
    </div>
  )
}

function PollCard({ poll, mine, ctx, fallback }) {
  const [now] = useState(nowMs)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const href = poll && ctx?.buildingId ? `/edificio/${ctx.buildingId}/condominio/decisioni/${poll.id}` : null
  if (!poll) {
    return (
      <div className={`chat-card${mine ? ' is-mine' : ''}`}>
        <div className="chat-card-kicker"><BarChart3 size={15} aria-hidden="true" />Sondaggio</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{fallback.replace(/^Sondaggio: /, '')}</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>Caricamento risultati…</div>
      </div>
    )
  }
  async function vote(v) {
    setBusy(true); setErr(null)
    const r = await ctx.onVote(poll.id, v)
    setBusy(false)
    if (r?.error) setErr(r.error)
  }
  const closesIn = Math.ceil((new Date(poll.closes_at) - now) / 86400000)
  return (
    <div className={`chat-card${mine ? ' is-mine' : ''}`} style={{ minWidth: 250 }}>
      <div className="chat-card-kicker"><BarChart3 size={15} aria-hidden="true" />Sondaggio{poll.is_anonymous ? ' anonimo' : ''}</div>
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, marginBottom: 10 }}>{poll.question}</div>
      {[['Sì', poll.yesVotes, poll.yesPct, true], ['No', poll.noVotes, poll.noPct, false]].map(([label, n, pct, v]) => {
        const chosen = poll.myVote === v
        const canPress = poll.isOpen && (!poll.hasVoted || (poll.canChangeVote && !chosen))
        return (
          <button key={label} type="button" disabled={!canPress || busy} onClick={() => vote(v)}
            className={`chat-poll-opt${chosen ? ' is-chosen' : ''}`} aria-pressed={chosen}>
            <span className="chat-poll-bar" style={{ width: `${poll.totalVotes ? pct : 0}%` }} />
            <span className="chat-poll-label">{chosen ? '✓ ' : ''}{label}</span>
            <span className="chat-poll-n">{poll.totalVotes ? `${pct}% · ${n}` : ''}</span>
          </button>
        )
      })}
      {err && <div style={{ fontSize: 12.5, color: '#B42318', background: '#fff', borderRadius: 8, padding: '4px 8px', marginTop: 6 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, opacity: 0.8, marginTop: 8 }}>
        <span>{poll.totalVotes} vot{poll.totalVotes === 1 ? 'o' : 'i'} · {poll.isOpen ? (closesIn <= 1 ? 'chiude oggi' : `chiude tra ${closesIn} giorni`) : 'chiuso'}</span>
        {href && <Link href={href} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>Dettagli</Link>}
      </div>
      {poll.hasVoted && poll.isOpen && poll.canChangeVote && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Puoi cambiare il voto una volta.</div>}
    </div>
  )
}

function EventCard({ ev, mine, ctx, fallback }) {
  if (!ev) {
    return (
      <div className={`chat-card${mine ? ' is-mine' : ''}`}>
        <div className="chat-card-kicker"><CalendarDays size={15} aria-hidden="true" />Evento</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{fallback.replace(/^Evento: /, '')}</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>{ctx?.eventsLoaded ? 'Evento eliminato' : 'Caricamento…'}</div>
      </div>
    )
  }
  const d = new Date(`${ev.event_date}T00:00:00`)
  const time = [ev.time_start?.slice(0, 5), ev.time_end?.slice(0, 5)].filter(Boolean).join(' - ')
  return (
    <div className={`chat-card${mine ? ' is-mine' : ''}`} style={{ minWidth: 240 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="chat-ev-date">
          <small>{d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}</small>
          <b>{d.getDate()}</b>
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="chat-card-kicker" style={{ marginBottom: 2 }}><CalendarDays size={14} aria-hidden="true" />Evento</span>
          <strong style={{ display: 'block', fontSize: 15.5, lineHeight: 1.3 }}>{ev.title}</strong>
          <span style={{ display: 'block', fontSize: 13, opacity: 0.8, marginTop: 3, textTransform: 'capitalize' }}>
            {d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {time && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, opacity: 0.8 }}><Clock size={13} aria-hidden="true" />{time}</span>}
          {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, opacity: 0.8 }}><MapPin size={13} aria-hidden="true" />{ev.location}</span>}
          {!ev.approved && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FFF7E6', color: '#8A5A00' }}>In attesa di approvazione</span>}
        </span>
      </div>
      {ctx?.buildingId && (
        <Link href={`/edificio/${ctx.buildingId}/condominio/calendario`} className="chat-card-btn" style={{ textDecoration: 'none' }}>
          <CalendarDays size={16} aria-hidden="true" />Vedi nel calendario
        </Link>
      )}
    </div>
  )
}

function OptionThumb({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let off = false
    if (path) pollImageUrl(path).then((u) => { if (!off) setUrl(u) })
    return () => { off = true }
  }, [path])
  if (!path) return null
  return url ? <img src={url} alt="" className="chat-p2-thumb" /> : <span className="chat-p2-thumb" />
}

// Fase 2 in chat: proposte con miniatura, voto con un tocco
function Phase2Card({ poll, mine, ctx, fallback }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const href = poll && ctx?.buildingId ? `/edificio/${ctx.buildingId}/condominio/decisioni/${poll.id}#fase-2` : null
  if (!poll) {
    return (
      <div className={`chat-card${mine ? ' is-mine' : ''}`}>
        <div className="chat-card-kicker"><BarChart3 size={15} aria-hidden="true" />Fase 2</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{fallback.replace(/^Fase 2: /, '')}</div>
      </div>
    )
  }
  const closed = poll.phase2_status === 'closed' || !poll.phase2Open
  async function vote(id) {
    setBusy(true); setErr(null)
    const r = await ctx.onVoteOption(poll, id)
    setBusy(false)
    if (r?.error) setErr(r.error)
  }
  return (
    <div className={`chat-card${mine ? ' is-mine' : ''}`} style={{ minWidth: 260 }}>
      <div className="chat-card-kicker"><BarChart3 size={15} aria-hidden="true" />Fase 2 · {poll.question}</div>
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>{poll.phase2_question || 'Quale proposta preferisci?'}</div>
      {poll.options.map((o) => {
        const chosen = poll.myOption === o.id
        const canPress = !closed && (!poll.myOption || (poll.canChangeOption && !chosen))
        const won = poll.phase2_winner === o.id
        return (
          <button key={o.id} type="button" disabled={!canPress || busy} onClick={() => vote(o.id)}
            className={`chat-poll-opt chat-p2-opt${chosen ? ' is-chosen' : ''}`} aria-pressed={chosen}>
            <span className="chat-poll-bar" style={{ width: `${poll.phase2Total ? o.pct : 0}%` }} />
            <OptionThumb path={o.image_path} />
            <span className="chat-poll-label" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chosen ? '✓ ' : ''}{won ? '🏆 ' : ''}{o.title}</span>
            <span className="chat-poll-n">{poll.phase2Total ? `${o.pct}%` : ''}</span>
          </button>
        )
      })}
      {err && <div style={{ fontSize: 12.5, color: '#B42318', background: '#fff', borderRadius: 8, padding: '4px 8px', marginTop: 6 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, opacity: 0.8, marginTop: 8 }}>
        <span>{poll.phase2Total} vot{poll.phase2Total === 1 ? 'o' : 'i'} · {closed ? 'chiusa' : 'in corso'}</span>
        {href && <Link href={href} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>Vedi le proposte</Link>}
      </div>
    </div>
  )
}
