'use client'

import { useMemo, useState } from 'react'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useIsMobile } from '@/hooks/useIsMobile'
import { googleCalendarUrl, downloadIcs } from '@/lib/calendarLinks'
import { toLocalISODate, monthGridRange } from '@/lib/localDate'

// Bacheca condominiale a calendario mensile, stile Google Calendar:
// griglia lun-dom a 6 settimane, eventi come etichette piene colorate per
// tipo, "+N" quando non entrano, foglio del giorno al tap su una cella,
// dettaglio evento in un foglio (dal basso su mobile, centrato su desktop),
// "+" flottante per un nuovo appuntamento.

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const WEEKDAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']

const TYPE_META = {
  general:     { label: 'Generale',     color: '#2F80ED' },
  meeting:     { label: 'Riunione',     color: '#16A34A' },
  maintenance: { label: 'Manutenzione', color: '#E8A317' },
  water:       { label: 'Acqua',        color: '#E5484D' },
}
const typeMeta = (t) => TYPE_META[t] || TYPE_META.general

function buildGrid(year, month) {
  const { start } = monthGridRange(year, month)
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

const longDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long',
})

const timeRange = (ev) => ev.time_start
  ? ev.time_start.slice(0, 5) + (ev.time_end ? ` - ${ev.time_end.slice(0, 5)}` : '')
  : 'Tutto il giorno'

export default function BoardPage({ buildingId }) {
  const isMobile = useIsMobile()
  const today = new Date()
  const todayIso = toLocalISODate(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)     // evento aperto
  const [openDay, setOpenDay] = useState(null)       // giorno aperto (YYYY-MM-DD)
  const [creating, setCreating] = useState(false)    // false | { date } | evento da modificare
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const { events, loading, error, isCondoAdmin, createEvent, updateEvent, deleteEvent, approveEvent } =
    useCalendarEvents(buildingId, year, month)

  const q = query.trim().toLowerCase()
  const eventsByDay = useMemo(() => {
    const acc = {}
    events
      .filter((ev) => !q || `${ev.title} ${ev.description ?? ''} ${ev.location ?? ''}`.toLowerCase().includes(q))
      .forEach((ev) => { (acc[ev.event_date] ??= []).push(ev) })
    // giornata intera prima, poi per orario
    Object.values(acc).forEach((list) => list.sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? '')))
    return acc
  }, [events, q])

  const goTo = (y, m) => {
    const d = new Date(y, m, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(null)
    setOpenDay(null)
  }

  const maxChips = isMobile ? 3 : 4
  const grid = buildGrid(year, month)

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '14px 6px 96px' : '24px 24px 96px' }}>
      {/* ---- Toolbar ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, padding: isMobile ? '0 6px' : 0, marginBottom: 14 }}>
        <IconButton onClick={() => goTo(year, month - 1)} label="Mese precedente"><ChevronLeft /></IconButton>

        {/* mese/anno: tap apre il selettore nativo del mese */}
        <label style={{ ...pill, position: 'relative', flex: isMobile ? 1 : '0 0 auto', justifyContent: 'center', minWidth: isMobile ? 0 : 200 }}>
          <span style={{ fontWeight: 700, fontSize: isMobile ? 16 : 17, whiteSpace: 'nowrap' }}>{MONTH_NAMES[month]} {year}</span>
          <CaretDown />
          <input
            type="month"
            aria-label="Scegli il mese"
            value={`${year}-${String(month + 1).padStart(2, '0')}`}
            onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); if (y && m) goTo(y, m - 1) }}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', minHeight: 0 }}
          />
        </label>

        <IconButton onClick={() => goTo(year, month + 1)} label="Mese successivo"><ChevronRight /></IconButton>

        <div style={{ flex: isMobile ? '0 0 auto' : 1 }} />

        <IconButton onClick={() => setSearchOpen((o) => !o)} label="Cerca negli eventi" active={searchOpen || !!q}><SearchIcon /></IconButton>
        <IconButton onClick={() => goTo(today.getFullYear(), today.getMonth())} label="Torna a oggi">
          <TodayIcon day={today.getDate()} />
        </IconButton>
        {!isMobile && (
          <button onClick={() => setCreating({ date: todayIso })} style={{ ...primaryBtn, marginLeft: 6 }}>
            + Nuovo appuntamento
          </button>
        )}
      </div>

      {searchOpen && (
        <div style={{ padding: isMobile ? '0 6px' : 0, marginBottom: 12 }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per titolo, descrizione o luogo"
            style={{ ...field, height: 42, borderRadius: 12, fontSize: 14 }}
          />
        </div>
      )}

      {/* ---- Legenda tipi ---- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: isMobile ? '0 8px' : '0 2px', marginBottom: 12 }}>
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />{m.label}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed var(--text-4)' }} />In attesa di approvazione
        </span>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#B42318', padding: '0 8px', marginBottom: 10 }}>
          Non riesco a caricare gli eventi. Riprova tra poco.
        </p>
      )}

      {/* ---- Griglia ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: 6 }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{ textAlign: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 600, letterSpacing: 0.6, color: 'var(--text-4)', padding: '6px 0' }}>
            {wd}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden',
        opacity: loading ? 0.6 : 1, transition: 'opacity 150ms ease',
      }}>
        {grid.map((day, i) => {
          const iso = toLocalISODate(day)
          const inMonth = day.getMonth() === month
          const isToday = iso === todayIso
          const dayEvents = eventsByDay[iso] ?? []
          const visible = dayEvents.length > maxChips ? dayEvents.slice(0, maxChips - 1) : dayEvents
          const hidden = dayEvents.length - visible.length

          return (
            <div
              key={iso}
              role="button"
              tabIndex={0}
              aria-label={`${longDate(iso)}, ${dayEvents.length} eventi`}
              onClick={() => setOpenDay(iso)}
              onKeyDown={(e) => { if (e.key === 'Enter') setOpenDay(iso) }}
              style={{
                minHeight: isMobile ? 104 : 124, padding: isMobile ? '6px 3px' : '8px 6px',
                borderRight: (i % 7) === 6 ? 'none' : '1px solid var(--border)',
                borderBottom: i >= 35 ? 'none' : '1px solid var(--border)',
                background: isToday ? 'rgba(13,103,111,0.06)' : inMonth ? 'transparent' : '#FAFAFA',
                boxShadow: isToday ? 'inset 0 0 0 2px var(--teal)' : 'none',
                cursor: 'pointer', minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', marginBottom: 6, paddingLeft: isMobile ? 0 : 2 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '50%', fontSize: 14, fontWeight: isToday ? 700 : 500,
                  background: isToday ? 'var(--teal)' : 'transparent',
                  color: isToday ? '#fff' : inMonth ? 'var(--text)' : 'var(--text-4)',
                }}>
                  {day.getDate()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {visible.map((ev) => (
                  <EventChip key={ev.id} ev={ev} compact={isMobile} dim={!inMonth}
                    onClick={(e) => { e.stopPropagation(); setSelected(ev) }} />
                ))}
                {hidden > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', paddingLeft: 4, lineHeight: '18px' }}>
                    +{hidden}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {q && !loading && Object.keys(eventsByDay).length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, textAlign: 'center' }}>
          Nessun evento corrisponde a &quot;{query}&quot; in questo mese.
        </p>
      )}

      {/* ---- "+" flottante ---- */}
      {isMobile && (
        <button
          onClick={() => setCreating({ date: todayIso })}
          aria-label="Nuovo appuntamento"
          style={{
            position: 'fixed', right: 20, bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 400,
            width: 60, height: 60, borderRadius: 18, border: 'none', background: 'var(--teal)', color: '#fff',
            boxShadow: '0 8px 24px rgba(13,103,111,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PlusIcon />
        </button>
      )}

      {/* ---- Foglio del giorno ---- */}
      {openDay && !selected && !creating && (
        <Sheet isMobile={isMobile} onClose={() => setOpenDay(null)}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, textTransform: 'capitalize', margin: 0 }}>{longDate(openDay)}</h2>
            <button onClick={() => setOpenDay(null)} aria-label="Chiudi" style={closeBtn}>✕</button>
          </div>
          {(eventsByDay[openDay] ?? []).length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 16px' }}>Nessun appuntamento in questo giorno.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {eventsByDay[openDay].map((ev) => (
                <button key={ev.id} onClick={() => setSelected(ev)} style={dayRow}>
                  <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: typeMeta(ev.event_type).color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {timeRange(ev)}{ev.location ? ` · ${ev.location}` : ''}{!ev.approved ? ' · In attesa' : ''}
                    </span>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setCreating({ date: openDay })} style={{ ...primaryBtn, width: '100%', height: 46 }}>
            + Aggiungi appuntamento
          </button>
        </Sheet>
      )}

      {/* ---- Dettaglio evento ---- */}
      {selected && !creating && (
        <Sheet isMobile={isMobile} onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, color: '#fff', background: typeMeta(selected.event_type).color,
            }}>
              {typeMeta(selected.event_type).label}
            </span>
            <button onClick={() => setSelected(null)} aria-label="Chiudi" style={closeBtn}>✕</button>
          </div>

          <h2 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{selected.title}</h2>
          <DetailLine icon={<CalendarIcon />}><span style={{ textTransform: 'capitalize' }}>{longDate(selected.event_date)}</span></DetailLine>
          <DetailLine icon={<ClockIcon />}>{timeRange(selected)}</DetailLine>
          {selected.location && <DetailLine icon={<PinIcon />}>{selected.location}</DetailLine>}
          {selected.description && (
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{selected.description}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '12px 0 0' }}>
            Proposto da {selected.profiles?.display_name ?? 'un residente'}
          </p>

          {!selected.approved && (
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: '#FFF7E6', color: '#8A5A00', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              In attesa di approvazione
              {isCondoAdmin && (
                <button
                  onClick={async () => { await approveEvent(selected.id); setSelected({ ...selected, approved: true }) }}
                  style={{ ...primaryBtn, padding: '7px 14px', fontSize: 13 }}
                >
                  Approva
                </button>
              )}
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a href={googleCalendarUrl(selected)} target="_blank" rel="noopener noreferrer" style={secondaryBtn}>
              Google Calendar
            </a>
            <button onClick={() => downloadIcs(selected)} style={secondaryBtn}>Apple / Outlook</button>
          </div>

          {isCondoAdmin && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setCreating(selected)} style={secondaryBtn}>Modifica</button>
              <button
                onClick={async () => {
                  if (confirm('Eliminare questo evento?')) {
                    await deleteEvent(selected.id)
                    setSelected(null)
                  }
                }}
                style={{ ...secondaryBtn, color: '#B42318', borderColor: '#F5C2C0' }}
              >
                Elimina
              </button>
            </div>
          )}
        </Sheet>
      )}

      {/* ---- Form creazione / modifica ---- */}
      {creating && (
        <EventFormModal
          isMobile={isMobile}
          initial={creating.id ? creating : null}
          defaultDate={creating.date}
          onClose={() => setCreating(false)}
          onSubmit={async (values) => {
            const { error } = creating.id ? await updateEvent(creating.id, values) : await createEvent(values)
            if (!error) { setCreating(false); setSelected(null) }
            return error
          }}
        />
      )}
    </div>
  )
}

function EventChip({ ev, compact, dim, onClick }) {
  const color = typeMeta(ev.event_type).color
  const pending = !ev.approved
  return (
    <button
      onClick={onClick}
      title={ev.title}
      style={{
        display: 'block', width: '100%', minHeight: 0, textAlign: 'left',
        padding: compact ? '2px 4px' : '3px 7px', borderRadius: compact ? 5 : 6,
        fontSize: compact ? 11.5 : 12.5, fontWeight: 600, lineHeight: compact ? '16px' : '18px',
        // su mobile il testo arriva al bordo (clip): con i puntini restano 3-4 lettere
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: compact ? 'clip' : 'ellipsis',
        background: pending ? 'transparent' : color, color: pending ? color : '#fff',
        border: pending ? `1.5px dashed ${color}` : '1.5px solid transparent',
        opacity: dim ? 0.55 : 1, cursor: 'pointer',
      }}
    >
      {!compact && ev.time_start && <span style={{ fontWeight: 800 }}>{ev.time_start.slice(0, 5)} </span>}
      {ev.title}
    </button>
  )
}

// Foglio: dal basso su mobile, finestra centrata su desktop
function Sheet({ isMobile, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,41,38,0.45)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--white)', width: '100%', maxWidth: isMobile ? '100%' : 440,
          borderRadius: isMobile ? '20px 20px 0 0' : 18,
          padding: isMobile ? '10px 20px calc(20px + env(safe-area-inset-bottom))' : 24,
          maxHeight: isMobile ? '85vh' : '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}
      >
        {isMobile && <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0 auto 14px' }} />}
        {children}
      </div>
    </div>
  )
}

function DetailLine({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
      <span style={{ color: 'var(--text-4)', display: 'inline-flex' }}>{icon}</span>
      {children}
    </div>
  )
}

function IconButton({ onClick, label, active = false, children }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={{
      width: 44, height: 44, minHeight: 44, flexShrink: 0, borderRadius: 12,
      border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
      background: active ? 'var(--teal-lt)' : 'var(--white)', color: active ? 'var(--teal-dk)' : 'var(--text)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function EventFormModal({ isMobile, initial, defaultDate, onClose, onSubmit }) {
  const [values, setValues] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    eventDate: initial?.event_date ?? defaultDate ?? '',
    timeStart: initial?.time_start?.slice(0, 5) ?? '',
    timeEnd: initial?.time_end?.slice(0, 5) ?? '',
    eventType: initial?.event_type ?? 'general',
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const canSave = values.title.trim() && values.eventDate && !saving

  return (
    <Sheet isMobile={isMobile} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{initial ? 'Modifica appuntamento' : 'Nuovo appuntamento'}</h2>
        <button onClick={onClose} aria-label="Chiudi" style={closeBtn}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={{ ...field, fontSize: 16, fontWeight: 600 }} placeholder="Titolo" value={values.title} onChange={set('title')} />

        <div>
          <div style={fieldLabel}>Tipo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(TYPE_META).map(([k, m]) => {
              const on = values.eventType === k
              return (
                <button key={k} type="button" onClick={() => setValues((v) => ({ ...v, eventType: k }))} style={{
                  minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${m.color}`, background: on ? m.color : 'transparent', color: on ? '#fff' : m.color,
                }}>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={fieldLabel}>Data</div>
          <input type="date" style={field} value={values.eventDate} onChange={set('eventDate')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={fieldLabel}>Inizio</div>
            <input type="time" style={field} value={values.timeStart} onChange={set('timeStart')} />
          </div>
          <div>
            <div style={fieldLabel}>Fine</div>
            <input type="time" style={field} value={values.timeEnd} onChange={set('timeEnd')} />
          </div>
        </div>
        <input style={field} placeholder="Luogo (es. cortile, sala comune)" value={values.location} onChange={set('location')} />
        <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} placeholder="Descrizione" value={values.description} onChange={set('description')} />

        {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={secondaryBtn}>Annulla</button>
          <button
            disabled={!canSave}
            onClick={async () => { setSaving(true); setError(await onSubmit(values)); setSaving(false) }}
            style={{ ...primaryBtn, height: 46, opacity: canSave ? 1 : 0.5 }}
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

/* ---- stili ---- */
const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px',
  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer',
}
const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 18px', height: 44, borderRadius: 12, border: 'none',
  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44,
  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--white)',
  color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none',
}
const closeBtn = {
  width: 36, height: 36, minHeight: 0, borderRadius: '50%', border: 'none', background: 'var(--bg)',
  color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', flexShrink: 0,
}
const dayRow = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 12px',
  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', color: 'var(--text-4)',
}
const field = {
  width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
  fontSize: 14, fontFamily: 'inherit', background: 'var(--white)', boxSizing: 'border-box',
}
const fieldLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }

/* ---- icone ---- */
const svg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
function ChevronLeft() { return <svg {...svg}><path d="M15 6l-6 6 6 6" /></svg> }
function ChevronRight() { return <svg {...svg}><path d="M9 6l6 6-6 6" /></svg> }
function CaretDown() { return <svg {...svg} width={16} height={16}><path d="M7 10l5 5 5-5" fill="currentColor" stroke="none" /></svg> }
function SearchIcon() { return <svg {...svg}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg> }
function PlusIcon() { return <svg {...svg} width={28} height={28} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg> }
function CalendarIcon() { return <svg {...svg} width={18} height={18}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg> }
function ClockIcon() { return <svg {...svg} width={18} height={18}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> }
function PinIcon() { return <svg {...svg} width={18} height={18}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg> }
function TodayIcon({ day }) {
  return (
    <svg {...svg} width={24} height={24} strokeWidth={1.8}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v3.5M16 2.5v3.5" />
      <text x="12" y="17.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">{day}</text>
    </svg>
  )
}
