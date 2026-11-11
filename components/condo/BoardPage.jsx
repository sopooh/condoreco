'use client'

import { AlignLeft, CalendarDays, Check, ChevronDown as LChevronDown, ChevronLeft as LChevronLeft, ChevronRight as LChevronRight, Clock, Droplet, Ellipsis, Layers, MapPin, Plus, Search, Users, Wrench, X, Zap, CalendarCheck, CalendarRange, List } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { usePublicInterventions } from '@/hooks/usePublicInterventions'
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
  general:     { label: 'Generale',     color: '#0D676F', Icon: CalendarIcon },
  meeting:     { label: 'Riunione',     color: '#16A34A', Icon: PeopleIcon },
  maintenance: { label: 'Manutenzione', color: '#D97706', Icon: WrenchIcon },
  water:       { label: 'Acqua',        color: '#2F80ED', Icon: DropIcon },
  energy:      { label: 'Energia',      color: '#7C3AED', Icon: BoltIcon },
  services:    { label: 'Servizi',      color: '#475569', Icon: LayersIcon },
  other:       { label: 'Altro',        color: '#9CA3AF', Icon: DotsIcon },
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
  const [justCreated, setJustCreated] = useState(null) // evento appena creato (conferma)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [view, setViewState] = useState('month')     // 'week' | 'month' | 'list'
  const [viewMenu, setViewMenu] = useState(false)
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))

  // vista preferita ricordata sul dispositivo
  useEffect(() => {
    try {
      const v = window.localStorage.getItem('condoreco:calendar-view')
      if (v === 'week' || v === 'month' || v === 'list') setViewState(v)
    } catch { /* storage non disponibile */ }
  }, [])
  function setView(v) {
    setViewState(v)
    setViewMenu(false)
    try { window.localStorage.setItem('condoreco:calendar-view', v) } catch { /* ignore */ }
    if (v === 'week') {
      // settimana: quella di oggi se e' nel mese mostrato, altrimenti la prima del mese
      const ref = today.getFullYear() === year && today.getMonth() === month ? today : new Date(year, month, 1)
      goToWeek(mondayOf(ref))
    }
  }

  const { events, loading, error, isCondoAdmin, createEvent, updateEvent, deleteEvent, approveEvent } =
    useCalendarEvents(buildingId, year, month)

  // Interventi programmati dai residenti ("I tuoi interventi"): in calendario
  // per tutti, in sola lettura, come appuntamenti di manutenzione.
  const range = monthGridRange(year, month)
  const { items: interventions } = usePublicInterventions(buildingId, toLocalISODate(range.start), toLocalISODate(range.end))
  const allEvents = useMemo(() => [
    ...events,
    ...interventions.filter((i) => i.status === 'scheduled').map((i) => ({
      id: `int-${i.id}`, isIntervention: true, approved: true,
      title: i.title, description: null, location: i.location,
      event_date: i.scheduled_date, time_start: i.time_start, time_end: i.time_end,
      event_type: 'maintenance', profiles: null,
    })),
  ], [events, interventions])

  const q = query.trim().toLowerCase()
  const eventsByDay = useMemo(() => {
    const acc = {}
    allEvents
      .filter((ev) => !q || `${ev.title} ${ev.description ?? ''} ${ev.location ?? ''}`.toLowerCase().includes(q))
      .forEach((ev) => { (acc[ev.event_date] ??= []).push(ev) })
    // giornata intera prima, poi per orario
    Object.values(acc).forEach((list) => list.sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? '')))
    return acc
  }, [allEvents, q])

  const goTo = (y, m) => {
    const d = new Date(y, m, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(null)
    setOpenDay(null)
  }

  function goToWeek(start) {
    setWeekStart(start)
    setYear(start.getFullYear())
    setMonth(start.getMonth())
    setSelected(null)
    setOpenDay(null)
  }
  const step = (dir) => {
    if (view === 'week') goToWeek(addDays(weekStart, 7 * dir))
    else goTo(year, month + dir)
  }
  const goToday = () => {
    setViewMenu(false)
    if (view === 'week') goToWeek(mondayOf(today))
    else goTo(today.getFullYear(), today.getMonth())
  }
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const periodLabel = view === 'week' ? weekLabel(weekStart) : `${MONTH_NAMES[month]} ${year}`

  const maxChips = isMobile ? 3 : 4
  const grid = buildGrid(year, month)

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '14px 6px 96px' : '24px 24px 96px' }}>
      {/* ---- Toolbar ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, padding: isMobile ? '0 6px' : 0, marginBottom: 14 }}>
        <IconButton onClick={() => step(-1)} label={view === 'week' ? 'Settimana precedente' : 'Mese precedente'}><ChevronLeft /></IconButton>

        {/* mese/anno: tap apre il selettore nativo del mese */}
        <label style={{ ...pill, position: 'relative', flex: isMobile ? 1 : '0 0 auto', justifyContent: 'center', minWidth: isMobile ? 0 : 200 }}>
          <span style={{ fontWeight: 700, fontSize: isMobile ? (view === 'week' ? 14.5 : 16) : 17, whiteSpace: 'nowrap' }}>{periodLabel}</span>
          <CaretDown />
          <input
            type="month"
            aria-label="Scegli il mese"
            value={`${year}-${String(month + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (!y || !m) return
              if (view === 'week') goToWeek(mondayOf(new Date(y, m - 1, 1)))
              else goTo(y, m - 1)
            }}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', minHeight: 0 }}
          />
        </label>

        <IconButton onClick={() => step(1)} label={view === 'week' ? 'Settimana successiva' : 'Mese successivo'}><ChevronRight /></IconButton>

        <div style={{ flex: isMobile ? '0 0 auto' : 1 }} />

        <IconButton onClick={() => setSearchOpen((o) => !o)} label="Cerca negli eventi" active={searchOpen || !!q}><SearchIcon /></IconButton>
        <div style={{ position: 'relative' }}>
          <IconButton onClick={() => setViewMenu((o) => !o)} label="Vista del calendario e oggi" active={viewMenu}>
            <TodayIcon day={today.getDate()} />
          </IconButton>
          {viewMenu && (
            <>
              <div onClick={() => setViewMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 450 }} />
              <div role="menu" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 451, width: 230,
                background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16,
                boxShadow: '0 12px 32px rgba(0,0,0,0.14)', padding: 6,
              }}>
                <button role="menuitem" onClick={goToday} style={menuItem}>
                  <span style={menuIcon}><CalendarCheck size={18} strokeWidth={2} aria-hidden="true" /></span>Vai a oggi
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--text-4)', padding: '4px 10px' }}>VISTA</div>
                {[['week', 'Settimana', CalendarRange], ['month', 'Mese', CalendarDays], ['list', 'Lista appuntamenti', List]].map(([v, l, Icon]) => (
                  <button key={v} role="menuitemradio" aria-checked={view === v} onClick={() => setView(v)}
                    style={{ ...menuItem, background: view === v ? 'var(--teal-lt)' : 'transparent', color: view === v ? 'var(--teal-dk)' : 'var(--text)', fontWeight: view === v ? 800 : 600 }}>
                    <span style={menuIcon}><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                    <span style={{ flex: 1 }}>{l}</span>
                    {view === v && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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

      {view === 'month' && (
        <>
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

        </>
      )}

      {/* ---- Settimana: un giorno per riga, titoli interi ---- */}
      {view === 'week' && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.6 : 1 }}>
          {weekDays.map((day, i) => {
            const iso = toLocalISODate(day)
            const isToday = iso === todayIso
            const dayEvents = eventsByDay[iso] ?? []
            return (
              <div key={iso} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--border)' : 'none', background: isToday ? 'rgba(13,103,111,0.05)' : 'transparent' }}>
                <button type="button" onClick={() => setOpenDay(iso)} aria-label={`${longDate(iso)}, ${dayEvents.length} eventi`}
                  style={{ width: 52, flexShrink: 0, minHeight: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: isToday ? 'var(--teal)' : 'var(--text-4)' }}>{WEEKDAYS[i]}</span>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, background: isToday ? 'var(--teal)' : 'transparent', color: isToday ? '#fff' : 'var(--text)' }}>{day.getDate()}</span>
                </button>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  {dayEvents.length === 0 ? (
                    <button type="button" onClick={() => setOpenDay(iso)} style={{ minHeight: 0, border: 'none', background: 'none', padding: '6px 0', textAlign: 'left', fontSize: 13, color: 'var(--text-4)', cursor: 'pointer' }}>Nessun appuntamento</button>
                  ) : dayEvents.map((ev) => <AgendaRow key={ev.id} ev={ev} onClick={() => setSelected(ev)} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- Lista appuntamenti del mese ---- */}
      {view === 'list' && (() => {
        const days = Object.keys(eventsByDay)
          .filter((iso) => { const d = new Date(iso + 'T00:00:00'); return d.getMonth() === month && d.getFullYear() === year })
          .sort()
        if (!loading && days.length === 0) {
          return (
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Nessun appuntamento a {MONTH_NAMES[month].toLowerCase()}</div>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '0 0 14px' }}>Puoi aggiungerne uno con il pulsante +.</p>
              <button onClick={() => setCreating({ date: todayIso })} style={{ ...primaryBtn, height: 44 }}>+ Nuovo appuntamento</button>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: loading ? 0.6 : 1 }}>
            {days.map((iso) => {
              const past = iso < todayIso
              return (
                <section key={iso} style={{ opacity: past ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 6px 6px' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, textTransform: 'capitalize', color: iso === todayIso ? 'var(--teal)' : 'var(--text)' }}>{iso === todayIso ? 'Oggi' : longDate(iso)}</span>
                    {iso === todayIso && <span style={{ fontSize: 12.5, color: 'var(--text-3)', textTransform: 'capitalize' }}>{longDate(iso)}</span>}
                  </div>
                  <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {eventsByDay[iso].map((ev) => <AgendaRow key={ev.id} ev={ev} onClick={() => setSelected(ev)} />)}
                  </div>
                </section>
              )
            })}
          </div>
        )
      })()}

      {q && !loading && Object.keys(eventsByDay).length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, textAlign: 'center' }}>
          Nessun evento corrisponde a &quot;{query}&quot; in questo {view === 'week' ? 'periodo' : 'mese'}.
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
            <button onClick={() => setOpenDay(null)} aria-label="Chiudi" style={closeBtn}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
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
            <button onClick={() => setSelected(null)} aria-label="Chiudi" style={closeBtn}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
          </div>

          <h2 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{selected.title}</h2>
          <DetailLine icon={<CalendarIcon />}><span style={{ textTransform: 'capitalize' }}>{longDate(selected.event_date)}</span></DetailLine>
          <DetailLine icon={<ClockIcon />}>{timeRange(selected)}</DetailLine>
          {selected.location && <DetailLine icon={<PinIcon />}>{selected.location}</DetailLine>}
          {selected.description && (
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{selected.description}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '12px 0 0' }}>
            {selected.isIntervention
              ? 'Intervento programmato da un residente con il proprio manutentore'
              : `Proposto da ${selected.profiles?.display_name ?? 'un residente'}`}
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

          {isCondoAdmin && !selected.isIntervention && (
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
            const isNew = !creating.id
            const { error, event } = isNew ? await createEvent(values) : await updateEvent(creating.id, values)
            if (!error) {
              setCreating(false); setSelected(null); setOpenDay(null)
              if (isNew && event) setJustCreated(event)
            }
            return error
          }}
        />
      )}

      {/* ---- Conferma: appuntamento creato + aggiungi al calendario personale ---- */}
      {justCreated && (
        <Sheet isMobile={isMobile} onClose={() => setJustCreated(null)}>
          <div style={{ textAlign: 'center', padding: '6px 4px 2px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-lt)', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <CheckIcon />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Appuntamento creato</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>{justCreated.title}</strong>
              <span style={{ textTransform: 'capitalize' }}> · {longDate(justCreated.event_date)}</span>
              {justCreated.time_start ? ` · ${timeRange(justCreated)}` : ''}
            </p>
            {!justCreated.approved && (
              <p style={{ fontSize: 13, color: '#8A5A00', background: '#FFF7E6', borderRadius: 10, padding: '8px 10px', margin: '12px 0 0' }}>
                Sarà visibile agli altri residenti dopo l&apos;approvazione dell&apos;amministratore.
              </p>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', margin: '20px 0 8px' }}>Aggiungilo al tuo calendario</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href={googleCalendarUrl(justCreated)} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, height: 48, textDecoration: 'none' }}>
              Aggiungi a Google Calendar
            </a>
            <button onClick={() => downloadIcs(justCreated)} style={{ ...secondaryBtn, height: 48 }}>Apple Calendar / Outlook (.ics)</button>
            <button onClick={() => setJustCreated(null)} style={{ ...secondaryBtn, height: 44, border: 'none', color: 'var(--text-3)' }}>Fatto</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function AgendaRow({ ev, onClick }) {
  const meta = typeMeta(ev.event_type)
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'stretch', gap: 10, width: '100%', minHeight: 0, padding: '8px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
      border: ev.approved ? '1px solid var(--border)' : '1.5px dashed var(--text-4)', background: 'var(--white)', color: 'var(--text)',
    }}>
      <span style={{ width: 4, borderRadius: 4, background: meta.color, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{ev.title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
          {timeRange(ev)}{ev.location ? ` · ${ev.location}` : ''} · {meta.label}{!ev.approved ? ' · In attesa' : ''}
        </span>
      </span>
    </button>
  )
}

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
function weekLabel(start) {
  const end = addDays(start, 6)
  const m = (d) => d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${m(end)} ${end.getFullYear()}`
    : `${start.getDate()} ${m(start)} – ${end.getDate()} ${m(end)} ${end.getFullYear()}`
}

const menuItem = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 0, padding: '10px 10px', border: 'none', borderRadius: 10, background: 'transparent', color: 'var(--text)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }
const menuIcon = { display: 'inline-flex', color: 'var(--teal)' }

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
  const timeOrderOk = !values.timeStart || !values.timeEnd || values.timeEnd > values.timeStart
  const canSave = values.title.trim() && values.eventDate && timeOrderOk && !saving

  const shortDate = values.eventDate
    ? new Date(values.eventDate + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
        .replace(/ (\w)/, (m, c) => ' ' + c.toUpperCase())
    : 'Scegli una data'

  return (
    <Sheet isMobile={isMobile} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--teal-lt)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarIcon size={24} />
        </span>
        <h2 style={{ flex: 1, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
          {initial ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
        </h2>
        <button onClick={onClose} aria-label="Chiudi" style={{ ...closeBtn, width: 40, height: 40 }}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'block' }}>
          <div style={fieldLabel}>Titolo</div>
          <input style={field} placeholder="Es. Assemblea condominiale" value={values.title} onChange={set('title')} />
        </label>

        <div>
          <div style={fieldLabel}>Categoria</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(TYPE_META).map(([k, m]) => {
              const on = values.eventType === k
              const Icon = m.Icon
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setValues((v) => ({ ...v, eventType: k }))} style={{
                  minHeight: 0, height: 40, padding: '0 14px', borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  border: `1.5px solid ${on ? m.color : 'transparent'}`,
                  background: `${m.color}${on ? '33' : '17'}`, color: 'var(--text)',
                }}>
                  <span style={{ color: on ? m.color : 'var(--text-2)', display: 'inline-flex' }}><Icon /></span>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={fieldLabel}>Data</div>
          <PickerBox icon={<CalendarIcon />} text={shortDate} muted={!values.eventDate}>
            <input type="date" aria-label="Data" value={values.eventDate} onChange={set('eventDate')} style={hiddenInput} />
          </PickerBox>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={fieldLabel}>Inizio</div>
            <PickerBox icon={<ClockIcon />} text={values.timeStart || '--:--'} muted={!values.timeStart}>
              <input type="time" aria-label="Ora di inizio" value={values.timeStart} onChange={set('timeStart')} style={hiddenInput} />
            </PickerBox>
          </div>
          <div>
            <div style={fieldLabel}>Fine</div>
            <PickerBox icon={<ClockIcon />} text={values.timeEnd || '--:--'} muted={!values.timeEnd}>
              <input type="time" aria-label="Ora di fine" value={values.timeEnd} onChange={set('timeEnd')} style={hiddenInput} />
            </PickerBox>
          </div>
        </div>
        {!timeOrderOk && <p style={{ fontSize: 13, color: '#B42318', margin: '-8px 0 0' }}>L&apos;ora di fine deve essere dopo l&apos;inizio.</p>}

        <IconField icon={<PinIcon />}>
          <input style={{ ...field, paddingLeft: 46 }} placeholder="Luogo (es. cortile, sala comune)" value={values.location} onChange={set('location')} />
        </IconField>
        <IconField icon={<LinesIcon />} top>
          <textarea style={{ ...field, paddingLeft: 46, minHeight: 110, resize: 'vertical' }} placeholder="Descrizione" value={values.description} onChange={set('description')} />
        </IconField>

        {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...secondaryBtn, height: 52, fontSize: 16, fontWeight: 700 }}>Annulla</button>
          <button
            disabled={!canSave}
            onClick={async () => { setSaving(true); setError(await onSubmit(values)); setSaving(false) }}
            style={{ ...primaryBtn, height: 52, fontSize: 16, opacity: canSave ? 1 : 0.5 }}
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// Campo "finto" con icona, testo e freccia; il selettore nativo (data/ora)
// e' un input trasparente sopra, cosi su iPhone si apre la rotella di sistema.
function PickerBox({ icon, text, muted, children }) {
  return (
    <div style={{ ...field, position: 'relative', display: 'flex', alignItems: 'center', gap: 12, height: 50, padding: '0 14px' }}>
      <span style={{ color: 'var(--text-2)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 16, color: muted ? 'var(--text-4)' : 'var(--text)' }}>{text}</span>
      <span style={{ color: 'var(--text-2)', display: 'inline-flex' }}><ChevronDown /></span>
      {children}
    </div>
  )
}

function IconField({ icon, top = false, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: top ? 14 : '50%', transform: top ? 'none' : 'translateY(-50%)', color: 'var(--text-2)', display: 'inline-flex', pointerEvents: 'none' }}>{icon}</span>
      {children}
    </div>
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
  width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px',
  fontSize: 16, fontFamily: 'inherit', background: 'var(--white)', boxSizing: 'border-box',
}
const fieldLabel = { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }
const hiddenInput = { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', minHeight: 0, border: 'none' }

/* ---- icone ---- */
const svg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
function ChevronLeft({ size = 20 } = {}) { return <LChevronLeft size={size} strokeWidth={2} aria-hidden="true" /> }
function ChevronRight({ size = 20 } = {}) { return <LChevronRight size={size} strokeWidth={2} aria-hidden="true" /> }
function CaretDown({ size = 16 } = {}) { return <LChevronDown size={size} strokeWidth={2} aria-hidden="true" /> }
function SearchIcon({ size = 20 } = {}) { return <Search size={size} strokeWidth={2} aria-hidden="true" /> }
function PlusIcon({ size = 28 } = {}) { return <Plus size={size} strokeWidth={2.2} aria-hidden="true" /> }
function CalendarIcon({ size = 18 }) { return <CalendarDays size={size} strokeWidth={2} aria-hidden="true" /> }
function PeopleIcon({ size = 18 } = {}) { return <Users size={size} strokeWidth={2} aria-hidden="true" /> }
function WrenchIcon({ size = 18 } = {}) { return <Wrench size={size} strokeWidth={2} aria-hidden="true" /> }
function DropIcon({ size = 18 } = {}) { return <Droplet size={size} strokeWidth={2} aria-hidden="true" /> }
function BoltIcon({ size = 18 } = {}) { return <Zap size={size} strokeWidth={2} aria-hidden="true" /> }
function LayersIcon({ size = 18 } = {}) { return <Layers size={size} strokeWidth={2} aria-hidden="true" /> }
function DotsIcon({ size = 18 } = {}) { return <Ellipsis size={size} strokeWidth={3} aria-hidden="true" /> }
function LinesIcon({ size = 18 } = {}) { return <AlignLeft size={size} strokeWidth={2} aria-hidden="true" /> }
function ChevronDown({ size = 18 } = {}) { return <LChevronDown size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckIcon({ size = 28 } = {}) { return <Check size={size} strokeWidth={2.4} aria-hidden="true" /> }
function ClockIcon({ size = 20 } = {}) { return <Clock size={size} strokeWidth={2} aria-hidden="true" /> }
function PinIcon({ size = 18 } = {}) { return <MapPin size={size} strokeWidth={2} aria-hidden="true" /> }
function TodayIcon({ day }) {
  return (
    <svg {...svg} width={24} height={24} strokeWidth={1.8}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v3.5M16 2.5v3.5" />
      <text x="12" y="17.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">{day}</text>
    </svg>
  )
}
