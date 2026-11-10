// Categorie di manutenzione per "I tuoi interventi" e la rubrica fornitori
// (dall'elenco fornitori per gli interventi urgenti dell'amministrazione).
// I valori devono corrispondere ai CHECK in 20261110_interventi.sql.
export const MAINTENANCE_CATEGORIES = [
  { value: 'elevator', label: 'Ascensore', icon: 'elevator',
    template: { title: 'Ascensore fermo o guasto', description: 'L\'ascensore non funziona (bloccato, porte che non si chiudono o rumori strani). Da quando: ' } },
  { value: 'heating', label: 'Riscaldamento', icon: 'radiator',
    template: { title: 'Riscaldamento non funziona', description: 'I termosifoni restano freddi o scaldano poco. Da quando: ' } },
  { value: 'electrical', label: 'Elettricità', icon: 'bolt',
    template: { title: 'Guasto elettrico nelle parti comuni', description: 'Luci delle scale o dell\'androne spente, o salta la corrente. Da quando: ' } },
  { value: 'plumbing', label: 'Idraulica', sub: 'e autoclave', icon: 'tap',
    template: { title: 'Perdita d\'acqua o poca pressione', description: 'C\'è una perdita o l\'acqua arriva con poca pressione. Da quando: ' } },
  { value: 'drains', label: 'Spurghi', icon: 'drain',
    template: { title: 'Scarico intasato', description: 'Uno scarico è intasato o si sentono cattivi odori. Da quando: ' } },
  { value: 'locksmith', label: 'Fabbro', icon: 'key',
    template: { title: 'Portone o serratura da sistemare', description: 'Il portone (o il cancello) non si chiude bene o la serratura è bloccata. Da quando: ' } },
  { value: 'antenna', label: 'Antenna', icon: 'antenna',
    template: { title: 'Segnale TV assente o debole', description: 'Alcuni canali non si vedono o il segnale va e viene. Da quando: ' } },
  { value: 'building_works', label: 'Impresa edile', icon: 'bricks',
    template: { title: 'Danno a muri, intonaco o infiltrazioni', description: 'Crepe, intonaco che cade o macchie di umidità. Da quando: ' } },
  { value: 'other', label: 'Altro', icon: 'dots', template: { title: '', description: '' } },
]

export function maintenanceCategory(value) {
  return MAINTENANCE_CATEGORIES.find((c) => c.value === value) || MAINTENANCE_CATEGORIES[MAINTENANCE_CATEGORIES.length - 1]
}
export const maintenanceCategoryLabel = (value) => maintenanceCategory(value).label
