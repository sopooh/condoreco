'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Calendar, Check, ChevronRight, Copy, Info, Link2, LogOut, Pencil, Phone, Plus, RotateCcw, Send, Share2, Trash2, Undo2, UserPlus, Users, X } from 'lucide-react'
import { useTeamData, TEAM_ROLES, ROLE_LABEL, TASK_STATUS, STATUS_LABEL, canRole } from '@/hooks/useTeams'
import { toLocalISODate } from '@/lib/localDate'

// Team con livelli e attività. Usato nell'area Recofixer (tab Team) e nella pagina /team.
// team: riga di my_teams() { id, kind, name, my_role, member_id, is_owner }
export default function TeamWorkspace({ team, buildings = [], initialTaskId = null, onLeft }) {
  const data = useTeamData(team.id)
  const role = team.my_role
  const [tab, setTab] = useState('tasks')
  const [filter, setFilter] = useState(canRole(role, 'approver') ? 'all' : 'mine')
  const [openTask, setOpenTask] = useState(initialTaskId)
  const [editTask, setEditTask] = useState(null)
  const [editMember, setEditMember] = useState(null)
  const [invite, setInvite] = useState(null)
  const [showLevels, setShowLevels] = useState(false)

  const members = data.members || []
  const tasks = data.tasks || []
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const reviewCount = tasks.filter((t) => t.status === 'review').length
  const shown = tasks.filter((t) => {
    if (filter === 'mine') return t.assignee_id === team.member_id && t.status !== 'done'
    if (filter === 'review') return t.status === 'review'
    if (filter === 'done') return t.status === 'done'
    return t.status !== 'done'
  })
  const task = tasks.find((t) => t.id === openTask) || null
  const people = team.kind === 'supplier' ? 'tecnici e collaboratori' : 'collaboratori dello studio'

  return (
    <section className="rfx-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="rfx-h1">Team</h1>
          <p className="rfx-sub">{team.name} · il tuo livello: <strong style={{ color: 'var(--teal-dk)' }}>{ROLE_LABEL[role] || 'Nessuno'}</strong></p>
        </div>
        {tab === 'tasks' && canRole(role, 'editor') && (
          <button type="button" className="rfx-btn is-primary" onClick={() => setEditTask({})}><Plus size={17} aria-hidden="true" />Attività</button>
        )}
        {tab === 'people' && canRole(role, 'admin') && (
          <button type="button" className="rfx-btn is-primary" onClick={() => setEditMember({ role: 'editor' })}><UserPlus size={17} aria-hidden="true" />Persona</button>
        )}
      </div>

      <div className="tm-seg" role="tablist" aria-label="Sezioni del team">
        <button type="button" role="tab" aria-selected={tab === 'tasks'} className={tab === 'tasks' ? 'is-on' : ''} onClick={() => setTab('tasks')}>
          Attività{reviewCount > 0 && canRole(role, 'approver') ? <span className="tm-dot">{reviewCount}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'is-on' : ''} onClick={() => setTab('people')}>
          Persone ({members.length})
        </button>
      </div>

      {tab === 'tasks' && (
        <>
          <div className="p2-chips" style={{ margin: '12px 0 4px' }}>
            {[['mine', 'Mie'], ['all', 'Aperte'], ['review', `Da approvare${reviewCount ? ` (${reviewCount})` : ''}`], ['done', 'Fatte']].map(([k, l]) => (
              <button key={k} type="button" className={`p2-chip${filter === k ? ' is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          {data.tasks === null ? <p className="rfx-muted" style={{ marginTop: 12 }}>Caricamento…</p> : shown.length === 0 ? (
            <div className="rfx-empty">
              <Check size={26} aria-hidden="true" />
              <strong>{filter === 'mine' ? 'Nessuna attività per te' : filter === 'review' ? 'Niente da approvare' : filter === 'done' ? 'Nessuna attività chiusa' : 'Nessuna attività aperta'}</strong>
              <span>{canRole(role, 'editor') ? 'Crea un\'attività e assegnala a una persona del team: riceverà una notifica.' : 'Qui vedrai le attività del team.'}</span>
            </div>
          ) : (
            <ul className="tm-tasks">
              {shown.map((t) => <TaskRow key={t.id} t={t} who={byId[t.assignee_id]} me={team.member_id} onOpen={() => setOpenTask(t.id)} />)}
            </ul>
          )}
        </>
      )}

      {tab === 'people' && (
        <>
          <button type="button" className="tm-levels-toggle" onClick={() => setShowLevels((o) => !o)} aria-expanded={showLevels}>
            <Info size={16} aria-hidden="true" />Cosa può fare ogni livello
            <ChevronRight size={16} aria-hidden="true" style={{ marginLeft: 'auto', transform: showLevels ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {showLevels && (
            <ul className="tm-levels">
              {[...TEAM_ROLES].reverse().map((r) => <li key={r.id}><RoleBadge role={r.id} /><span>{r.hint}</span></li>)}
            </ul>
          )}
          {canRole(role, 'admin') && (
            <button type="button" className="rfx-btn" style={{ width: '100%', marginTop: 12 }} onClick={() => setInvite({ role: 'editor' })}>
              <Link2 size={17} aria-hidden="true" />Crea link d&apos;invito
            </button>
          )}
          {data.members === null ? <p className="rfx-muted" style={{ marginTop: 12 }}>Caricamento…</p> : members.length === 0 ? (
            <div className="rfx-empty"><Users size={26} aria-hidden="true" /><strong>Nessuna persona</strong><span>Aggiungi i tuoi {people}.</span></div>
          ) : (
            <ul className="rfx-team">
              {members.map((m) => {
                const open = tasks.filter((t) => t.assignee_id === m.id && t.status !== 'done').length
                return (
                  <li key={m.id}>
                    <span className="rfx-avatar">{initials(m.name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {m.name}{m.id === team.member_id && <span className="tm-chip">Tu</span>}{!m.user_id && <span className="tm-chip is-muted">Senza account</span>}
                      </strong>
                      <small>{[m.job, `${open} ${open === 1 ? 'attività aperta' : 'attività aperte'}`].filter(Boolean).join(' · ')}</small>
                      <span style={{ display: 'inline-block', marginTop: 4 }}><RoleBadge role={m.role} /></span>
                    </span>
                    {m.phone && <a className="rfx-iconbtn" href={`tel:${m.phone.replace(/\s+/g, '')}`} aria-label={`Chiama ${m.name}`}><Phone size={17} aria-hidden="true" /></a>}
                    {canRole(role, 'admin') && (
                      <button type="button" className="rfx-iconbtn" aria-label={`Modifica ${m.name}`} onClick={() => setEditMember(m)}><Pencil size={16} aria-hidden="true" /></button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {!team.is_owner && team.member_id && (
            <button type="button" className="rfx-btn is-danger" style={{ width: '100%', marginTop: 14 }}
              onClick={async () => { if (window.confirm(`Uscire dal team ${team.name}?`)) { const r = await data.removeMember(team.member_id); if (!r.error) onLeft?.(); else window.alert(r.error) } }}>
              <LogOut size={16} aria-hidden="true" />Esci dal team
            </button>
          )}
        </>
      )}

      {task && <TaskSheet t={task} team={team} meUser={byId[team.member_id]?.user_id} who={byId[task.assignee_id]} data={data} onClose={() => setOpenTask(null)} onEdit={() => { setEditTask(task); setOpenTask(null) }} />}
      {editTask && <TaskForm t={editTask} members={members} buildings={buildings} onClose={() => setEditTask(null)} onSave={data.saveTask} />}
      {editMember && <MemberForm m={editMember} team={team} onClose={() => setEditMember(null)} data={data} onInvite={(mm) => { setEditMember(null); setInvite({ role: mm.role, member: mm }) }} />}
      {invite && <InviteSheet inv={invite} onClose={() => setInvite(null)} data={data} />}
    </section>
  )
}

function TaskRow({ t, who, me, onOpen }) {
  const today = toLocalISODate(new Date())
  const late = t.due_date && t.due_date < today && t.status !== 'done'
  return (
    <li>
      <button type="button" className="tm-task" onClick={onOpen}>
        <span className={`tm-status is-${t.status}`}>{STATUS_LABEL[t.status]}</span>
        <span className="tm-task-main">
          <strong>{t.priority === 'high' && <AlertTriangle size={15} aria-label="Priorità alta" style={{ color: '#B54708', marginRight: 4, verticalAlign: '-2px' }} />}{t.title}</strong>
          <small>
            {who ? (who.id === me ? 'A te' : who.name) : 'Non assegnata'}
            {t.due_date && <span style={late ? { color: '#B42318', fontWeight: 700 } : undefined}> · {late ? 'scaduta il ' : 'entro il '}{fmtDate(t.due_date)}</span>}
            {t.buildings && <> · {addr(t.buildings)}</>}
          </small>
        </span>
        <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--text-4)', flexShrink: 0 }} />
      </button>
    </li>
  )
}

function TaskSheet({ t, team, meUser, who, data, onClose, onEdit }) {
  const role = team.my_role
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const go = async (status, n) => {
    setBusy(true); setErr(null)
    const r = await data.setStatus(t.id, status, n)
    setBusy(false)
    if (r.error) setErr(r.error); else { setRejecting(false); setNote('') }
  }
  const editor = canRole(role, 'editor')
  const approver = canRole(role, 'approver')
  const canDelete = canRole(role, 'admin') || (editor && t.status !== 'done' && t.created_by === meUser)

  return (
    <Sheet title="Attività" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <span className={`tm-status is-${t.status}`}>{STATUS_LABEL[t.status]}</span>
        {t.priority === 'high' && <span className="tm-chip is-warn">Priorità alta</span>}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.3px' }}>{t.title}</h2>
      {t.description && <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text-2)' }}>{t.description}</p>}
      <ul className="tm-facts">
        <li><Users size={16} aria-hidden="true" />{who ? who.name : 'Non assegnata'}</li>
        {t.due_date && <li><Calendar size={16} aria-hidden="true" />Entro il {fmtDate(t.due_date)}</li>}
        {t.buildings && <li><Building2 size={16} aria-hidden="true" />{addr(t.buildings)}</li>}
      </ul>
      {t.review_note && t.status !== 'done' && (
        <div className="tm-note"><strong>Nota di revisione</strong>{t.review_note}</div>
      )}

      {err && <p className="auth-err">{err}</p>}

      {editor && !rejecting && (
        <div className="tm-actions">
          {t.status === 'todo' && <button type="button" className="rfx-btn is-primary is-big" disabled={busy} onClick={() => go('doing')}>Inizia</button>}
          {t.status === 'doing' && <button type="button" className="rfx-btn is-primary is-big" disabled={busy} onClick={() => go('review')}><Send size={17} aria-hidden="true" />Invia ad approvazione</button>}
          {t.status === 'review' && approver && (
            <>
              <button type="button" className="rfx-btn is-primary is-big" disabled={busy} onClick={() => go('done')}><Check size={18} aria-hidden="true" />Approva</button>
              <button type="button" className="rfx-btn is-big" disabled={busy} onClick={() => setRejecting(true)}><Undo2 size={17} aria-hidden="true" />Rimanda indietro</button>
            </>
          )}
          {t.status === 'review' && !approver && <p className="rfx-muted">In attesa che un approvatore la controlli.</p>}
          {t.status === 'done' && approver && <button type="button" className="rfx-btn is-big" disabled={busy} onClick={() => go('doing')}><RotateCcw size={17} aria-hidden="true" />Riapri</button>}
          {t.status === 'done' && !approver && <p className="rfx-muted">Attività approvata e chiusa.</p>}
        </div>
      )}
      {rejecting && (
        <div style={{ marginTop: 12 }}>
          <label className="rfx-field"><span>Cosa va sistemato?</span><textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="rfx-btn" style={{ flex: 1 }} onClick={() => setRejecting(false)}>Annulla</button>
            <button type="button" className="rfx-btn is-primary" style={{ flex: 1 }} disabled={busy} onClick={() => go('doing', note)}>Rimanda</button>
          </div>
        </div>
      )}
      {!editor && <p className="rfx-muted" style={{ marginTop: 12 }}>Come visualizzatore puoi solo consultare le attività.</p>}

      {editor && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="rfx-btn" style={{ flex: 1 }} onClick={onEdit}><Pencil size={16} aria-hidden="true" />Modifica</button>
          {canDelete && (
            <button type="button" className="rfx-btn is-danger" style={{ flex: 1 }} disabled={busy}
              onClick={async () => { if (!window.confirm('Eliminare questa attività?')) return; const r = await data.deleteTask(t.id); if (r.error) setErr(r.error); else onClose() }}>
              <Trash2 size={16} aria-hidden="true" />Elimina
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function TaskForm({ t, members, buildings, onClose, onSave }) {
  const [v, setV] = useState({
    id: t.id, title: t.title || '', description: t.description || '', assignee_id: t.assignee_id || '',
    due_date: t.due_date || '', priority: t.priority || 'normal', building_id: t.building_id || '',
  })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <Sheet title={t.id ? 'Modifica attività' : 'Nuova attività'} onClose={onClose}>
      <label className="rfx-field"><span>Titolo</span><input value={v.title} onChange={set('title')} maxLength={140} placeholder="Es. Sopralluogo caldaia scala A" /></label>
      <label className="rfx-field"><span>Dettagli (facoltativo)</span><textarea rows={3} value={v.description} onChange={set('description')} maxLength={2000} /></label>
      <label className="rfx-field"><span>Assegna a</span>
        <select className="tm-select" value={v.assignee_id} onChange={set('assignee_id')}>
          <option value="">Nessuno per ora</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.job ? ` · ${m.job}` : ''}</option>)}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="rfx-field"><span>Scadenza</span><input type="date" value={v.due_date} onChange={set('due_date')} /></label>
        <label className="rfx-field"><span>Priorità</span>
          <select className="tm-select" value={v.priority} onChange={set('priority')}>
            <option value="normal">Normale</option>
            <option value="high">Alta</option>
          </select>
        </label>
      </div>
      {buildings.length > 0 && (
        <label className="rfx-field"><span>Condominio (facoltativo)</span>
          <select className="tm-select" value={v.building_id} onChange={set('building_id')}>
            <option value="">Nessuno</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </label>
      )}
      {err && <p className="auth-err">{err}</p>}
      <button type="button" className="ep-save" disabled={busy || v.title.trim().length < 2}
        onClick={async () => { setBusy(true); const r = await onSave(v); setBusy(false); if (r.error) setErr(r.error); else onClose() }}>
        {busy ? 'Salvataggio…' : t.id ? 'Salva' : 'Crea attività'}
      </button>
    </Sheet>
  )
}

function MemberForm({ m, team, data, onClose, onInvite }) {
  const [v, setV] = useState({ id: m.id, name: m.name || '', job: m.job || '', phone: m.phone || '', role: m.role || 'editor' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const isOwner = m.user_id && m.user_id === team.owner_id
  const save = async () => {
    setBusy(true); const r = await data.saveMember(v); setBusy(false)
    if (r.error) { setErr(r.error); return null }
    return r.data
  }
  return (
    <Sheet title={m.id ? 'Modifica persona' : 'Nuova persona'} onClose={onClose}>
      <label className="rfx-field"><span>Nome e cognome</span><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} /></label>
      <label className="rfx-field"><span>Mansione (facoltativa)</span><input value={v.job} onChange={(e) => setV({ ...v, job: e.target.value })} maxLength={60} placeholder={team.kind === 'supplier' ? 'Es. Idraulico, Apprendista' : 'Es. Contabile, Segreteria'} /></label>
      <label className="rfx-field"><span>Telefono (facoltativo)</span><input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={30} /></label>
      <div className="rfx-field"><span>Livello</span>
        {isOwner ? <p className="rfx-muted">Titolare del team: sempre amministratore.</p> : (
          <div className="tm-roles">
            {[...TEAM_ROLES].reverse().map((r) => (
              <button key={r.id} type="button" aria-pressed={v.role === r.id} className={v.role === r.id ? 'is-on' : ''} onClick={() => setV({ ...v, role: r.id })}>
                <b>{r.label}</b><small>{r.hint}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {err && <p className="auth-err">{err}</p>}
      <button type="button" className="ep-save" disabled={busy || v.name.trim().length < 2}
        onClick={async () => { if (await save()) onClose() }}>
        {busy ? 'Salvataggio…' : 'Salva'}
      </button>
      {!m.user_id && (
        <button type="button" className="rfx-btn" style={{ width: '100%', marginTop: 10 }} disabled={busy || v.name.trim().length < 2}
          onClick={async () => { const id = await save(); if (id) onInvite({ ...v, id }) }}>
          <Link2 size={16} aria-hidden="true" />Salva e invita a entrare
        </button>
      )}
      {m.id && !isOwner && (
        <button type="button" className="rfx-btn is-danger" style={{ width: '100%', marginTop: 10 }}
          onClick={async () => { if (!window.confirm(`Rimuovere ${m.name} dal team?`)) return; const r = await data.removeMember(m.id); if (r.error) setErr(r.error); else onClose() }}>
          <Trash2 size={16} aria-hidden="true" />Rimuovi dal team
        </button>
      )}
    </Sheet>
  )
}

function InviteSheet({ inv, data, onClose }) {
  const [role, setRole] = useState(inv.role || 'editor')
  const [link, setLink] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setLink(null) }, [role])
  const create = async () => {
    setBusy(true); setErr(null)
    const r = await data.createInvite(role, inv.member?.id)
    setBusy(false)
    if (r.error) setErr(r.error); else setLink(`${window.location.origin}/team/invito/${r.data}`)
  }
  const share = async () => {
    const text = `Entra nel mio team su Condoreco: ${link}`
    if (navigator.share) { try { await navigator.share({ title: 'Invito al team', text, url: link }); return } catch { /* annullato */ } }
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* niente appunti */ }
  }
  return (
    <Sheet title={inv.member ? `Invita ${inv.member.name}` : 'Link d\'invito'} onClose={onClose}>
      <p className="rfx-muted" style={{ marginBottom: 12 }}>
        Chi apre il link si registra (o accede) ed entra nel team con il livello scelto. Il link vale 7 giorni e si usa una volta sola.
      </p>
      <div className="rfx-field"><span>Livello</span>
        <div className="tm-roles">
          {[...TEAM_ROLES].reverse().map((r) => (
            <button key={r.id} type="button" aria-pressed={role === r.id} className={role === r.id ? 'is-on' : ''} onClick={() => setRole(r.id)}>
              <b>{r.label}</b><small>{r.hint}</small>
            </button>
          ))}
        </div>
      </div>
      {err && <p className="auth-err">{err}</p>}
      {!link ? (
        <button type="button" className="ep-save" disabled={busy} onClick={create}>{busy ? 'Creazione…' : 'Crea link'}</button>
      ) : (
        <>
          <div className="tm-link"><span>{link}</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="rfx-btn" style={{ flex: 1 }} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* niente */ } }}>
              {copied ? <><Check size={16} aria-hidden="true" />Copiato</> : <><Copy size={16} aria-hidden="true" />Copia</>}
            </button>
            <button type="button" className="rfx-btn is-primary" style={{ flex: 1 }} onClick={share}><Share2 size={16} aria-hidden="true" />Condividi</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div className="dir-sheet-title">{title}</div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function RoleBadge({ role }) {
  return <span className={`tm-role is-${role}`}>{ROLE_LABEL[role] || role}</span>
}

const initials = (n) => (n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()
const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
const addr = (b) => `${b.address}${b.street_number ? `, ${b.street_number}` : ''}`
export { TASK_STATUS }
