// Categorie di manutenzione per "I tuoi interventi" e la rubrica fornitori
// (dall'elenco fornitori per gli interventi urgenti dell'amministrazione).
// I valori devono corrispondere ai CHECK in 20261110_interventi.sql.
export const MAINTENANCE_CATEGORIES = [
  { value: 'elevator', label: 'Ascensore', icon: 'elevator' },
  { value: 'heating', label: 'Riscaldamento', icon: 'radiator' },
  { value: 'electrical', label: 'Elettricità', icon: 'bolt' },
  { value: 'plumbing', label: 'Idraulica', sub: 'e autoclave', icon: 'tap' },
  { value: 'drains', label: 'Spurghi', icon: 'drain' },
  { value: 'locksmith', label: 'Fabbro', icon: 'key' },
  { value: 'antenna', label: 'Antenna', icon: 'antenna' },
  { value: 'building_works', label: 'Impresa edile', icon: 'bricks' },
  { value: 'other', label: 'Altro', icon: 'dots' },
]

export function maintenanceCategory(value) {
  return MAINTENANCE_CATEGORIES.find((c) => c.value === value) || MAINTENANCE_CATEGORIES[MAINTENANCE_CATEGORIES.length - 1]
}
export const maintenanceCategoryLabel = (value) => maintenanceCategory(value).label
