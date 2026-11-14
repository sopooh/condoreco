'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from './ui.jsx'
import { CHARACTERS } from '@/lib/instagram/characters'

const THEMES = [['teal', 'Teal'], ['light', 'Chiaro'], ['orange', 'Arancio'], ['dark', 'Scuro']]

export const TEMPLATE_FIELDS = {
  cover: { label: 'Copertina', fields: [['theme', 'Tema', 'theme'], ['kicker', 'Etichetta'], ['title', 'Titolo', 'area'], ['subtitle', 'Sottotitolo', 'area']] },
  imageCover: { label: 'Copertina illustrata', fields: [['image', 'Illustrazione', 'cover'], ['kicker', 'Etichetta'], ['text', 'Testo nella nuvoletta', 'area']] },
  mascot: { label: 'Condor (messaggio istituzionale)', fields: [['theme', 'Tema', 'theme'], ['pose', 'Condor', 'pose'], ['kicker', 'Etichetta (opzionale)'], ['text', 'Cosa dice il Condor', 'area'], ['showLink', 'Mostra link condoreco.com (per la chiusura)', 'checkbox']] },
  speak: { label: 'Personaggio che parla', fields: [['theme', 'Tema', 'theme'], ['character', 'Personaggio', 'character'], ['text', 'Cosa dice', 'area'], ['kicker', 'Etichetta (opzionale)'], ['role', 'Sotto il nome (es. esperto di condomini)']] },
  chat: { label: 'Dialogo tra personaggi', fields: [['theme', 'Tema', 'theme'], ['title', 'Titolo (opzionale)'], ['lines', 'Battute, una per riga: "gufo: testo" (max 5)', 'dialogue']] },
  tip: { label: 'Consiglio numerato', fields: [['theme', 'Tema', 'theme'], ['number', 'Numero', 'number'], ['title', 'Titolo', 'area'], ['body', 'Testo', 'area']] },
  stat: { label: 'Numero grande', fields: [['theme', 'Tema', 'theme'], ['kicker', 'Etichetta'], ['value', 'Numero (es. 400€)'], ['label', 'Descrizione', 'area'], ['note', 'Fonte / nota']] },
  quote: { label: 'Citazione', fields: [['theme', 'Tema', 'theme'], ['text', 'Citazione', 'area'], ['author', 'Chi lo dice (es. Residente, Porta Romana)']] },
  ranking: { label: 'Classifica zona (dati)', fields: [['city', 'Città'], ['neighborhood', 'Quartiere (opzionale)'], ['limit', 'Quanti (3-6)', 'number'], ['minReviews', 'Minimo recensioni', 'number'], ['title', 'Titolo (opzionale)']] },
  building: { label: 'Pagella condominio (dati)', fields: [['buildingId', 'Condominio', 'building']] },
  admin: { label: 'Pagella amministratore (dati)', fields: [['adminId', 'Amministratore', 'admin']] },
  cta: { label: 'Chiusura con invito', fields: [['theme', 'Tema', 'theme'], ['title', 'Titolo', 'area'], ['subtitle', 'Testo', 'area'], ['url', 'Link mostrato']] },
}

const DEFAULTS = {
  imageCover: { image: 'condor-flight' },
  mascot: { theme: 'light', pose: 'happy' },
  speak: { theme: 'light', character: 'gufo' },
  chat: { theme: 'light', lines: 'volpe: Ho trovato casa, firmo domani!\ngufo: Aspetta. Hai chiesto quanto sono le spese condominiali?' },
  cover: { theme: 'teal' }, tip: { theme: 'light', number: 1 }, stat: { theme: 'dark' },
  quote: { theme: 'light' }, ranking: { city: 'Milano', limit: 5, minReviews: 1 }, cta: { theme: 'orange' },
  building: {}, admin: {},
}

function useOptions(kind) {
  const [opts, setOpts] = useState([])
  useEffect(() => {
    if (!kind) return
    const supabase = createClient()
    const q = kind === 'building'
      ? supabase.from('building_scores').select('id, address, street_number, city, review_count').order('review_count', { ascending: false }).limit(300)
      : supabase.from('admin_scores').select('id, name, studio_name, city, review_count').order('review_count', { ascending: false }).limit(300)
    q.then(({ data, error }) => {
      if (error) { console.error('[instagram] options', error); return }
      setOpts((data || []).map((r) => ({
        id: r.id,
        label: kind === 'building'
          ? `${[r.address, r.street_number].filter(Boolean).join(' ')}, ${r.city} (${r.review_count ?? 0})`
          : `${r.studio_name || r.name}, ${r.city || ''} (${r.review_count ?? 0})`,
      })))
    })
  }, [kind])
  return opts
}

export default function SlideComposer({ postId, onAdded, disabled }) {
  const [template, setTemplate] = useState('cover')
  const [params, setParams] = useState(DEFAULTS.cover)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const pickerKind = TEMPLATE_FIELDS[template].fields.find((f) => f[2] === 'building' || f[2] === 'admin')?.[2]
  const options = useOptions(pickerKind)

  function choose(t) {
    setTemplate(t); setParams(DEFAULTS[t] || {}); setPreview(null); setError(null)
  }

  function set(key, value) {
    setParams((p) => ({ ...p, [key]: value })); setPreview(null)
  }

  async function showPreview() {
    setError(null)
    const url = `/api/instagram/preview?template=${template}&p=${encodeURIComponent(JSON.stringify(params))}`
    setBusy(true)
    const res = await fetch(url, { cache: 'no-store' })
    setBusy(false)
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || 'Anteprima non riuscita'); return }
    setPreview(URL.createObjectURL(await res.blob()))
  }

  async function add() {
    setBusy(true); setError(null)
    const res = await fetch('/api/instagram/slides', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, template, params }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(body.error || 'Errore'); return }
    setPreview(null)
    if (template === 'tip') setParams((p) => ({ ...p, number: (Number(p.number) || 0) + 1, title: '', body: '' }))
    onAdded?.()
  }

  return (
    <div>
      <label style={ui.label} htmlFor="tpl">Tipo di slide</label>
      <select id="tpl" style={ui.input} value={template} onChange={(e) => choose(e.target.value)}>
        {Object.entries(TEMPLATE_FIELDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      {TEMPLATE_FIELDS[template].fields.map(([key, label, type]) => (
        <div key={key}>
          <label style={ui.label} htmlFor={`f-${key}`}>{label}</label>
          {type === 'theme' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {THEMES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('theme', v)}
                  style={{ ...ui.smallBtn, ...(params.theme === v ? { background: 'var(--teal-lt)', borderColor: 'var(--teal)', color: 'var(--teal-dk)' } : {}) }}>{l}</button>
              ))}
            </div>
          ) : type === 'cover' ? (
            <select id={`f-${key}`} style={ui.input} value={params[key] ?? 'condor-flight'} onChange={(e) => set(key, e.target.value)}>
              <option value="condor-flight">Condor in volo (arancio)</option>
            </select>
          ) : type === 'pose' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              {[['happy', 'Apertura (sorride)'], ['determined', 'Chiusura (risponde)']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('pose', v)}
                  style={{ ...ui.smallBtn, flex: 1, ...((params.pose || 'happy') === v ? { background: 'var(--teal-lt)', borderColor: 'var(--teal)', color: 'var(--teal-dk)' } : {}) }}>{l}</button>
              ))}
            </div>
          ) : type === 'checkbox' ? (
            <input id={`f-${key}`} type="checkbox" checked={!!params[key]} onChange={(e) => set(key, e.target.checked)} style={{ width: 22, height: 22 }} />
          ) : type === 'character' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(CHARACTERS).map(([k, c]) => (
                <button key={k} type="button" onClick={() => set('character', k)} title={c.name}
                  style={{ ...ui.smallBtn, padding: 3, borderRadius: 999, ...(params.character === k ? { borderColor: 'var(--teal)', borderWidth: 3 } : {}) }}>
                  <img src={`/avatars/${c.id}.png`} alt={c.name} width={40} height={40} style={{ borderRadius: 999, display: 'block' }} />
                </button>
              ))}
            </div>
          ) : type === 'dialogue' ? (
            <>
              <textarea id={`f-${key}`} rows={5} style={{ ...ui.input, resize: 'vertical' }} value={params[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
              <p style={{ ...ui.muted, marginTop: 4 }}>Personaggi: {Object.keys(CHARACTERS).join(', ')}</p>
            </>
          ) : type === 'area' ? (
            <textarea id={`f-${key}`} rows={2} style={{ ...ui.input, resize: 'vertical' }} value={params[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
          ) : type === 'building' || type === 'admin' ? (
            <select id={`f-${key}`} style={ui.input} value={params[key] ?? ''} onChange={(e) => set(key, e.target.value)}>
              <option value="">Scegli...</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          ) : (
            <input id={`f-${key}`} type={type === 'number' ? 'number' : 'text'} inputMode={type === 'number' ? 'numeric' : undefined}
              style={ui.input} value={params[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
          )}
        </div>
      ))}

      {(template === 'building' || template === 'admin') && (
        <p style={{ ...ui.muted, marginTop: 8 }}>
          Consiglio: pubblica pagelle solo con punteggi buoni o con il consenso dell&apos;amministratore. Sono nomi e indirizzi reali.
        </p>
      )}

      {error && <div style={ui.error}>{error}</div>}
      {preview && <img src={preview} alt="Anteprima slide" style={{ width: '100%', borderRadius: 10, marginTop: 12, border: '1px solid var(--border)' }} />}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" style={{ ...ui.ghostBtn, flex: 1 }} disabled={busy} onClick={showPreview}>Anteprima</button>
        <button type="button" style={{ ...ui.primaryBtn, flex: 1 }} disabled={busy || disabled} onClick={add}>{busy ? 'Attendi...' : 'Aggiungi slide'}</button>
      </div>
    </div>
  )
}
