'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { useAdmins } from '@/hooks/useAdmins'
import { createPendingBuilding, findSimilarBuilding } from '@/lib/buildings'
import { findOrCreateAdministrator } from '@/lib/administrators'
import { feeBand, costPerSqm } from '@/lib/score'
import PinDropMap from '@/components/map/PinDropMap'
import LocationAutocomplete from '@/components/search/LocationAutocomplete'
import { AMENITY_GROUPS, ALL_AMENITIES, amenitiesToPayload } from '@/lib/amenities'

// Flusso guidato a flashcard per registrare un condominio non ancora online.
// Tutti gli step obbligatori. Il condominio creato resta status 'pending'
// (etichetta IT "In verifica") e resta trovabile nella ricerca.
// DB sempre in inglese: status 'pending' | 'verified'.

const STEPS = ['address', 'pin', 'structure', 'match', 'fees', 'heating', 'amenities', 'issues', 'photos', 'admin', 'confirm']
const STEP_LABELS = {
  address: 'Indirizzo', pin: 'Posizione', structure: 'Struttura', match: 'Verifica', fees: 'Spese', heating: 'Riscaldamento',
  amenities: 'Servizi', issues: 'Segnalazioni', photos: 'Foto', admin: 'Amministratore', confirm: 'Conferma',
}

const AMENITIES = ALL_AMENITIES
const HEATING = [
  ['centralizzato', 'Centralizzato'], ['autonomo', 'Autonomo'],
  ['pompa_calore', 'Pompa di calore'], ['assente', 'Assente'],
]
const STATES = [
  ['ottimo', 'Ottimo / Ristrutturato'], ['buono', 'Buono / Abitabile'], ['da_ristrutturare', 'Da ristrutturare'],
]

const ISSUE_GROUPS = [
  {
    key: 'noise',
    label: 'Rumore',
    tags: ['Traffico', 'Vicini rumorosi', 'Locali/bar sotto casa', 'Muri sottili', 'Ascensore/impianti rumorosi', 'Lavori frequenti'],
  },
  {
    key: 'safety',
    label: 'Sicurezza',
    tags: ['Portone spesso aperto', 'Furti o tentativi di furto', 'Zone buie', 'Citofono/cancello rotto', 'Persone estranee nell\'androne', 'Box/cantine poco sicuri'],
  },
  {
    key: 'neighborhood',
    label: 'Vicinato',
    tags: ['Vicini litigiosi', 'Poca collaborazione', 'Amministratore difficile da contattare', 'Chat condominiale tossica', 'Problemi con animali', 'Maleducazione/sporcizia'],
  },
  {
    key: 'maintenance',
    label: 'Manutenzione',
    tags: ['Ascensore spesso guasto', 'Scale sporche', 'Infiltrazioni', 'Facciata degradata', 'Riscaldamento problematico', 'Giardino/cortile trascurato'],
  },
  {
    key: 'costs',
    label: 'Costi',
    tags: ['Spese alte', 'Spese imprevedibili', 'Lavori straordinari frequenti', 'Riscaldamento caro', 'Amministratore costoso', 'Scarsa trasparenza'],
  },
  {
    key: 'administration',
    label: 'Amministrazione',
    tags: ['Amministratore non risponde', 'Assemblee gestite male', 'Verbali poco chiari', 'Tempi lunghi sulle urgenze', 'Comunicazione insufficiente', 'Poca trasparenza decisionale'],
  },
]

export default function AddBuildingFlow() {
  const session = useSession()
  const router = useRouter()
  const { admins } = useAdmins({})
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchedBuilding, setMatchedBuilding] = useState(null)
  const [matchChoice, setMatchChoice] = useState('')
  const [matchKey, setMatchKey] = useState('')
  const [matchError, setMatchError] = useState('')
  const [data, setData] = useState({
    city: '', address: '', street_number: '', postal_code: '', neighborhood: '',
    lat: null, lng: null,
    year_built: '', floors: '', units: '', building_state: '',
    monthly_fee_building: '', is_supercondo: false, supercondo_fee: '', apartment_sqm: '', photos: [],
    heating_type: '', amenities: [],
    issue_scores: { noise: 0, safety: 0, neighborhood: 0, maintenance: 0, costs: 0, administration: 0 },
    issue_tags: { noise: [], safety: [], neighborhood: [], maintenance: [], costs: [], administration: [] },
    worst_thing: '', best_thing: '',
    admin_mode: '', admin_id: '', admin_name: '',
    osm_id: null, osm_type: null,
  })
  const [addrQuery, setAddrQuery] = useState('')
  const [addrPicked, setAddrPicked] = useState(false)
  // autocomplete amministratore
  const [adminQuery, setAdminQuery] = useState('')
  const adminSuggestions = data.admin_mode === 'new' && adminQuery.trim().length >= 2
    ? admins.filter((a) => a.name.toLowerCase().includes(adminQuery.toLowerCase())).slice(0, 5)
    : []
  const adminExistingSuggestions = data.admin_mode === 'existing' && adminQuery.trim().length >= 2
    ? admins.filter((a) => a.name.toLowerCase().includes(adminQuery.toLowerCase())).slice(0, 6)
    : []

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }))
  const toggle = (id) => set('amenities', data.amenities.includes(id) ? data.amenities.filter((x) => x !== id) : [...data.amenities, id])
  const allIssueScoresSet = Object.values(data.issue_scores).every((n) => Number(n) >= 1)

  function setIssueScore(key, value) {
    setData((d) => ({ ...d, issue_scores: { ...d.issue_scores, [key]: value } }))
  }

  function toggleIssueTag(key, tag) {
    setData((d) => {
      const list = d.issue_tags[key] || []
      const next = list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag]
      return { ...d, issue_tags: { ...d.issue_tags, [key]: next } }
    })
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, 8 - data.photos.length)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setData((d) => ({ ...d, photos: [...d.photos, reader.result].slice(0, 8) }))
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }
  function removePhoto(i) {
    setData((d) => ({ ...d, photos: d.photos.filter((_, idx) => idx !== i) }))
  }

  const current = STEPS[step]
  const isLast = current === 'confirm'
  const buildingFee = Number(data.monthly_fee_building) || 0
  const superFee = data.is_supercondo ? (Number(data.supercondo_fee) || 0) : 0
  const totalMonthlyFee = buildingFee + superFee

  const structureReady = !!(data.city && data.address.trim() && data.street_number.trim() && Number(data.lat) && Number(data.lng)
    && data.year_built && data.floors && data.units)
  const currentMatchKey = useMemo(() => ([
    data.city,
    data.address.trim().toLowerCase(),
    data.street_number.trim().toLowerCase(),
    Number(data.lat || 0).toFixed(6),
    Number(data.lng || 0).toFixed(6),
    data.year_built,
    data.floors,
    data.units,
  ].join('|')), [data.city, data.address, data.street_number, data.lat, data.lng, data.year_built, data.floors, data.units])

  const canProceed = {
    address: data.city && data.address.trim() && data.street_number.trim(),
    pin: Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng)),
    structure: data.year_built && data.floors && data.units && data.building_state,
    match: !matchLoading && (!matchedBuilding || matchChoice === 'new' || matchChoice === 'existing'),
    fees: buildingFee > 0 && Number(data.apartment_sqm) > 0 && (!data.is_supercondo || superFee >= 0),
    heating: !!data.heating_type,
    amenities: true,
    issues: allIssueScoresSet,
    photos: true,
    admin: data.admin_mode === 'none' || (data.admin_mode === 'existing' && data.admin_id) || (data.admin_mode === 'new' && data.admin_name.trim()),
    confirm: true,
  }[current]

  useEffect(() => {
    let active = true
    async function lookup() {
      if (!structureReady) {
        setMatchedBuilding(null)
        setMatchChoice('')
        setMatchError('')
        return
      }
      if (currentMatchKey === matchKey) return

      setMatchLoading(true)
      setMatchChoice('')
      setMatchError('')
      const res = await findSimilarBuilding({
        city: data.city,
        address: data.address,
        streetNumber: data.street_number,
        lat: Number(data.lat),
        lng: Number(data.lng),
        yearBuilt: Number(data.year_built),
        floors: Number(data.floors),
        units: Number(data.units),
      })

      if (!active) return
      setMatchedBuilding(res.data || null)
      setMatchError(res.error ? `${res.error.message || 'Errore query match'}${res.error.details ? ` (${res.error.details})` : ''}` : '')
      setMatchKey(currentMatchKey)
      setMatchLoading(false)
    }
    lookup()
    return () => { active = false }
  }, [structureReady, currentMatchKey, matchKey, data.city, data.address, data.street_number, data.lat, data.lng, data.year_built, data.floors, data.units])

  function pickAddress(a) {
    setData((d) => ({
      ...d, address: a.address, street_number: a.street_number,
      city: a.city, postal_code: a.postal_code, neighborhood: a.neighborhood,
      lat: a.lat, lng: a.lng,
    }))
    setAddrQuery(`${a.address} ${a.street_number}`)
    setAddrPicked(true)
  }

  function handlePinChange(pos) {
    setData((d) => ({ ...d, lat: pos.lat, lng: pos.lng }))
  }

  async function create() {
    setSubmitError('')
    setIsSubmitting(true)

    // Risolvi amministratore: cerca o crea se è nuovo
    let resolvedAdminId = data.admin_mode === 'existing' ? data.admin_id : null
    let adminNamePending = null
    if (data.admin_mode === 'new' && data.admin_name.trim()) {
      const { data: adminRecord, error: adminErr } = await findOrCreateAdministrator(data.admin_name, data.city)
      if (adminErr || !adminRecord) {
        // Fallback: salva solo il nome testuale, la card admin si creerà manualmente
        adminNamePending = data.admin_name
      } else {
        resolvedAdminId = adminRecord.id
      }
    }

    const newBuilding = {
      address: data.address, street_number: data.street_number,
      city: data.city, neighborhood: data.neighborhood, postal_code: data.postal_code,
      lat: data.lat, lng: data.lng,
      year_built: Number(data.year_built) || null,
      floors: Number(data.floors) || null,
      units: Number(data.units) || null,
      building_state: data.building_state,
      heating_type: HEATING.find(([v]) => v === data.heating_type)?.[1] || null,
      ...amenitiesToPayload(data.amenities),
      osm_id:   data.osm_id   || null,
      osm_type: data.osm_type || null,
      administrator_id: resolvedAdminId,
      administrator_name_pending: adminNamePending,
      monthly_fee: totalMonthlyFee || null,
      monthly_fee_building: buildingFee || null,
      is_supercondominio: data.is_supercondo,
      monthly_fee_super: superFee || null,
      avg_sqm: Number(data.apartment_sqm) || null,
      photos: data.photos,
      issue_scores: data.issue_scores,
      issue_tags: data.issue_tags,
      worst_thing: data.worst_thing.trim() || null,
      best_thing: data.best_thing.trim() || null,
      score: null, review_count: 0, verified_count: 0,
      status: 'pending',          // DB in inglese; etichetta IT "In verifica"
      created_by: session.user.id,
    }

    const { error } = await createPendingBuilding(newBuilding)
    if (!error) {
      setIsSubmitting(false)
      router.push('/cerca')
      return
    }

    setIsSubmitting(false)
    setSubmitError(`Salvataggio su Supabase non riuscito: ${error.message || 'errore sconosciuto'}${error.details ? ` (${error.details})` : ''}`)
  }

  function getNextStep(from) {
    return Math.min(from + 1, STEPS.length - 1)
  }

  function prev() {
    if (step === 0) {
      router.back()
      return
    }
    setStep((s) => Math.max(0, s - 1))
  }

  async function next() {
    if (isSubmitting) return
    if (current === 'match' && matchedBuilding && matchChoice === 'existing') {
      router.push(`/edificio/${matchedBuilding.id}`)
      return
    }
    if (isLast) await create()
    else setStep(getNextStep(step))
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Accedi per aggiungere un condominio</div>
        <p style={{ color: 'var(--text-3)' }}>Devi essere registrato per registrare un nuovo edificio.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button onClick={prev}
          style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>
          ← {step === 0 ? 'Annulla' : 'Indietro'}
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-4)' }}>
          {STEP_LABELS[current]} · {step + 1} di {STEPS.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 100, background: i <= step ? 'var(--teal)' : 'var(--border)' }} />
        ))}
      </div>

      <div style={cardStyle}>
        {current === 'address' && (
          <>
            <H>Dove si trova il condominio?</H>
            <P>Cerca l'indirizzo: i dati vengono pre-compilati automaticamente da OpenStreetMap.</P>
            <Label>Cerca indirizzo</Label>
            <LocationAutocomplete
              autoFocus
              value={addrQuery}
              onChange={val => { setAddrQuery(val); setAddrPicked(false) }}
              onSelect={loc => {
                pickAddress({
                  address:      loc.address,
                  street_number: loc.street_number || '',
                  city:         loc.city,
                  postal_code:  loc.postcode || '',
                  neighborhood: loc.neighborhood || '',
                  lat:          loc.lat,
                  lng:          loc.lng,
                })
                setAddrQuery([loc.address, loc.street_number].filter(Boolean).join(' '))
                setAddrPicked(true)
              }}
              placeholder="Es. Via San Dionigi 11, Milano"
              size="md"
              inputStyle={inp}
            />

            {/* campi compilati (modificabili) */}
            {(addrPicked || data.address) && (
              <div style={{ marginTop: 18, padding: 16, background: 'var(--bg)', borderRadius: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <Label>Città</Label>
                    <input
                      value={data.city}
                      onChange={(e) => set('city', e.target.value)}
                      placeholder="Es. Milano, Roma, Napoli..."
                      style={inpWhite}
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <Label>CAP</Label>
                    <input value={data.postal_code} onChange={(e) => set('postal_code', e.target.value)} style={inpWhite} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Label>Via / Piazza</Label>
                    <input value={data.address} onChange={(e) => set('address', e.target.value)} style={inpWhite} />
                  </div>
                  <div style={{ width: 90 }}>
                    <Label>Civico</Label>
                    <input value={data.street_number} onChange={(e) => set('street_number', e.target.value)} style={inpWhite} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Label>Quartiere (facoltativo)</Label>
                  <input value={data.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} style={inpWhite} />
                </div>
              </div>
            )}
            <Warn>Una volta pubblicato, l'indirizzo non sarà più modificabile.</Warn>
          </>
        )}

        {current === 'pin' && (
          <>
            <H>Conferma la posizione sulla mappa</H>
            <P>Trascina il pin o tocca la mappa per indicare il punto preciso del portone.</P>
            <PinDropMap
              lat={data.lat}
              lng={data.lng}
              city={data.city}
              onChange={handlePinChange}
              height={320}
            />
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-4)' }}>
              Coordinate selezionate: {data.lat ? data.lat.toFixed(6) : '—'}, {data.lng ? data.lng.toFixed(6) : '—'}
            </div>
          </>
        )}

        {current === 'structure' && (
          <>
            <H>Caratteristiche dell'edificio</H>
            <P>Qualche dato sulla struttura del condominio.</P>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Label>Anno di costruzione</Label>
                <input type="number" value={data.year_built} onChange={(e) => set('year_built', e.target.value)} placeholder="Es. 1975" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Totale piani</Label>
                <input type="number" value={data.floors} onChange={(e) => set('floors', e.target.value)} placeholder="Es. 6" style={inp} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Label>Numero di unità / appartamenti</Label>
              <input type="number" value={data.units} onChange={(e) => set('units', e.target.value)} placeholder="Es. 24" style={inp} />
            </div>
            <div style={{ marginTop: 14 }}>
              <Label>Stato dell'edificio</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATES.map(([v, l]) => (
                  <Radio key={v} active={data.building_state === v} onClick={() => set('building_state', v)} label={l} />
                ))}
              </div>
            </div>
          </>
        )}

        {current === 'match' && (
          <>
            <H>Vivi in questo condominio?</H>
            <P>Abbiamo trovato una scheda molto aderente ai dati inseriti. Conferma se è quella giusta oppure continua e modifica i dati.</P>
            {matchLoading && (
              <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Controllo in corso nel database...</div>
            )}
            {!matchLoading && matchedBuilding && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal-dk)', marginBottom: 8 }}>
                  Vivi in {matchedBuilding.address}{matchedBuilding.street_number ? `, ${matchedBuilding.street_number}` : ''}?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <MiniInfo k="Città" v={matchedBuilding.city || '—'} />
                  <MiniInfo k="Quartiere" v={matchedBuilding.neighborhood || '—'} />
                  <MiniInfo k="Piani" v={matchedBuilding.floors ?? '—'} />
                  <MiniInfo k="Unità" v={matchedBuilding.units ?? '—'} />
                  <MiniInfo k="Spese" v={matchedBuilding.monthly_fee ? `€${Math.round(Number(matchedBuilding.monthly_fee))}/mese` : '—'} />
                  <MiniInfo k="Recensioni" v={matchedBuilding.review_count ?? 0} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setMatchChoice('existing')} style={choiceBtn(matchChoice === 'existing')}>
                    Sì, vivo qui
                  </button>
                  <button onClick={() => setMatchChoice('new')} style={choiceBtn(matchChoice === 'new')}>
                    No, continuo con nuovo condominio
                  </button>
                  <button onClick={() => setStep(0)} style={ghostBtn}>
                    Modifica dati inseriti
                  </button>
                </div>
                {matchChoice === 'existing' && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                    Proseguendo verrai reindirizzato alla scheda esistente.
                  </div>
                )}
              </div>
            )}
            {!matchLoading && !matchedBuilding && (
              <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
                Nessuna scheda aderente trovata: puoi continuare con la creazione.
              </div>
            )}
            {!!matchError && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FEF3E8', color: '#9A4A12', fontSize: 12 }}>
                Errore accesso match DB: {matchError}
              </div>
            )}
          </>
        )}

        {current === 'fees' && (
          <>
            <H>Spese condominiali</H>
            <P>Inserisci la quota del condominio e, se presente, quella del supercondominio. Le sommiamo automaticamente.</P>
            <Label>Quota condominio (mensile)</Label>
            <div style={{ position: 'relative' }}>
              <input type="number" autoFocus value={data.monthly_fee_building}
                onChange={(e) => set('monthly_fee_building', e.target.value)} placeholder="Es. 120" style={{ ...inp, paddingRight: 70 }} />
              <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600, fontSize: 13 }}>€/mese</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <Label>Fa parte di un supercondominio?</Label>
              <div style={{ display: 'flex', gap: 10 }}>
                <Radio active={!data.is_supercondo} onClick={() => { set('is_supercondo', false); set('supercondo_fee', '') }} label="No" />
                <Radio active={data.is_supercondo} onClick={() => set('is_supercondo', true)} label="Sì" />
              </div>
            </div>

            {data.is_supercondo && (
              <div style={{ marginTop: 14 }}>
                <Label>Quota supercondominio (mensile)</Label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={data.supercondo_fee}
                    onChange={(e) => set('supercondo_fee', e.target.value)} placeholder="Es. 45" style={{ ...inp, paddingRight: 70 }} />
                  <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600, fontSize: 13 }}>€/mese</span>
                </div>
              </div>
            )}

            {totalMonthlyFee > 0 && feeBand(totalMonthlyFee) && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--teal-lt)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 4 }}>Totale mensile stimato</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>€{Math.round(totalMonthlyFee)}/mese</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{feeBand(totalMonthlyFee).range}</div>
              </div>
            )}
            <div style={{ marginTop: 18 }}>
              <Label>Metratura del tuo appartamento</Label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={data.apartment_sqm} onChange={(e) => set('apartment_sqm', e.target.value)} placeholder="Es. 85" style={{ ...inp, paddingRight: 40 }} />
                <span style={{ position: 'absolute', right: 14, top: 13, color: 'var(--text-4)', fontWeight: 600, fontSize: 13 }}>mq</span>
              </div>
              {totalMonthlyFee > 0 && data.apartment_sqm && costPerSqm(totalMonthlyFee, Number(data.apartment_sqm)) && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-3)' }}>
                  Costo al mq: <strong style={{ color: 'var(--teal-dk)' }}>{costPerSqm(totalMonthlyFee, Number(data.apartment_sqm))}€/mq al mese</strong>
                </div>
              )}
            </div>
          </>
        )}

        {current === 'heating' && (
          <>
            <H>Tipo di riscaldamento</H>
            <P>Come è riscaldato l'edificio?</P>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HEATING.map(([v, l]) => (
                <Radio key={v} active={data.heating_type === v} onClick={() => set('heating_type', v)} label={l} />
              ))}
            </div>
          </>
        )}

        {current === 'amenities' && (
          <>
            <H>Quali servizi sono presenti nello stabile?</H>
            <P>Seleziona solo quelli realmente disponibili per i condomini.</P>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {AMENITY_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {group.items.map(([id, l]) => {
                      const active = data.amenities.includes(id)
                      return (
                        <button key={id} onClick={() => toggle(id)} style={{
                          padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'left',
                          border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                          background: active ? 'var(--teal-lt)' : 'var(--white)',
                          color: active ? 'var(--teal-dk)' : 'var(--text-2)', cursor: 'pointer',
                        }}>{active ? '✓ ' : ''}{l}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {current === 'issues' && (
          <>
            <H>C'è qualcosa che non va?</H>
            <P>Valuta ogni categoria da 1 a 5 e aggiungi eventuali tag utili per chi cerca casa.</P>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ISSUE_GROUPS.map((g) => {
                const score = data.issue_scores[g.key] || 0
                const tags = data.issue_tags[g.key] || []
                return (
                  <div key={g.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--white)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>1 = critico · 5 = ottimo</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const active = n <= score
                        return (
                          <button
                            key={n}
                            onClick={() => setIssueScore(g.key, n)}
                            style={{
                              width: 34, height: 34, borderRadius: '50%', border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                              background: active ? 'var(--teal)' : 'var(--white)', color: active ? '#fff' : 'var(--text-3)',
                              fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            }}
                            aria-label={`${g.label} ${n} su 5`}
                          >
                            ●
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {g.tags.map((tag) => {
                        const active = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleIssueTag(g.key, tag)}
                            style={{
                              fontSize: 12, padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                              border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                              background: active ? 'var(--teal-lt)' : 'var(--bg)',
                              color: active ? 'var(--teal-dk)' : 'var(--text-2)',
                            }}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <Label>Qual è la cosa peggiore di questo condominio?</Label>
              <textarea
                value={data.worst_thing}
                onChange={(e) => set('worst_thing', e.target.value)}
                placeholder="Risposta breve"
                rows={3}
                style={{ ...inp, resize: 'vertical', minHeight: 72 }}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Label>Qual è la cosa migliore?</Label>
              <textarea
                value={data.best_thing}
                onChange={(e) => set('best_thing', e.target.value)}
                placeholder="Risposta breve"
                rows={3}
                style={{ ...inp, resize: 'vertical', minHeight: 72 }}
              />
            </div>
          </>
        )}

        {current === 'photos' && (
          <>
            <H>Foto dell'edificio</H>
            <P>Aggiungi foto del condominio: facciata, ingresso, cortile. Puoi caricarle o scattarle ora.</P>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {data.photos.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePhoto(i)} style={{
                    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  }}>×</button>
                </div>
              ))}
              {data.photos.length < 8 && (
                <label style={{
                  aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--teal)', fontSize: 13, fontWeight: 600, gap: 4, background: 'var(--bg)',
                }}>
                  <span style={{ fontSize: 26 }}>+</span>
                  Aggiungi
                  <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotos} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 12 }}>
              Da telefono puoi scattare una foto sul momento. Massimo 8 immagini.
            </div>
          </>
        )}

        {current === 'admin' && (
          <>
            <H>Chi è l'amministratore?</H>
            <P>Se conosci l'amministratore del condominio, collegalo. Aiuta gli altri residenti.</P>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <Radio active={data.admin_mode === 'existing'} onClick={() => set('admin_mode', 'existing')} label="Cerca un amministratore già presente" />
              <Radio active={data.admin_mode === 'new'} onClick={() => set('admin_mode', 'new')} label="Aggiungi un nuovo amministratore" />
              <Radio active={data.admin_mode === 'none'} onClick={() => set('admin_mode', 'none')} label="Non lo conosco / non lo so" />
            </div>

            {data.admin_mode === 'existing' && (
              <div style={{ position: 'relative' }}>
                <input
                  value={adminQuery}
                  onChange={(e) => {
                    setAdminQuery(e.target.value)
                    set('admin_id', '')
                  }}
                  placeholder="Digita nome amministratore"
                  style={inp}
                />
                {adminExistingSuggestions.length > 0 && (
                  <div style={dropdown}>
                    {adminExistingSuggestions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          set('admin_id', a.id)
                          setAdminQuery(`${a.name} · ${a.city}`)
                        }}
                        style={dropItem}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{a.city} · {a.building_count} palazzi</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.admin_mode === 'new' && (
              <div style={{ position: 'relative' }}>
                <input value={data.admin_name}
                  onChange={(e) => { set('admin_name', e.target.value); setAdminQuery(e.target.value); set('admin_id', '') }}
                  placeholder="Nome dell'amministratore o dello studio" style={inp} />
                {adminSuggestions.length > 0 && (
                  <div style={dropdown}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', padding: '8px 12px 4px' }}>
                      Già presenti su CondoReco
                    </div>
                    {adminSuggestions.map((a) => (
                      <button key={a.id}
                        onClick={() => { set('admin_mode', 'existing'); set('admin_id', a.id); set('admin_name', a.name); setAdminQuery('') }}
                        style={dropItem}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{a.city} · {a.building_count} palazzi</div>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>
                  Se compare nella lista, selezionalo invece di crearne uno nuovo.
                </div>
              </div>
            )}
          </>
        )}

        {current === 'confirm' && (
          <>
            <H>Conferma i dati</H>
            <P>Controlla che sia tutto corretto. Il condominio sarà pubblicato come "In verifica" finché non viene confermato.</P>
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Recap k="Indirizzo" v={`${data.address} ${data.street_number}, ${data.city}`} />
              <Recap k="Anno / Piani / Unità" v={`${data.year_built} · ${data.floors} piani · ${data.units} unità`} />
              <Recap k="Stato" v={STATES.find(([v]) => v === data.building_state)?.[1] || '—'} />
              <Recap k="Spese" v={totalMonthlyFee > 0 ? `€${Math.round(totalMonthlyFee)}/mese${data.is_supercondo ? ` (condominio €${Math.round(buildingFee)} + super €${Math.round(superFee)})` : ''}` : '—'} />
              <Recap k="Valutazioni" v={`${Object.values(data.issue_scores).filter((x) => x > 0).length}/6 categorie compilate`} />
              <Recap k="Riscaldamento" v={HEATING.find(([v]) => v === data.heating_type)?.[1] || '—'} />
              <Recap k="Foto" v={data.photos.length ? `${data.photos.length} caricate` : 'Nessuna'} />
              <Recap k="Servizi" v={data.amenities.length ? `${data.amenities.length} selezionati` : 'Nessuno'} />
              <Recap k="Amministratore" v={
                data.admin_mode === 'existing' ? (admins.find((a) => a.id === data.admin_id)?.name || 'Selezionato')
                : data.admin_mode === 'new' ? data.admin_name
                : 'Non indicato'} />
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#FEF3E8', borderRadius: 10, fontSize: 13, color: '#9A4A12', display: 'flex', gap: 10 }}>
              <span>ℹ️</span>
              <span>Dopo la creazione il condominio comparirà con l'etichetta arancione <strong>In verifica</strong>. Resta trovabile nella ricerca e verrà confermato quando altri residenti lo convalidano.</span>
            </div>
          </>
        )}

        {submitError && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: '#FEF3E8', color: '#9A4A12', fontSize: 13 }}>
            {submitError}
          </div>
        )}

        <button onClick={next} disabled={!canProceed || isSubmitting}
          style={{
            width: '100%', marginTop: 28, padding: 14, borderRadius: 10, border: 'none',
            background: (canProceed && !isSubmitting) ? 'var(--teal)' : 'var(--border)', color: '#fff',
            fontWeight: 700, fontSize: 15, cursor: (canProceed && !isSubmitting) ? 'pointer' : 'not-allowed',
          }}>
          {isSubmitting ? 'Salvataggio...' : (isLast ? 'Crea condominio' : 'Continua')}
        </button>
      </div>
    </div>
  )
}

const H = ({ children }) => <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>{children}</div>
const P = ({ children }) => <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, lineHeight: 1.5 }}>{children}</div>
const Label = ({ children }) => <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{children}</label>
const Recap = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
    <span style={{ color: 'var(--text-4)', flexShrink: 0 }}>{k}</span>
    <strong style={{ color: 'var(--text-2)', textAlign: 'right' }}>{v}</strong>
  </div>
)
const Warn = ({ children }) => (
  <div style={{ marginTop: 16, padding: 12, background: '#FEF6E7', border: '1px solid #F5D98B', borderRadius: 8, fontSize: 13, color: '#92400E', display: 'flex', gap: 8 }}>
    <span>⚠️</span><span>{children}</span>
  </div>
)
function Radio({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: '100%',
      border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 10,
      background: active ? 'var(--teal-lt)' : 'var(--white)', cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} />}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--teal-dk)' : 'var(--text-2)' }}>{label}</span>
    </button>
  )
}

const cardStyle = { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }
const inpWhite = { ...inp, background: 'var(--white)' }
const dropdown = { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }
const dropItem = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }
const ghostBtn = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff',
  color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const choiceBtn = (active) => ({
  padding: '10px 14px', borderRadius: 8, border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
  background: active ? 'var(--teal-lt)' : '#fff', color: active ? 'var(--teal-dk)' : 'var(--text-2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
})

function MiniInfo({ k, v }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>{k}</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700 }}>{v}</div>
    </div>
  )
}
