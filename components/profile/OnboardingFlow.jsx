'use client'

import { useState, useEffect } from 'react'
import { ANIMAL_AVATARS, ROLES } from '@/lib/avatars'
import { getCities } from '@/lib/cities'

// Onboarding "Raccontaci di te" a flashcard. Solo primo accesso.
// Username e Ruolo, una volta scelti, NON saranno piu' modificabili.
// TODO: persistere su Supabase (tabella profiles).

const STEPS = ['username', 'name', 'phone', 'avatar', 'role', 'zone', 'verify']

export default function OnboardingFlow({ open, onClose, initial = {}, onComplete }) {
  const [step, setStep] = useState(0)
  const [cities, setCities] = useState([])
  const [data, setData] = useState({
    username: initial.username || '',
    first_name: initial.first_name || '',
    last_name: initial.last_name || '',
    phone: initial.phone || '',
    avatar_id: initial.avatar_id || null,
    role: initial.role || 'condoranker',
    zone: initial.zone || '',
    verified: initial.verified || false,
  })

  useEffect(() => {
    if (open) getCities().then(setCities)
  }, [open])

  if (!open) return null
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }))

  function next() {
    if (isLast) { onComplete(data); onClose() }
    else setStep((s) => s + 1)
  }

  const canProceed = {
    username: data.username.trim().length >= 3,
    name: data.first_name.trim() && data.last_name.trim(),
    phone: true,
    avatar: !!data.avatar_id,
    role: !!data.role,
    zone: !!data.zone,
    verify: true,
  }[current]

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 100, background: i <= step ? 'var(--teal)' : 'var(--border)' }} />
          ))}
        </div>
        <div style={kicker}>Raccontaci di te · {step + 1} di {STEPS.length}</div>

        {current === 'username' && (
          <Step title="Scegli il tuo username" subtitle="Come vuoi farti chiamare. Una volta scelto non potrai cambiarlo.">
            <input autoFocus value={data.username}
              onChange={(e) => set('username', e.target.value.replace(/\s/g, ''))}
              placeholder="es. sophie_mi" style={inp} />
            <Hint>Almeno 3 caratteri, senza spazi. Definitivo.</Hint>
          </Step>
        )}

        {current === 'name' && (
          <Step title="Come ti chiami?" subtitle="Il tuo nome resta privato, serve per la sicurezza dell'account.">
            <input autoFocus value={data.first_name} onChange={(e) => set('first_name', e.target.value)}
              placeholder="Nome" style={{ ...inp, marginBottom: 10 }} />
            <input value={data.last_name} onChange={(e) => set('last_name', e.target.value)}
              placeholder="Cognome" style={inp} />
          </Step>
        )}

        {current === 'phone' && (
          <Step title="Il tuo numero di telefono" subtitle="Opzionale. Serve per recuperare l'account e aumentare l'affidabilità.">
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ ...inp, width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>+39</div>
              <input value={data.phone} onChange={(e) => set('phone', e.target.value)}
                placeholder="345 123 4567" style={{ ...inp, flex: 1 }} />
            </div>
          </Step>
        )}

        {current === 'avatar' && (
          <Step title="Scegli il tuo avatar" subtitle="Un animale che ti rappresenta, niente foto.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {ANIMAL_AVATARS.map((a) => {
                const active = data.avatar_id === a.id
                return (
                  <button key={a.id} onClick={() => set('avatar_id', a.id)} title={a.label}
                    style={{
                      aspectRatio: '1', borderRadius: 12, cursor: 'pointer', overflow: 'hidden', padding: 0,
                      border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`, background: 'var(--bg)',
                      boxShadow: active ? '0 0 0 3px var(--teal-lt)' : 'none',
                    }}>
                    <img src={a.src} alt={a.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                )
              })}
            </div>
          </Step>
        )}

        {current === 'role' && (
          <Step title="Qual è il tuo ruolo?" subtitle="Definisce come appari agli altri. Una volta scelto non potrai cambiarlo.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(ROLES).map(([key, r]) => {
                const active = data.role === key
                return (
                  <button key={key} onClick={() => set('role', key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                      border: `2px solid ${active ? r.color : 'var(--border)'}`, borderRadius: 12,
                      background: active ? 'var(--bg)' : 'var(--white)', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-4)' }}>{r.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <Hint>Scelta definitiva.</Hint>
          </Step>
        )}

        {current === 'zone' && (
          <Step title="In che zona?" subtitle="La città dove abiti o operi.">
            <select value={data.zone} onChange={(e) => set('zone', e.target.value)} style={inp}>
              <option value="">Seleziona una città</option>
              {cities.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Step>
        )}

        {current === 'verify' && (
          <Step title="Verifica residenza" subtitle="Opzionale, ma le recensioni verificate contano di più.">
            <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', background: 'var(--bg)' }}>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>
                Carica una bolletta, un contratto o una ricevuta spese. Oscura pure i dati sensibili, ci serve solo l'indirizzo.
              </div>
              <button style={{ ...inp, width: 'auto', padding: '10px 18px', cursor: 'pointer', background: '#fff', fontWeight: 600, color: 'var(--teal)', border: '1.5px solid var(--teal)' }}>
                Carica documento
              </button>
            </div>
          </Step>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep((s) => s - 1)} style={btnGhost}>Indietro</button>}
          <button onClick={next} disabled={!canProceed}
            style={{ ...btnPrimary, opacity: canProceed ? 1 : 0.5, cursor: canProceed ? 'pointer' : 'not-allowed' }}>
            {isLast ? 'Completa profilo' : 'Continua'}
          </button>
        </div>
        {(current === 'phone' || current === 'verify') && (
          <button onClick={() => { onComplete(data); onClose() }} style={btnSkip}>Salta per ora</button>
        )}
      </div>
    </div>
  )
}

const Step = ({ title, subtitle, children }) => (
  <>
    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 22, lineHeight: 1.5 }}>{subtitle}</div>
    {children}
  </>
)
const Hint = ({ children }) => <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>{children}</div>

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,41,38,0.55)', backdropFilter: 'blur(4px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const card = { background: 'var(--white)', borderRadius: 16, padding: 36, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }
const kicker = { fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--text)', outline: 'none' }
const btnPrimary = { flex: 1, padding: '12px 20px', borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14 }
const btnGhost = { padding: '12px 20px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 14, color: 'var(--text-2)', cursor: 'pointer' }
const btnSkip = { display: 'block', margin: '14px auto 0', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-4)', cursor: 'pointer', fontWeight: 500 }
