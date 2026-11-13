'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, ChevronRight, MessagesSquare, Users, Wrench } from 'lucide-react'

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '')
}

// Anteprima delle chat del condominio: gruppo, poi le conversazioni con messaggi nuovi o più recenti.
// asAdmin: l'amministratore vede le chat con i condomini, senza la voce "Scrivi all'amministratore".
export default function ConversationsCard({ threads, base, addr, asAdmin = false, style }) {
  const unreadTotal = threads.reduce((n, t) => n + (t.unread || 0), 0)
  const convs = useMemo(() => {
    const group = threads.find((t) => t.kind === 'group')
    const rest = threads.filter((t) => t !== group)
      .sort((a, b) => (b.unread > 0) - (a.unread > 0) || String(b.last_message_at || '').localeCompare(String(a.last_message_at || '')))
    const list = [group, ...rest].filter(Boolean)
    if (!asAdmin && !list.some((t) => t.kind === 'admin')) list.splice(1, 0, { thread_id: null, kind: 'admin', title: 'Amministratore', virtual: true, unread: 0 })
    if (asAdmin && !group) list.unshift({ thread_id: null, kind: 'group', title: 'Chat del condominio', unread: 0 })
    return list.slice(0, 3)
  }, [threads, asAdmin])
  const href = (t) => t.kind === 'group' ? `${base}/chat?c=gruppo` : t.virtual ? `${base}/chat?admin=1` : `${base}/chat?t=${t.thread_id}`

  return (
    <section className="aco-card" style={style}>
      <div className="aco-card-head">
        <MessagesSquare size={24} aria-hidden="true" /><h2>{asAdmin ? 'Chat del condominio' : 'Le tue conversazioni'}</h2>
        {unreadTotal > 0 && <span className="rco-new">{unreadTotal} {unreadTotal === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}</span>}
        <Link href={`${base}/chat`} className="aco-link aco-push rco-hide-xs">Apri tutte le chat<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="rco-convs">
        {convs.map((t) => (
          <Link key={t.thread_id || t.kind} href={href(t)} className={`rco-conv${t.kind === 'group' ? ' is-group' : ''}`}>
            <ThreadAvatar t={t} asAdmin={asAdmin} />
            <span className="rco-conv-main">
              <span className="rco-conv-top"><strong>{t.kind === 'group' ? 'Chat del condominio' : t.title}</strong><small>{when(t.last_message_at)}</small></span>
              <span className="rco-conv-msg">
                <span>{t.last_message_preview
                  ? <>{t.kind !== 'direct' && t.last_message_author ? <b>{t.last_message_author}: </b> : null}{t.last_message_preview}</>
                  : t.virtual ? 'Scrivi all\'amministratore' : 'Nessun messaggio'}</span>
                {t.unread > 0 && <em>{t.unread}</em>}
                <ChevronRight size={18} aria-hidden="true" />
              </span>
              <span className="rco-conv-foot">
                {t.kind === 'group' ? `Gruppo · ${addr}` : t.kind === 'intervention' ? <span className="rco-tag">{t.subtitle || 'Intervento'}</span> : 'Conversazione privata'}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Link href={`${base}/chat`} className="aco-link rco-show-xs" style={{ marginTop: 8 }}>Apri tutte le chat<ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  )
}

function ThreadAvatar({ t, asAdmin }) {
  if (t.kind === 'group') return <span className="rco-av is-sq"><Users size={26} strokeWidth={1.7} aria-hidden="true" /></span>
  if (t.kind === 'admin' && !asAdmin) return <span className="rco-av"><Building2 size={24} strokeWidth={1.8} aria-hidden="true" /></span>
  if (t.kind === 'intervention') return <span className="rco-av is-sq is-violet"><Wrench size={24} strokeWidth={1.8} aria-hidden="true" /></span>
  const ini = (t.title || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()
  return <span className="rco-av">{ini}</span>
}
