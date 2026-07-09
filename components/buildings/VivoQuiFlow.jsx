'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { feeBand, costPerSqm } from '@/lib/score'
import PhotoUploader from '@/components/photos/PhotoUploader'
import { uploadPhoto } from '@/lib/photos'

// Flusso "Vivo qui": raccoglie spese condominiali (numero esatto -> fascia),
// servizi, metratura. Usato quando l'utente dichiara di abitare in un edificio.
// TODO: salvare i contributi su Supabase (tabella building_contributions).

const STEPS = ['fee', 'sqm', 'amenities', 'confirm', 'photos']

const AMENITY_GROUPS = [
  {
    label: 'Comfort',
    items: [
      ['elevator', 'Ascensore'],
      ['concierge', 'Portineria'],
      ['garden', 'Giardino'],
      ['courtyard', 'Cortile interno'],
    ],
  },
  {
    label: 'Mobilità',
    items: [
      ['parking', 'Parcheggio'],
      ['box', 'Box / garage'],
      ['bike_room', 'Deposito bici'],
    ],
  },
  {
    label: 'Praticità',
    items: [
      ['basement', 'Cantina'],
      ['fiber', 'Fibra internet'],
    ],
  },
  {
    label: 'Sicurezza e accessibilità',
    items: [
      ['cctv', 'Videosorveglianza'],
      ['disabled_access', 'Accesso disabili'],
    ],
  },
]

// Lista piatta (deve stare dopo AMENITY_GROUPS per evitare la temporal dead zone)
const AMENITIES = AMENITY_GROUPS.flatMap((g) => g.items)

export default function VivoQuiFlow({ open, onClose, building }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [feeBuilding, setFeeBuilding] = useState('')
  const [isSuperCondo, setIsSuperCondo] = useState(false)
  const [feeSuper, setFeeSuper] = useState('')
  const [sqm, setSqm] = useState('')
  const [amenities, setAmenities] = useState([])
  const [photos, setPhotos] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  if (!open) return null
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const buildingFeeNum = Number(feeBuilding) || 0
  const superFeeNum = isSuperCondo ? (Number(feeSuper) || 0) : 0
  const totalFee = buildingFeeNum + superFeeNum

  const band = totalFee > 0 ? feeBand(totalFee) : null
  const perSqm = costPerSqm(totalFee, Number(sqm))

  async function next() {
    if (isLast) {
      setUploadingPhotos(true)
      if (photos.length > 0) {
        await Promise.all(photos.map((f) => uploadPhoto(f.blob, building.id, null))).catch(console.warn)
        router.refresh()
      }
      setUploadingPhotos(false)
      console.log('Vivo qui contributo:', {
        monthly_fee: totalFee || null,
        monthly_fee_building: buildingFeeNum || null,
        is_supercondominio: isSuperCondo,
        monthly_fee_super: superFeeNum || null,
        avg_sqm: Number(sqm) || null,
        amenities,
      })
      onClose()
    } else setStep((s) => s + 1)
  }
  function toggle(id) {
    setAmenities((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id])
  }

  const canProceed = {
    fee: buildingFeeNum > 0 && (!isSuperCondo || superFeeNum >= 0),
    sqm: true,
    amenities: true,
    confirm: true,
    photos: !uploadingPhotos,
  }[current]

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 100,
              background: i <= step ? 'var(--teal)' : 'var(--border)',
            }} />
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Vivo qui · {building.address}
        </div>

        {current === 'fee' && (
          <>
            <H>Quanto paghi di spese condominiali?</H>
            <P>Inserisci la quota condominio e, se presente, anche la quota supercondominio. Mostreremo la fascia del totale.</P>
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>Quota condominio</div>
            <div style={{ position: 'relative' }}>
              <input type="number" autoFocus value={feeBuilding} onChange={(e) => setFeeBuilding(e.target.value)}
                placeholder="120" style={{ ...inp, paddingRight: 50 }} />
              <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600 }}>€/mese</span>
            </div>

            <div style={{ marginTop: 12, marginBottom: 10, fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>
              Fa parte di un supercondominio?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setIsSuperCondo(false); setFeeSuper('') }} style={choiceBtn(!isSuperCondo)}>No</button>
              <button onClick={() => setIsSuperCondo(true)} style={choiceBtn(isSuperCondo)}>Sì</button>
            </div>

            {isSuperCondo && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>Quota supercondominio</div>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={feeSuper} onChange={(e) => setFeeSuper(e.target.value)}
                    placeholder="45" style={{ ...inp, paddingRight: 50 }} />
                  <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600 }}>€/mese</span>
                </div>
              </div>
            )}

            {band && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--bg)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 4 }}>Totale mensile</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>€{Math.round(totalFee)}/mese</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>{band.range}</div>
              </div>
            )}
          </>
        )}

        {current === 'sqm' && (
          <>
            <H>Quanti mq è il tuo appartamento?</H>
            <P>Serve per calcolare il costo condominiale al metro quadro, utile per confrontare edifici.</P>
            <div style={{ position: 'relative' }}>
              <input type="number" autoFocus value={sqm} onChange={(e) => setSqm(e.target.value)}
                placeholder="85" style={{ ...inp, paddingRight: 40 }} />
              <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600 }}>mq</span>
            </div>
            {perSqm && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--bg)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 4 }}>Costo condominiale</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>{perSqm}€/mq al mese</div>
              </div>
            )}
          </>
        )}

        {current === 'amenities' && (
          <>
            <H>Quali servizi ha il tuo edificio?</H>
            <P>Seleziona tutti quelli presenti.</P>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {AMENITIES.map(([id, l]) => {
                const active = amenities.includes(id)
                return (
                  <button key={id} onClick={() => toggle(id)}
                    style={{
                      padding: '11px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                      background: active ? 'var(--teal-lt)' : 'var(--white)',
                      color: active ? 'var(--teal-dk)' : 'var(--text-2)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>{active ? '✓ ' : ''}{l}</button>
                )
              })}
            </div>
          </>
        )}

        {current === 'confirm' && (
          <>
            <H>Conferma il tuo contributo</H>
            <P>Questi dati aiutano chi cerca casa. Grazie per la trasparenza.</P>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Recap k="Spese condominiali" v={band ? band.range : 'Non indicato'} />
              <Recap k="Totale" v={totalFee > 0 ? `€${Math.round(totalFee)}/mese` : 'Non indicato'} />
              {isSuperCondo && <Recap k="Dettaglio" v={`Condominio €${Math.round(buildingFeeNum)} + Super €${Math.round(superFeeNum)}`} />}
              <Recap k="Metratura" v={sqm ? `${sqm} mq` : 'Non indicato'} />
              <Recap k="Costo al mq" v={perSqm ? `${perSqm}€/mq` : 'Non calcolabile'} />
              <Recap k="Servizi" v={amenities.length ? `${amenities.length} selezionati` : 'Nessuno'} />
            </div>
          </>
        )}

        {current === 'photos' && (
          <>
            <H>Aggiungi foto del condominio</H>
            <P>Opzionale — le foto aiutano chi cerca casa. Vengono revisionate prima di essere pubblicate.</P>
            <PhotoUploader files={photos} onChange={setPhotos} maxFiles={5} />
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} style={btnGhost}>Indietro</button>
          )}
          <button onClick={next} disabled={!canProceed}
            style={{ ...btnPrimary, opacity: canProceed ? 1 : 0.5, cursor: canProceed ? 'pointer' : 'not-allowed' }}>
            {uploadingPhotos ? 'Caricamento...' : isLast ? 'Invia contributo' : 'Continua'}
          </button>
        </div>
        <button onClick={onClose} style={btnSkip}>Annulla</button>
      </div>
    </div>
  )
}

const H = ({ children }) => <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>{children}</div>
const P = ({ children }) => <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.5 }}>{children}</div>
const Recap = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
    <span style={{ color: 'var(--text-4)' }}>{k}</span>
    <strong style={{ color: 'var(--text-2)' }}>{v}</strong>
  </div>
)

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,41,38,0.55)', backdropFilter: 'blur(4px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const card = { background: 'var(--white)', borderRadius: 16, padding: 36, width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 16, fontFamily: 'Inter, sans-serif', outline: 'none' }
const btnPrimary = { flex: 1, padding: '12px 20px', borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14 }
const btnGhost = { padding: '12px 20px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 14, color: 'var(--text-2)', cursor: 'pointer' }
const btnSkip = { display: 'block', margin: '14px auto 0', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-4)', cursor: 'pointer', fontWeight: 500 }
const choiceBtn = (active) => ({
  padding: '10px 14px', borderRadius: 8, border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
  background: active ? 'var(--teal-lt)' : '#fff', color: active ? 'var(--teal-dk)' : 'var(--text-2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
})
