// Template delle slide Instagram (1080x1350, formato 4:5).
// Renderizzati da next/og (Satori): solo flexbox, ogni div con più figli
// deve avere display:flex. Niente caratteri fuori dal subset latin di Inter
// (frecce e stelle sono SVG).

export const SLIDE_W = 1080
export const SLIDE_H = 1350

// Safe area: la griglia del profilo ritaglia i post 4:5 in 3:4 (circa 34px
// per lato) e le interfacce coprono i bordi. Tutto il contenuto sta dentro
// questi margini, nessun elemento tocca il bordo.
export const SAFE_X = 100
export const SAFE_Y = 110

const C = {
  teal: '#0D676F',
  tealDk: '#0A5056',
  tealLt: '#E1ECED',
  tealMid: '#79ABAF',
  orange: '#E8651A',
  orangeLt: '#FDEBDD',
  ink: '#111827',
  ink2: '#374151',
  ink3: '#6B7280',
  line: '#E5E7EB',
  paper: '#F9FAFB',
  white: '#FFFFFF',
  amber: '#D97706',
  red: '#DC2626',
}

const THEMES = {
  teal: { bg: C.teal, fg: C.white, sub: '#CFE3E5', accent: C.orange, chipBg: C.orange, chipFg: C.white },
  light: { bg: C.paper, fg: C.ink, sub: C.ink3, accent: C.teal, chipBg: C.tealLt, chipFg: C.tealDk },
  orange: { bg: C.orange, fg: C.white, sub: '#FFE4D3', accent: C.white, chipBg: C.white, chipFg: C.orange },
  dark: { bg: '#0B2E31', fg: C.white, sub: C.tealMid, accent: C.orange, chipBg: C.orange, chipFg: C.white },
}

function theme(name) {
  return THEMES[name] || THEMES.light
}

export function scoreHex(score) {
  if (score == null) return '#9CA3AF'
  if (score >= 4) return C.teal
  if (score >= 3) return C.amber
  return C.red
}

function fmtScore(s) {
  if (s == null) return '-'
  return Number(s).toFixed(1).replace('.', ',')
}

// ── Elementi comuni ─────────────────────────────────────────────────────────

import { findCharacter, parseDialogue } from './characters'

// Logo reale (cerchio teal con uccello). Le data URI arrivano da render.jsx;
// su sfondi colorati si usa la versione bianca (uccello trasparente).
let LOGOS = { teal: null, white: null }
export function setLogos(l) { LOGOS = l }

// Avatar dei personaggi (data URI per id), caricati da render.jsx
let AVATARS = {}
let MASCOTS = {}
export function setAvatars(a) { AVATARS = a }
export function setMascots(m) { MASCOTS = m }

function Avatar({ character, size }) {
  const src = character ? AVATARS[character.id] : null
  return src
    ? <img src={src} width={size} height={size} alt="" />
    : <div style={{ width: size, height: size, borderRadius: size / 2, background: C.tealMid }} />
}

function Wordmark({ color }) {
  const onColor = color === C.white
  const src = onColor ? LOGOS.white : LOGOS.teal
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {src ? (
        <img src={src} width={52} height={52} alt="" />
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 26, background: onColor ? C.white : C.teal }} />
      )}
      <div style={{ fontSize: 34, fontWeight: 800, color, letterSpacing: -0.5 }}>condoreco</div>
    </div>
  )
}

function Arrow({ color, size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Frame({ t, children, footer = 'swipe' }) {
  return (
    <div style={{
      width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.fg, padding: `${SAFE_Y}px ${SAFE_X}px`, fontFamily: 'Inter',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark color={t.fg === C.white ? C.white : C.teal} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 56 }}>
        {children}
      </div>
      {footer === 'swipe' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: t.sub }}>Scorri</div>
          <Arrow color={t.accent} />
        </div>
      )}
      {footer === 'site' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: t.sub }}>condoreco.com</div>
          <Arrow color={t.accent} />
        </div>
      )}
    </div>
  )
}

function Chip({ t, children }) {
  return (
    <div style={{ display: 'flex' }}>
      <div style={{
        background: t.chipBg, color: t.chipFg, fontSize: 26, fontWeight: 800,
        padding: '12px 24px', borderRadius: 999, letterSpacing: 2, textTransform: 'uppercase',
      }}>{children}</div>
    </div>
  )
}

function ScoreBadge({ score, size = 120 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, background: scoreHex(score),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.white, fontSize: size * 0.42, fontWeight: 800,
    }}>{fmtScore(score)}</div>
  )
}

function Bar({ label, value }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / 5))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30 }}>
        <div style={{ fontWeight: 600, color: C.ink2 }}>{label}</div>
        <div style={{ fontWeight: 800, color: value == null ? C.ink3 : scoreHex(value) }}>{fmtScore(value)}</div>
      </div>
      <div style={{ display: 'flex', height: 16, borderRadius: 8, background: C.line }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: 16, borderRadius: 8, background: scoreHex(value) }} />
      </div>
    </div>
  )
}

// ── Template ────────────────────────────────────────────────────────────────

function Cover({ p }) {
  const t = theme(p.theme || 'teal')
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 40 }}>
        {p.kicker ? <Chip t={t}>{p.kicker}</Chip> : null}
        <div style={{ fontSize: p.title?.length > 60 ? 84 : 104, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          {p.title || 'Titolo'}
        </div>
        {p.subtitle ? (
          <div style={{ fontSize: 40, lineHeight: 1.35, color: t.sub, fontWeight: 400 }}>{p.subtitle}</div>
        ) : null}
      </div>
    </Frame>
  )
}

function Tip({ p }) {
  const t = theme(p.theme || 'light')
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 36 }}>
        <div style={{ fontSize: 180, fontWeight: 800, color: t.accent, lineHeight: 1 }}>
          {String(p.number ?? 1).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>{p.title || 'Consiglio'}</div>
        {p.body ? (
          <div style={{ fontSize: 40, lineHeight: 1.4, color: t.sub }}>{p.body}</div>
        ) : null}
      </div>
    </Frame>
  )
}

function Stat({ p }) {
  const t = theme(p.theme || 'dark')
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 28 }}>
        {p.kicker ? <Chip t={t}>{p.kicker}</Chip> : null}
        <div style={{ fontSize: (p.value || '').length > 7 ? 170 : 240, fontWeight: 800, color: t.accent, lineHeight: 1, letterSpacing: -6 }}>
          {p.value || '0'}
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.15 }}>{p.label || ''}</div>
        {p.note ? <div style={{ fontSize: 30, color: t.sub, lineHeight: 1.4 }}>{p.note}</div> : null}
      </div>
    </Frame>
  )
}

function Quote({ p }) {
  const t = theme(p.theme || 'light')
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 40 }}>
        <svg width="120" height="96" viewBox="0 0 40 32">
          <path d="M0 32V18C0 8 6 1 16 0v6c-5 1-8 5-8 10h8v16zm24 0V18c0-10 6-17 16-18v6c-5 1-8 5-8 10h8v16z" fill={t.accent} />
        </svg>
        <div style={{ fontSize: (p.text || '').length > 160 ? 52 : 64, fontWeight: 600, lineHeight: 1.3, letterSpacing: -0.5 }}>
          {p.text || 'Testo della citazione'}
        </div>
        {p.author ? (
          <div style={{ fontSize: 32, fontWeight: 600, color: t.sub }}>{p.author}</div>
        ) : null}
      </div>
    </Frame>
  )
}

function Cta({ p }) {
  const t = theme(p.theme || 'orange')
  return (
    <Frame t={t} footer="none">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 44 }}>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          {p.title || 'Il tuo condominio è già su Condoreco?'}
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.4, color: t.sub }}>
          {p.subtitle || 'Cerca il tuo indirizzo e leggi le recensioni dei residenti. Oppure lascia la tua, è anonima.'}
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 18, background: t.fg === C.white ? C.white : C.teal,
            color: t.fg === C.white ? (p.theme === 'teal' || p.theme === 'dark' ? C.teal : C.orange) : C.white,
            fontSize: 44, fontWeight: 800, padding: '28px 44px', borderRadius: 24,
          }}>
            <div>{p.url || 'condoreco.com'}</div>
            <Arrow color={t.fg === C.white ? (p.theme === 'teal' || p.theme === 'dark' ? C.teal : C.orange) : C.white} size={44} />
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, color: t.sub }}>Link in bio</div>
      </div>
    </Frame>
  )
}

function Ranking({ p, data }) {
  const t = theme('light')
  const rows = data?.rows || []
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Chip t={t}>{p.kicker || `${data?.area || ''}`}</Chip>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, color: C.ink }}>
          {p.title || `I condomini più amati a ${data?.area || ''}`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 36 }}>
        {rows.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 28, background: C.white,
            border: `2px solid ${C.line}`, borderRadius: 24, padding: '16px 24px',
          }}>
            <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, color: C.tealMid, width: 56 }}>{i + 1}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: C.ink }}>{r.title}</div>
              <div style={{ display: 'flex', fontSize: 26, color: C.ink3 }}>
                {[r.neighborhood, `${r.review_count} recension${r.review_count === 1 ? 'e' : 'i'}`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <ScoreBadge score={r.score} size={80} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', fontSize: 24, color: C.ink3, marginBottom: 20 }}>
        Punteggi medi delle recensioni dei residenti su condoreco.com, scala 1-5.
      </div>
    </Frame>
  )
}

const BUILDING_BARS = [
  ['score_admin', 'Amministrazione'],
  ['score_maintenance', 'Manutenzione'],
  ['score_costs', 'Spese'],
  ['score_quality', 'Qualità costruttiva'],
  ['score_noise', 'Silenziosità'],
  ['score_safety', 'Sicurezza'],
]

const ADMIN_BARS = [
  ['score_availability', 'Disponibilità'],
  ['score_transparency', 'Trasparenza'],
  ['score_speed', 'Rapidità'],
  ['score_assemblies', 'Assemblee'],
  ['score_maintenance', 'Manutenzione'],
  ['score_value', 'Rapporto qualità/prezzo'],
]

function Scorecard({ p, data, kind }) {
  const t = theme('light')
  const d = data || {}
  const bars = kind === 'admin' ? ADMIN_BARS : BUILDING_BARS
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Chip t={t}>{p.kicker || (kind === 'admin' ? 'Amministratore' : 'Condominio')}</Chip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: C.ink }}>{d.title}</div>
            <div style={{ fontSize: 32, color: C.ink3 }}>{d.subtitle}</div>
          </div>
          <ScoreBadge score={d.score} size={160} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, marginTop: 56 }}>
        {bars.map(([k, label]) => <Bar key={k} label={label} value={d[k] == null ? null : Number(d[k])} />)}
      </div>
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {(d.facts || []).map((f) => (
          <div key={f} style={{ background: C.tealLt, color: C.tealDk, fontSize: 26, fontWeight: 600, padding: '10px 20px', borderRadius: 999 }}>{f}</div>
        ))}
      </div>
    </Frame>
  )
}

// Un personaggio che parla: avatar grande + nuvoletta.
function Speak({ p }) {
  const t = theme(p.theme || 'light')
  const ch = findCharacter(p.character) || findCharacter('gufo')
  const bubbleBg = t.fg === C.white ? C.white : C.white
  const len = (p.text || '').length
  return (
    <Frame t={t}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 28 }}>
        {p.kicker ? <Chip t={t}>{p.kicker}</Chip> : null}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', background: bubbleBg, color: C.ink, borderRadius: 48,
            padding: '52px 56px', fontSize: len > 140 ? 50 : len > 80 ? 60 : 72, fontWeight: 800,
            lineHeight: 1.15, letterSpacing: -1, border: t.bg === C.paper ? `3px solid ${C.line}` : 'none',
          }}>{p.text || 'Ciao!'}</div>
          <div style={{ display: 'flex', paddingLeft: 110 }}>
            <svg width="70" height="56" viewBox="0 0 70 56">
              <path d="M0 0 L70 0 L8 56 Z" fill={bubbleBg} />
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 4 }}>
          <div style={{ display: 'flex', padding: 8, borderRadius: 999, background: C.white }}>
            <Avatar character={ch} size={196} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: t.fg }}>{p.name || `${ch.name}`}</div>
            {p.role ? <div style={{ fontSize: 30, color: t.sub }}>{p.role}</div> : null}
          </div>
        </div>
      </div>
    </Frame>
  )
}

// Mascotte Condor: apertura (pose "happy", guarda a destra) e risposta
// finale (pose "determined"). Condor a sinistra in basso, nuvoletta sopra
// con la punta verso di lui, link o firma a destra.
const MASCOT_SIZE = { happy: [345, 398], determined: [343, 413] }

function Mascot({ p }) {
  const t = theme(p.theme || 'light')
  const pose = p.pose === 'determined' ? 'determined' : 'happy'
  const [mw, mh] = MASCOT_SIZE[pose]
  const len = (p.text || '').length
  const linkColor = p.theme === 'orange' ? C.orange : C.teal
  return (
    <Frame t={t} footer="none">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-end' }}>
        {p.kicker ? <div style={{ display: 'flex', marginBottom: 24 }}><Chip t={t}>{p.kicker}</Chip></div> : null}
        <div style={{
          display: 'flex', background: C.white, color: C.ink, borderRadius: 48,
          padding: '48px 52px', fontSize: len > 150 ? 46 : len > 90 ? 56 : 68, fontWeight: 800,
          lineHeight: 1.15, letterSpacing: -1, border: t.bg === C.paper ? `3px solid ${C.line}` : 'none',
        }}>{p.text || 'Ciao, sono il Condor di Condoreco!'}</div>
        <div style={{ display: 'flex', paddingLeft: 200, marginTop: t.bg === C.paper ? -3 : 0 }}>
          <svg width="70" height="56" viewBox="0 0 70 56"><path d="M0 0 L70 0 L8 56 Z" fill={C.white} /></svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {MASCOTS[pose] ? <img src={MASCOTS[pose]} width={mw} height={mh} alt="" /> : <div style={{ width: mw, height: mh }} />}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18, paddingBottom: 20 }}>
            {p.showLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.fg === C.white ? C.white : C.teal, color: t.fg === C.white ? linkColor : C.white, fontSize: 38, fontWeight: 800, padding: '22px 34px', borderRadius: 22 }}>
                <div>{p.url || 'condoreco.com'}</div>
                <Arrow color={t.fg === C.white ? linkColor : C.white} size={38} />
              </div>
            ) : null}
            {p.showLink ? <div style={{ fontSize: 30, fontWeight: 600, color: t.sub }}>Link in bio</div> : null}
            {!p.showLink ? <div style={{ fontSize: 32, fontWeight: 800, color: t.sub }}>Il Condor di Condoreco</div> : null}
            {!p.showLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.sub }}>Scorri</div>
                <Arrow color={t.accent} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Frame>
  )
}

// Dialogo tra personaggi, stile chat: il primo parla a sinistra, gli altri a destra.
function Chat({ p }) {
  const t = theme(p.theme || 'light')
  const lines = parseDialogue(p.lines)
  const first = lines.find((l) => l.character)?.character?.id
  // il testo deve stare tutto nella safe area: più testo, font più piccolo
  const total = lines.reduce((n, l) => n + l.text.length, 0) + lines.length * 40
  const size = total > 330 ? 36 : total > 260 ? 40 : 46
  return (
    <Frame t={t}>
      {p.title ? (
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, marginBottom: 36 }}>{p.title}</div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 24, paddingBottom: 24 }}>
        {lines.map((l, i) => {
          const left = !l.character || l.character.id === first
          const accent = l.character?.color || C.teal
          return (
            <div key={i} style={{ display: 'flex', width: '100%', flexDirection: left ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 20 }}>
              <div style={{ display: 'flex', flexShrink: 0 }}><Avatar character={l.character} size={96} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 1, maxWidth: 680, alignItems: left ? 'flex-start' : 'flex-end' }}>
                <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: t.fg === C.white ? t.sub : accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
                  {l.character?.name || ''}
                </div>
                <div style={{
                  display: 'flex', background: left ? C.white : accent, color: left ? C.ink : C.white,
                  border: left && t.bg === C.paper ? `3px solid ${C.line}` : 'none',
                  borderRadius: 40, borderBottomLeftRadius: left ? 8 : 40, borderBottomRightRadius: left ? 40 : 8,
                  padding: '26px 34px', fontSize: size, fontWeight: 600, lineHeight: 1.25,
                }}>{l.text}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Frame>
  )
}

// ── Registro ────────────────────────────────────────────────────────────────

export const TEMPLATES = {
  cover: { label: 'Copertina', render: Cover },
  mascot: { label: 'Condor (messaggio istituzionale)', render: Mascot },
  speak: { label: 'Personaggio che parla', render: Speak },
  chat: { label: 'Dialogo tra personaggi', render: Chat },
  tip: { label: 'Consiglio numerato', render: Tip },
  stat: { label: 'Numero grande', render: Stat },
  quote: { label: 'Citazione', render: Quote },
  ranking: { label: 'Classifica zona (dati)', render: Ranking, data: 'ranking' },
  building: { label: 'Pagella condominio (dati)', render: (a) => Scorecard({ ...a, kind: 'building' }), data: 'building' },
  admin: { label: 'Pagella amministratore (dati)', render: (a) => Scorecard({ ...a, kind: 'admin' }), data: 'admin' },
  cta: { label: 'Chiusura con invito', render: Cta },
}

export function renderTemplate(name, params, data) {
  const tpl = TEMPLATES[name]
  if (!tpl) throw new Error(`Template sconosciuto: ${name}`)
  return tpl.render({ p: params || {}, data })
}
