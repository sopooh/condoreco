'use client'

import { useEffect, useState } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Invito al residente a indicare la sua PEC: convocazioni e verbali arrivano gratis
// via PEC invece che per raccomandata (spesa del condominio).
// compact = versione ridotta quando la PEC c'è già (solo riga di conferma).
const PEC_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i

export default function ResidentPecCard({ buildingId }) {
  const [pec, setPec] = useState(null)       // valore salvato
  const [value, setValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let alive = true
    createClient().rpc('get_my_pec', { p_building: buildingId }).then(({ data, error }) => {
      if (!alive) return
      if (error) console.error('[ResidentPecCard] load failed', error)
      setPec(data || null); setValue(data || ''); setLoaded(true)
    })
    return () => { alive = false }
  }, [buildingId])

  async function save(next) {
    const v = next.trim()
    if (v && !PEC_RE.test(v)) { setMsg({ err: true, text: 'Controlla l\'indirizzo PEC.' }); return }
    setBusy(true); setMsg(null)
    const { data, error } = await createClient().rpc('set_my_pec', { p_building: buildingId, p_pec: v })
    setBusy(false)
    if (error) {
      console.error('[ResidentPecCard] save failed', error)
      setMsg({ err: true, text: error.code === '22023' ? 'Controlla l\'indirizzo PEC.' : 'Salvataggio non riuscito. Riprova.' })
      return
    }
    setPec(data || null); setValue(data || ''); setEditing(false)
    setMsg({ err: false, text: data ? 'Fatto: convocazioni e verbali ti arriveranno via PEC.' : 'PEC tolta: riceverai convocazioni e verbali per raccomandata.' })
  }

  if (!loaded) return null

  if (pec && !editing) {
    return (
      <div className="acc-card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--teal)' }} />
        <span style={{ flex: 1, minWidth: 200 }}>Convocazioni e verbali via PEC a <b>{pec}</b></span>
        <button type="button" className="acc-btn" onClick={() => { setEditing(true); setMsg(null) }}>Modifica</button>
        {msg && <p className="acc-msg" style={{ width: '100%', margin: 0, color: msg.err ? '#B42318' : 'var(--teal-dk)' }}>{msg.text}</p>}
      </div>
    )
  }

  return (
    <div className="acc-card" style={{ borderColor: 'var(--teal)' }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={18} aria-hidden="true" style={{ color: 'var(--teal)' }} />Ricevi convocazioni e verbali gratis via PEC</strong>
      <p className="rc-muted" style={{ margin: '6px 0 10px' }}>
        Per legge convocazioni e verbali devono arrivare per PEC, raccomandata o a mano. Con la tua PEC arrivano subito e il condominio
        risparmia la raccomandata. Non hai una PEC? Ne trovi a pochi euro all&apos;anno, oppure puoi usare il tuo domicilio digitale INAD.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); save(value) }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="ep-input" style={{ flex: 1, minWidth: 220 }}>
          <input type="email" inputMode="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="nome@pec.it" aria-label="Indirizzo PEC" maxLength={200} />
        </label>
        <button type="submit" className="acc-btn is-primary" disabled={busy || !value.trim()}>{busy ? 'Salvo…' : 'Salva PEC'}</button>
        {pec && <button type="button" className="acc-btn" disabled={busy} onClick={() => save('')}>Togli PEC</button>}
        {pec && <button type="button" className="acc-btn" disabled={busy} onClick={() => { setEditing(false); setValue(pec); setMsg(null) }}>Annulla</button>}
      </form>
      {msg && <p className="acc-msg" style={{ margin: '8px 0 0', color: msg.err ? '#B42318' : 'var(--teal-dk)' }}>{msg.text}</p>}
      <p className="rc-muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>La PEC la vede solo l&apos;amministratore e la usa solo per le comunicazioni del condominio.</p>
    </div>
  )
}
