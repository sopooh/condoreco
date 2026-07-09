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
