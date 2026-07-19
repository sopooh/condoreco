// Stato di verifica residenza per condominio — prima implementazione mock,
// persistito in localStorage (stesso pattern del flag onboarding
// condorank_onboarded_*). Nessun backend reale ancora: niente storage
// documenti, nessuna coda di revisione admin. Da collegare in futuro a una
// vera tabella (es. residence_verifications: user_id, building_id, status,
// document_type, document_url, reviewed_at).
//
// IMPORTANTE: questo stato è puramente cosmetico. L'accesso reale all'area
// condominio è deciso solo da una riga in condo_members (vedi useCondoRole /
// middleware.ts) — completare il wizard qui non crea quella riga. Finché non
// esiste un vero processo di revisione, un membro va aggiunto a condo_members
// a mano (SQL Editor); questo file resta solo per mostrare uno stato
// "in attesa"/"rifiutata" coerente nella schermata di chi non è ancora membro.

function storageKey(userId, buildingId) {
  return `condorank_residence_verification_${userId}_${buildingId}`
}

export function getVerification(userId, buildingId) {
  if (!userId || !buildingId) return { status: 'not_started' }
  try {
    const raw = window.localStorage.getItem(storageKey(userId, buildingId))
    return raw ? JSON.parse(raw) : { status: 'not_started' }
  } catch {
    return { status: 'not_started' }
  }
}

export function setVerification(userId, buildingId, data) {
  if (!userId || !buildingId) return
  window.localStorage.setItem(storageKey(userId, buildingId), JSON.stringify(data))
}
