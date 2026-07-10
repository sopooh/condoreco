'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ADMIN_RESIDENT_TYPES } from '@/lib/reviewOptions'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'

function DotRating({ value, onChange, size = 28 }) {
  return (
    <div style={{ display: 'flex', gap: size > 20 ? 10 : 7, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{
            width: size, height: size, minWidth: size, maxWidth: size,
            aspectRatio: '1', borderRadius: '50%',
            flexShrink: 0, flexGrow: 0,
            border: `2px solid ${n <= value ? 'var(--teal)' : 'var(--border)'}`,
            background: n <= value ? 'var(--teal)' : 'transparent',
            cursor: 'pointer', padding: 0, transition: 'all 0.12s',
            appearance: 'none', WebkitAppearance: 'none',
            boxSizing: 'border-box', display: 'block',
          }} />
      ))}
    </div>
  )
}

const LABEL = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }
const GROUP = { marginBottom: 22 }

export default function AdminReviewForm({ open, onClose, admin }) {
  const session = useSession()
  const router = useRouter()

  const [existingReview, fetchMyReview] = useMyReview('admin_reviews', 'administrator_id', admin.id)

  const [type, setType] = useState('resident')
  const [score, setScore] = useState(0)
  const [cats, setCats] = useState({ availability: 0, transparency: 0, speed: 0, assemblies: 0, value: 0 })
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [policyConfirmed, setPolicyConfirmed] = useState(false)

  function setCat(k, v) { setCats((c) => ({ ...c, [k]: v })) }

  // Prefill in modalità modifica: existingReview arriva async (useMyReview),
  // quindi i campi non possono essere inizializzati direttamente da useState.
  // Rieseguito anche alla riapertura (dipendenza su open) per scartare eventuali
  // modifiche non salvate di un'apertura precedente.
  useEffect(() => {
    if (!existingReview) return
    setType(existingReview.resident_type || 'resident')
    setScore(existingReview.score || 0)
    setCats({
      availability: existingReview.score_availability || 0,
      transparency: existingReview.score_transparency || 0,
      speed: existingReview.score_speed || 0,
      assemblies: existingReview.score_assemblies || 0,
      value: existingReview.score_value || 0,
    })
    setBody(existingReview.body || '')
  }, [existingReview, open])

  async function submit() {
    if (!session) { setErr('Devi accedere per pubblicare una recensione.'); return }
    if (!score) { setErr('Assegna una valutazione generale.'); return }
    if (!policyConfirmed) {
      setErr('Devi confermare la dichiarazione di responsabilita per pubblicare la recensione.')
      return
    }
    setBusy(true); setErr('')
    try {
      const supabase = createClient()

      if (existingReview?.id) {
        // Modifica: aggiorna solo corpo/punteggi, come per BuildingReviewForm.
        // Il trigger DB rimette la recensione in verifica, qui non forziamo
        // is_published/moderation_status.
        // NB: al momento non esiste una policy RLS "admin_reviews: update own"
        // (a differenza di "reviews: update own"). Se non è stata aggiunta,
        // questa update viene bloccata da RLS e .select().single() lo rende un
        // errore esplicito invece di un no-op silenzioso.
        const updatePayload = {
          score,
          score_availability: cats.availability || null,
          score_transparency: cats.transparency || null,
          score_speed: cats.speed || null,
          score_assemblies: cats.assemblies || null,
          score_value: cats.value || null,
          body,
        }
        const { error } = await supabase.from('admin_reviews').update(updatePayload).eq('id', existingReview.id).select().single()
        if (error) throw new Error('Non è stato possibile aggiornare la recensione. Riprova più tardi o contattaci se il problema persiste.')
      } else {
        const payload = {
          resident_type: type, score,
          score_availability: cats.availability || null,
          score_transparency: cats.transparency || null,
          score_speed: cats.speed || null,
          score_assemblies: cats.assemblies || null,
          score_value: cats.value || null,
          body,
          user_id: session.user.id, administrator_id: admin.id, is_published: true,
        }
        const { error } = await supabase.from('admin_reviews').insert(payload).select('id').single()
        if (error) throw error
      }

      onClose()
      await fetchMyReview()
      router.refresh()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
           title={existingReview ? 'Aggiorna la tua recensione' : 'Scrivi una recensione'}
           subtitle={admin.name}>
      {existingReview?.moderation_status === 'pending' && (
        <p style={{ fontSize: 12, color: 'var(--amber-tx)', background: 'var(--amber-bg)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
          La tua recensione precedente è ancora in fase di verifica.
        </p>
      )}
      {existingReview && existingReview.moderation_status !== 'pending' && (
        <p style={{ fontSize: 12, color: 'var(--amber-tx)', background: 'var(--amber-bg)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
          Salvando le modifiche la recensione tornerà in verifica.
        </p>
      )}

      <div style={GROUP}>
        <label style={LABEL}>Chi sei rispetto a questo amministratore?</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {ADMIN_RESIDENT_TYPES.map((rt) => (
            <button key={rt.value} onClick={() => setType(rt.value)}
              style={{
                border: `1px solid ${type === rt.value ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: 6, padding: '9px 12px', fontSize: 13, fontWeight: 600,
                background: type === rt.value ? 'var(--teal-lt)' : '#fff',
                color: type === rt.value ? 'var(--teal-dk)' : 'var(--text-2)',
                textAlign: 'left', cursor: 'pointer',
              }}>{rt.label}</button>
          ))}
        </div>
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Valutazione generale</label>
        <DotRating value={score} onChange={setScore} />
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Per categoria</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['availability', 'Reperibilità'], ['transparency', 'Trasparenza'], ['speed', 'Velocità'],
            ['assemblies', 'Assemblee'], ['value', 'Qualità/prezzo']].map(([k, l]) => (
            <div key={k}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-4)', fontWeight: 500, marginBottom: 5 }}>{l}</span>
              <DotRating value={cats[k]} onChange={(v) => setCat(k, v)} size={18} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

      <div style={GROUP}>
        <label style={LABEL}>La tua esperienza</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Com'è la gestione? Reperibilità, chiarezza delle comunicazioni, assemblee..."
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontSize: 14, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {err && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      <Button variant="primary" block onClick={submit} disabled={busy} style={{ padding: 13 }}>
        {busy ? 'Salvataggio...' : existingReview ? 'Aggiorna recensione' : 'Pubblica recensione'}
      </Button>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, fontSize: 12, lineHeight: 1.6, color: 'var(--text-3)' }}>
        <input
          type="checkbox"
          checked={policyConfirmed}
          onChange={(e) => setPolicyConfirmed(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          Confermo che la recensione si basa su un'esperienza reale, e scritta in buona fede, non contiene insulti,
          accuse non provate, dati personali di terzi o contenuti diffamatori. Sono consapevole di essere personalmente responsabile di quanto pubblico.
        </span>
      </label>
      <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6, marginTop: 10 }}>
        Nessun dato personale identificabile viene pubblicato. Le recensioni sono moderate prima della pubblicazione.
      </p>
    </Modal>
  )
}
