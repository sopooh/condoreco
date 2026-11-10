'use client'

import { useState } from 'react'
import { ArrowUpDown, DoorOpen, Droplet, Volume2, Flame, Megaphone, Wrench, Check } from 'lucide-react'
import { NOTICE_KINDS, floorLabel, normalizeFloor } from '@/hooks/useNeighbourNotices'

const NOTICE_ICONS = { elevator: ArrowUpDown, door: DoorOpen, drop: Droplet, sound: Volume2, flame: Flame, megaphone: Megaphone, wrench: Wrench }

// Avviso ai vicini: chi segnala, ad esempio, le porte dell'ascensore aperte
// non deve contattare un fornitore ma avvisare chi abita a quel piano.

export function floorOptions(building) {
  const n = Number(building?.floors)
  const top = Number.isFinite(n) && n > 0 && n <= 40 ? n : 10
  return ['-1', 'T', ...Array.from({ length: top }, (_, i) => String(i + 1))]
}

export function FloorPicker({ building, value, onChange, counts }) {
  const [custom, setCustom] = useState('')
  const opts = floorOptions(building)
  const extra = value && !opts.includes(value) ? [value] : []
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
        {[...opts, ...extra].map((f) => {
          const on = value === f
          const c = counts?.[f]
          return (
            <button key={f} type="button" onClick={() => onChange(f)} aria-pressed={on} style={{
              minHeight: 0, height: 48, borderRadius: 12, cursor: 'pointer', padding: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)',
              color: on ? '#fff' : 'var(--text)', fontWeight: 800, fontSize: 15,
            }}>
              {f}
              {counts && <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{c ? `${c} res.` : '·'}</span>}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Altro (es. mezzanino, 2B)" style={{ ...field, height: 42, padding: '0 12px', fontSize: 14 }} />
        <button type="button" disabled={!custom.trim()} onClick={() => { onChange(normalizeFloor(custom)); setCustom('') }}
          style={{ ...ghostBtn, height: 42, minHeight: 0, opacity: custom.trim() ? 1 : 0.5 }}>Usa</button>
      </div>
    </div>
  )
}

// Riquadro "A che piano abiti?" (bacheca, foglio avvisi)
export function MyFloorCard({ building, myFloor, saveFloor, compact = false }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(myFloor || null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  if (myFloor === undefined) return null

  if (myFloor && !editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: compact ? '10px 12px' : '12px 14px', borderRadius: 14, background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 14 }}>
        <span style={{ flex: 1 }}>Abiti al <strong>{floorLabel(myFloor)}</strong>: ricevi gli avvisi per il tuo piano.</span>
        <button type="button" onClick={() => { setValue(myFloor); setEditing(true) }} style={{ minHeight: 0, border: 'none', background: 'none', color: 'var(--teal)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Cambia</button>
      </div>
    )
  }

  return (
    <div style={{ border: '1.5px solid var(--teal)', borderRadius: 18, padding: 16, background: 'var(--white)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>A che piano abiti?</div>
      <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '0 0 12px', lineHeight: 1.45 }}>
        Serve per ricevere gli avvisi dei vicini che riguardano il tuo piano, come le porte dell&apos;ascensore aperte. Lo vedono solo gli altri residenti verificati.
      </p>
      <FloorPicker building={building} value={value} onChange={setValue} />
      {err && <p style={errText}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {editing && <button type="button" onClick={() => setEditing(false)} style={{ ...ghostBtn, flex: 1 }}>Annulla</button>}
        <button type="button" disabled={!value || saving} onClick={async () => {
          setSaving(true); setErr(null)
          const { error } = await saveFloor(value)
          setSaving(false)
          if (error) setErr(error); else setEditing(false)
        }} style={{ ...primaryBtn, flex: 2, opacity: value ? 1 : 0.5 }}>{saving ? 'Salvataggio...' : 'Salva piano'}</button>
      </div>
    </div>
  )
}

export function NoticeForm({ building, myFloor, floorCounts, saveFloor, sendNotice, onBack, onDone }) {
  const [kind, setKind] = useState(null)
  const [target, setTarget] = useState('floor')
  const [floor, setFloor] = useState(myFloor || null)
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)

  const kindConf = NOTICE_KINDS.find((k) => k.value === kind)

  function pickKind(k) {
    setKind(k.value)
    if (!touched) setMessage(k.message(target === 'floor' ? floor : null))
  }
  function pickFloor(f) {
    setFloor(f)
    if (!touched && kindConf) setMessage(kindConf.message(f))
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '10px 4px 4px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-lt)', color: 'var(--teal)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={30} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Avviso inviato</div>
        <p style={{ fontSize: 14.5, color: 'var(--text-3)', margin: '0 0 18px', lineHeight: 1.45 }}>
          {result.recipients > 0
            ? `${result.recipients === 1 ? 'Lo riceve 1 vicino' : `Lo ricevono ${result.recipients} vicini`} ${target === 'floor' ? `del ${floorLabel(normalizeFloor(floor))}` : 'del palazzo'}.`
            : target === 'floor'
              ? `Nessun altro residente su Condoreco ha ancora indicato di abitare al ${floorLabel(normalizeFloor(floor))}. Puoi avvisare tutto il palazzo.`
              : 'Non ci sono ancora altri residenti verificati su Condoreco.'}
        </p>
        {result.recipients === 0 && target === 'floor' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
            <button type="button" onClick={onDone} style={ghostBtn}>Chiudi</button>
            <button type="button" onClick={() => { setTarget('building'); setResult(null) }} style={primaryBtn}>Avvisa tutto il palazzo</button>
          </div>
        ) : (
          <button type="button" onClick={onDone} style={{ ...primaryBtn, width: '100%' }}>Fatto</button>
        )}
      </div>
    )
  }

  const canSend = kind && message.trim().length >= 3 && (target === 'building' || floor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={label}>Cosa vuoi segnalare?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {NOTICE_KINDS.map((k) => {
            const on = kind === k.value
            return (
              <button key={k.value} type="button" onClick={() => pickKind(k)} aria-pressed={on} style={{
                display: 'flex', alignItems: 'center', gap: 10, minHeight: 0, padding: '12px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--text)',
              }}>
                <span style={{ color: 'var(--teal-dk)', display: 'inline-flex', flexShrink: 0 }}><NoticeIcon name={k.icon} /></span>
                <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{k.short}</span>
              </button>
            )
          })}
        </div>
        {kind === 'smell' && (
          <p style={{ fontSize: 13, color: '#B42318', margin: '8px 0 0', lineHeight: 1.4 }}>
            Se senti odore di gas forte: non accendere luci, apri le finestre, esci e chiama il <strong>112</strong>.
          </p>
        )}
      </div>

      <div>
        <div style={label}>Chi vuoi avvisare?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[['floor', 'Un piano'], ['building', 'Tutto il palazzo']].map(([v, l]) => {
            const on = target === v
            return (
              <button key={v} type="button" onClick={() => { setTarget(v); if (!touched && kindConf) setMessage(kindConf.message(v === 'floor' ? floor : null)) }} aria-pressed={on} style={{
                minHeight: 0, height: 44, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)',
              }}>{l}</button>
            )
          })}
        </div>
        {target === 'floor' && (
          <>
            <FloorPicker building={building} value={floor} onChange={pickFloor} counts={floorCounts} />
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '8px 0 0' }}>
              Sotto ogni piano: quanti residenti l&apos;hanno indicato su Condoreco.
            </p>
          </>
        )}
      </div>

      <label>
        <div style={label}>Messaggio</div>
        <textarea value={message} onChange={(e) => { setMessage(e.target.value); setTouched(true) }} maxLength={500}
          placeholder="Scrivi cosa succede" style={{ ...field, minHeight: 90, resize: 'vertical' }} />
      </label>

      {myFloor === null && (
        <MyFloorCard building={building} myFloor={null} saveFloor={saveFloor} compact />
      )}

      {err && <p style={errText}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
        <button type="button" onClick={onBack} style={ghostBtn}>Indietro</button>
        <button type="button" disabled={!canSend || sending} onClick={async () => {
          setSending(true); setErr(null)
          const r = await sendNotice({ kind, message: message.trim(), target, floor })
          setSending(false)
          if (r.error) setErr(r.error); else setResult(r)
        }} style={{ ...primaryBtn, opacity: canSend ? 1 : 0.5 }}>{sending ? 'Invio...' : 'Invia avviso'}</button>
      </div>
    </div>
  )
}

export function NoticeIcon({ name, size = 22 }) {
  const Icon = NOTICE_ICONS[name] || Megaphone
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />
}

const primaryBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, minHeight: 0, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
const ghostBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, minHeight: 0, padding: '0 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
const label = { fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }
const errText = { fontSize: 13, color: '#B42318', margin: '8px 0 0' }
