'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cleanName, legalNameError } from '@/lib/legalName'

// Chi e' gia' membro ma non ha ancora indicato nome e cognome legali deve
// completarli prima di entrare nell'area condominio.
export default function LegalNameForm({ buildingId, onDone }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    const e1 = legalNameError(first, 'Il nome') || legalNameError(last, 'Il cognome')
    if (e1) { setErr(e1); return }
    setSaving(true); setErr(null)
    const { error } = await createClient().rpc('set_my_legal_name', { p_building: buildingId, p_first_name: cleanName(first), p_last_name: cleanName(last) })
    setSaving(false)
    if (error) {
      console.error('[LegalNameForm] save failed', error.message)
      setErr(/legal name/.test(error.message || '') ? 'Inserisci nome e cognome veri, come sul documento.' : 'Salvataggio non riuscito. Riprova.')
      return
    }
    onDone()
  }

  return (
    <div className="acc-wrap" style={{ maxWidth: 520 }}>
      <form className="acc-card" style={{ padding: 20, display: 'grid', gap: 14 }} onSubmit={save}>
        <div>
          <h1 className="acc-h1" style={{ marginBottom: 4 }}>Nome e cognome</h1>
          <p className="rc-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
            Nell&apos;area condominio servono il tuo nome e cognome veri, come sul documento: compaiono nell&apos;anagrafe, nelle convocazioni e nei verbali. Il tuo nome pubblico sulle recensioni non cambia.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <label>
            <span style={lbl}>Nome</span>
            <input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Mario" style={inp} required />
          </label>
          <label>
            <span style={lbl}>Cognome</span>
            <input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" maxLength={60} placeholder="Rossi" style={inp} required />
          </label>
        </div>
        {err && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14 }}>{err}</p>}
        <button type="submit" className="acc-btn is-primary" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva e continua'}</button>
      </form>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 6 }
const inp = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 16, font: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
