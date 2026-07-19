'use client'

import { useState } from 'react'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { googleCalendarUrl, downloadIcs } from '@/lib/calendarLinks'

// Board (bacheca condominiale) a calendario mensile.
// Griglia lun-dom, eventi cliccabili, pannello dettaglio a destra con
// "Aggiungi a Google Calendar", modifica/elimina per admin.

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const WEEKDAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']

const TYPE_META = {
  water:       { label: 'Acqua',        bg: 'var(--red-bg)',   tx: 'var(--red-tx)' },
  maintenance: { label: 'Manutenzione', bg: 'var(--amber-bg)', tx: 'var(--amber-tx)' },
  meeting:     { label: 'Riunione',     bg: 'var(--green-bg)', tx: 'var(--green-tx)' },
  general:     { label: 'Generale',     bg: 'var(--blue-bg)',  tx: 'var(--blue-tx)' },
}

// Matrice settimane del mese, lunedi' come primo giorno
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)) // torna al lunedi'

  const weeks = []
  const cursor = new Date(start)
  do {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month)
  return weeks
}

const isoDay = (d) => d.toISOString().slice(0, 10)

export default function BoardPage({ buildingId }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)   // evento aperto nel pannello
  const [creating, setCreating] = useState(false)

  const { events, loading, isCondoAdmin, createEvent, updateEvent, deleteEvent, approveEvent } =
    useCalendarEvents(buildingId, year, month)

  const eventsByDay = events.reduce((acc, ev) => {
    (acc[ev.event_date] ??= []).push(ev)
    return acc
  }, {})

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(null)
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* ---- Colonna calendario ---- */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Bacheca condominiale</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NavButton onClick={() => shiftMonth(-1)} label="Mese precedente">‹</NavButton>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{MONTH_NAMES[month]} {year}</span>
            <NavButton onClick={() => shiftMonth(1)} label="Mese successivo">›</NavButton>
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
              style={{ marginLeft: 8, fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Oggi
            </button>
            <button onClick={() => setCreating(true)} style={{ ...tealBtn, marginLeft: 16 }}>
              + Aggiungi appuntamento
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento calendario...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', fontSize: 13 }}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} style={{ padding: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-4)', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                {wd}
              </div>
            ))}
            {buildMonthGrid(year, month).flat().map((day) => {
              const inMonth = day.getMonth() === month
              const key = isoDay(day)
              const dayEvents = eventsByDay[key] ?? []
              const isToday = isoDay(day) === isoDay(today)

              return (
                <div
                  key={key}
                  style={{
                    minHeight: 96, padding: 6, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                    verticalAlign: 'top', background: inMonth ? 'transparent' : 'var(--bg)', color: inMonth ? 'inherit' : 'var(--text-4)',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: 24, height: 24, textAlign: 'center', lineHeight: '24px',
                    borderRadius: '50%', fontSize: 12, fontWeight: 600,
                    background: isToday ? 'var(--teal)' : 'transparent', color: isToday ? '#fff' : 'inherit',
                  }}>
                    {day.getDate()}
                  </span>
                  {dayEvents.map((ev) => {
                    const meta = TYPE_META[ev.event_type]
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', marginTop: 4, padding: '4px 6px', borderRadius: 6,
                          background: meta?.bg, color: meta?.tx, border: !ev.approved ? '1px dashed currentColor' : 'none',
                          opacity: ev.approved ? 1 : 0.6, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        {ev.time_start && <span style={{ fontWeight: 700 }}>{ev.time_start.slice(0, 5)} </span>}
                        {ev.title}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Pannello dettaglio ---- */}
      {selected && (
        <aside style={{ width: 320, flexShrink: 0, border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: TYPE_META[selected.event_type]?.bg, color: TYPE_META[selected.event_type]?.tx,
            }}>
              {TYPE_META[selected.event_type]?.label}
            </span>
            <button onClick={() => setSelected(null)} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-3)' }}>✕</button>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{selected.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {new Date(selected.event_date + 'T00:00:00').toLocaleDateString('it-IT', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          {selected.time_start && (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {selected.time_start.slice(0, 5)}
              {selected.time_end ? ` – ${selected.time_end.slice(0, 5)}` : ''}
            </p>
          )}
          {selected.location && <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{selected.location}</p>}
          {selected.description && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 12 }}>Descrizione</h3>
              <p style={{ fontSize: 13 }}>{selected.description}</p>
            </>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>
            proposto da {selected.profiles?.display_name ?? 'Utente'}
          </p>

          {!selected.approved && (
            <p style={{ fontSize: 13, color: 'var(--amber-tx)', marginTop: 8 }}>In attesa di approvazione</p>
          )}
          {!selected.approved && isCondoAdmin && (
            <button
              onClick={async () => { await approveEvent(selected.id); setSelected({ ...selected, approved: true }) }}
              style={{ ...tealBtn, marginTop: 8 }}
            >
              Approva
            </button>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={googleCalendarUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}
            >
              Aggiungi a Google Calendar
            </a>
            <button
              onClick={() => downloadIcs(selected)}
              style={{ display: 'block', width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--white)', color: 'var(--text-2)', cursor: 'pointer' }}
            >
              Scarica .ics (Apple / Outlook)
            </button>
          </div>

          {isCondoAdmin && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCreating(selected) /* riusa il form in modalita' modifica */}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, background: 'var(--white)', cursor: 'pointer' }}
              >
                Modifica
              </button>
              <button
                onClick={async () => {
                  if (confirm('Eliminare questo evento?')) {
                    await deleteEvent(selected.id)
                    setSelected(null)
                  }
                }}
                style={{ flex: 1, border: '1px solid #FCA5A5', color: 'var(--red-tx)', borderRadius: 8, padding: '6px 12px', fontSize: 13, background: 'var(--white)', cursor: 'pointer' }}
              >
                Elimina
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ---- Form creazione / modifica ---- */}
      {creating && (
        <EventFormModal
          initial={typeof creating === 'object' ? creating : null}
          onClose={() => setCreating(false)}
          onSubmit={async (values) => {
            const action = typeof creating === 'object'
              ? updateEvent(creating.id, values)
              : createEvent(values)
            const { error } = await action
            if (!error) { setCreating(false); setSelected(null) }
            return error
          }}
        />
      )}
    </div>
  )
}

function NavButton({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)',
      fontSize: 14, cursor: 'pointer', color: 'var(--text-2)',
    }}>
      {children}
    </button>
  )
}

function EventFormModal({ initial, onClose, onSubmit }) {
  const [values, setValues] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    eventDate: initial?.event_date ?? '',
    timeStart: initial?.time_start?.slice(0, 5) ?? '',
    timeEnd: initial?.time_end?.slice(0, 5) ?? '',
    eventType: initial?.event_type ?? 'general',
  })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))

  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>{initial ? 'Modifica evento' : 'Nuovo appuntamento'}</h2>
        <input style={field} placeholder="Titolo" value={values.title} onChange={set('title')} />
        <textarea style={{ ...field, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Descrizione" value={values.description} onChange={set('description')} />
        <input style={field} placeholder="Luogo" value={values.location} onChange={set('location')} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" style={{ ...field, flex: 1 }} value={values.eventDate} onChange={set('eventDate')} />
          <input type="time" style={field} value={values.timeStart} onChange={set('timeStart')} />
          <input type="time" style={field} value={values.timeEnd} onChange={set('timeEnd')} />
        </div>
        <select style={field} value={values.eventType} onChange={set('eventType')}>
          {Object.entries(TYPE_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
        {error && <p style={{ fontSize: 13, color: 'var(--red-tx)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--white)', cursor: 'pointer' }}>
            Annulla
          </button>
          <button
            onClick={async () => setError(await onSubmit(values))}
            style={tealBtn}
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  )
}

const tealBtn = {
  padding: '7px 14px', borderRadius: 8, border: 'none',
  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(15,41,38,0.55)', backdropFilter: 'blur(4px)',
  zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}

const card = {
  background: 'var(--white)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420,
  display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
}

const field = {
  width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 13, fontFamily: 'inherit',
}
