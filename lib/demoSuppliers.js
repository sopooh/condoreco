// Fornitori di esempio, mostrati solo come anteprima quando la directory
// non ha ancora Recofixer iscritti. Nomi inventati, sempre marcati "Esempio":
// non si salvano e non si contattano.
export const DEMO_SUPPLIERS = [
  {
    id: 'demo-1', demo: true, company_name: 'Idraulica Esempio', verified: true,
    categories: ['plumbing', 'heating'], zones: ['Milano', 'Monza'], jobs: 38, condos: 12,
    created_at: '2025-03-01T00:00:00Z', founded: 2012,
    description: 'Ditta specializzata in impianti idraulici e riscaldamento per condomini. Seguiamo perdite, autoclavi, caldaie centralizzate e contabilizzatori, con pronto intervento in giornata per i condomini che assistiamo. Ogni lavoro ha preventivo, foto e fattura caricati su Condoreco, così i residenti vedono cosa è stato fatto.',
    perks: ['Urgenze 24/7', 'Sopralluogo gratuito', 'Fattura elettronica'],
    services: ['Perdite e infiltrazioni', 'Autoclave', 'Caldaia centralizzata', 'Contabilizzatori', 'Manutenzione periodica'],
    recent: [
      { title: 'Sostituzione autoclave', when: 'Ottobre 2026', where: 'Milano, zona Città Studi' },
      { title: 'Riparazione perdita in cantina', when: 'Settembre 2026', where: 'Monza centro' },
      { title: 'Revisione caldaia centralizzata', when: 'Settembre 2026', where: 'Milano, Porta Romana' },
    ],
    priceFrom: '60 €/h',
  },
  {
    id: 'demo-2', demo: true, company_name: 'Elettrica Demo', verified: true,
    categories: ['electrical', 'antenna'], zones: ['Milano'], jobs: 21, condos: 8,
    created_at: '2025-09-01T00:00:00Z', founded: 2015,
    description: 'Impianti elettrici delle parti comuni: luci delle scale e dell\'androne, quadri elettrici, citofoni e videocitofoni, impianti TV centralizzati. Certificazioni di conformità incluse.',
    perks: ['Interventi rapidi', 'Certificazioni', 'Preventivo online'],
    services: ['Luci scale e androne', 'Quadri elettrici', 'Citofoni e videocitofoni', 'Antenna centralizzata'],
    recent: [
      { title: 'Nuovi corpi illuminanti LED nelle scale', when: 'Ottobre 2026', where: 'Milano, Isola' },
      { title: 'Sostituzione videocitofono', when: 'Agosto 2026', where: 'Milano, NoLo' },
    ],
    priceFrom: '45 €/h',
  },
  {
    id: 'demo-3', demo: true, company_name: 'Edilizia Prova', verified: false,
    categories: ['building_works', 'drains'], zones: [], jobs: 5, condos: 3,
    created_at: '2026-10-01T00:00:00Z', founded: 2008,
    description: 'Facciate, infiltrazioni, piccole opere murarie e spurghi. Sopralluogo e preventivo caricati su Condoreco, con gestione delle pratiche per i lavori condominiali.',
    perks: ['Gestione pratiche', 'Team qualificato', 'Lavori condominiali'],
    services: ['Rifacimento facciate', 'Infiltrazioni', 'Opere murarie', 'Spurghi'],
    recent: [
      { title: 'Ripristino intonaco del cortile', when: 'Novembre 2026', where: 'Milano, Lambrate' },
    ],
    priceFrom: null,
  },
]

export const findDemoSupplier = (id) => DEMO_SUPPLIERS.find((s) => s.id === id) || null
