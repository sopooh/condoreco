// Genera link "Aggiungi a Google Calendar" e file .ics dagli eventi Condoreco.
// Nessuna API o OAuth: il template URL apre Google Calendar con l'evento
// precompilato e l'utente conferma con un click.

function compactDate(isoDate) {
  return isoDate.replaceAll('-', '') // '2026-07-18' -> '20260718'
}

function compactTime(time) {
  return time.slice(0, 5).replace(':', '') + '00' // '09:00:00' -> '090000'
}

function nextDayCompact(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10).replaceAll('-', '')
}

function plusOneHour(time) {
  const [h, m] = time.split(':').map(Number)
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    ctz: 'Europe/Rome',
  })

  const day = compactDate(event.event_date)

  if (event.time_start) {
    const end = event.time_end ?? plusOneHour(event.time_start)
    params.set('dates', `${day}T${compactTime(event.time_start)}/${day}T${compactTime(end)}`)
  } else {
    // Evento senza orario: giornata intera (fine esclusiva = giorno dopo)
    params.set('dates', `${day}/${nextDayCompact(event.event_date)}`)
  }

  if (event.description) params.set('details', event.description)
  if (event.location) params.set('location', event.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Bonus: file .ics per Apple Calendar / Outlook, scaricabile dal dettaglio evento
export function downloadIcs(event) {
  const day = compactDate(event.event_date)
  const dtStart = event.time_start ? `${day}T${compactTime(event.time_start)}` : day
  const dtEnd = event.time_start
    ? `${day}T${compactTime(event.time_end ?? plusOneHour(event.time_start))}`
    : nextDayCompact(event.event_date)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Condoreco//IT',
    'BEGIN:VEVENT',
    `UID:condoreco-${event.id}`,
    `DTSTART${event.time_start ? ';TZID=Europe/Rome' : ';VALUE=DATE'}:${dtStart}`,
    `DTEND${event.time_start ? ';TZID=Europe/Rome' : ';VALUE=DATE'}:${dtEnd}`,
    `SUMMARY:${(event.title ?? '').replace(/\n/g, ' ')}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : null,
    event.location ? `LOCATION:${event.location}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
