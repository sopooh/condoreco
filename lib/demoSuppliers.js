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
    ratings: { availability: 4.8, transparency: 4.7, speed: 4.9, professionalism: 4.8, value: 4.6 },
    score: 4.8, reviewCount: 12, recommendPct: 100,
    reviews: [
      { id: 'r1', name: 'Marco B.', context: 'Intervento su autoclave', score: 5, body: 'Intervento rapido e risolutivo, tecnici competenti e molto disponibili.' },
      { id: 'r2', name: 'Giulia R.', context: 'Perdita in cantina', score: 4.5, body: 'Arrivati in giornata, preventivo chiaro e foto del lavoro caricate subito.' },
    ],
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
    ratings: { availability: 4.5, transparency: 4.6, speed: 4.3, professionalism: 4.7, value: 4.4 },
    score: 4.5, reviewCount: 7, recommendPct: 92,
    reviews: [
      { id: 'r1', name: 'Paolo C.', context: 'Luci delle scale', score: 4.5, body: 'Lavoro pulito, hanno lasciato la certificazione nell\'archivio del condominio.' },
    ],
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
