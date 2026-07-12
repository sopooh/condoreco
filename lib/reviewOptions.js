export const RESIDENT_TYPES = [
  { value: 'resident', label: 'Abito qui' },
  { value: 'former_resident', label: 'Ho abitato qui' },
  { value: 'evaluating', label: 'Sto valutando' },
  { value: 'owner', label: 'Proprietario non residente' },
  { value: 'tenant', label: 'Inquilino' },
  { value: 'agent', label: 'Agente immobiliare' },
]

// Sottoinsieme di RESIDENT_TYPES ammesso da admin_reviews_resident_type_check
// (niente 'evaluating'/'agent', a differenza delle recensioni edificio).
export const ADMIN_RESIDENT_TYPES = [
  { value: 'resident', label: 'Abito qui' },
  { value: 'former_resident', label: 'Ho abitato qui' },
  { value: 'owner', label: 'Proprietario non residente' },
  { value: 'tenant', label: 'Inquilino' },
]

export const ISSUES = [
  { value: 'none', label: 'Nessun problema' },
  { value: 'mold', label: 'Infiltrazioni / muffa' },
  { value: 'elevator', label: 'Ascensore' },
  { value: 'heating', label: 'Riscaldamento' },
  { value: 'noise', label: 'Rumori' },
  { value: 'security', label: 'Portone / sicurezza' },
  { value: 'costs', label: 'Spese non trasparenti' },
  { value: 'admin', label: 'Amministratore irreperibile' },
]

// Configurazione categorie punteggio condivisa da ReviewCard e ReviewForm:
// key = chiave nello state locale del form, label = etichetta UI,
// field = colonna DB (reviews/admin_reviews) letta/scritta.
export const BUILDING_REVIEW_CATEGORIES = [
  { key: 'admin', label: 'Amministratore', field: 'score_admin' },
  { key: 'maintenance', label: 'Manutenzione', field: 'score_maintenance' },
  { key: 'costs', label: 'Spese', field: 'score_costs' },
  { key: 'quality', label: 'Qualità vita', field: 'score_quality' },
  { key: 'noise', label: 'Silenziosità', field: 'score_noise' },
  { key: 'safety', label: 'Sicurezza', field: 'score_safety' },
]

export const ADMIN_REVIEW_CATEGORIES = [
  { key: 'availability', label: 'Reperibilità', field: 'score_availability' },
  { key: 'transparency', label: 'Trasparenza', field: 'score_transparency' },
  { key: 'speed', label: 'Velocità', field: 'score_speed' },
  { key: 'assemblies', label: 'Assemblee', field: 'score_assemblies' },
  { key: 'value', label: 'Qualità/prezzo', field: 'score_value' },
]
