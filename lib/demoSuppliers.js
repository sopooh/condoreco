// Fornitori di esempio, mostrati solo come anteprima quando la directory
// non ha ancora Recofixer iscritti. Nomi inventati, sempre marcati "Esempio":
// non si salvano e non si contattano.
export const DEMO_SUPPLIERS = [
  {
    id: 'demo-1', demo: true, company_name: 'Idraulica Esempio', verified: true,
    categories: ['plumbing', 'heating'], zones: ['Milano', 'Monza'], jobs: 38, condos: 12,
    created_at: '2025-03-01T00:00:00Z',
    description: 'Perdite, autoclavi, caldaie centralizzate e contabilizzatori. Pronto intervento in giornata per i condomini seguiti.',
  },
  {
    id: 'demo-2', demo: true, company_name: 'Elettrica Demo', verified: true,
    categories: ['electrical', 'antenna'], zones: ['Milano'], jobs: 21, condos: 8,
    created_at: '2025-09-01T00:00:00Z',
    description: 'Luci delle scale, quadri elettrici delle parti comuni, citofoni e impianti TV centralizzati.',
  },
  {
    id: 'demo-3', demo: true, company_name: 'Edilizia Prova', verified: false,
    categories: ['building_works', 'drains'], zones: [], jobs: 5, condos: 3,
    created_at: '2026-10-01T00:00:00Z',
    description: 'Facciate, infiltrazioni, piccole opere murarie e spurghi. Sopralluogo e preventivo caricati su Condoreco.',
  },
]
