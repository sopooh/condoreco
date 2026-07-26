// Stato di verifica residenza per condominio — persistito in localStorage
// (stesso pattern del flag onboarding condorank_onboarded_*). Nessun backend
// reale per l'upload ancora: niente storage documenti, nessuna coda di
// revisione admin. Da collegare in futuro a una vera tabella (es.
// residence_verifications: user_id, building_id, status, document_type,
// document_url, reviewed_at).
//
// Questo stato resta usato solo per la messaggistica UI (distinguere "non
// iniziato"/"in attesa"/"rifiutato" nella schermata di chi non è ancora
// membro). L'accesso reale all'area condominio è deciso da una riga in
// condo_members (vedi useCondoRole / middleware.ts): il wizard
// (app/edificio/[id]/condominio/verifica/page.jsx) la scrive lui stesso al
// termine della verifica simulata.

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
