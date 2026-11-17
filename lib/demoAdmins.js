// Amministratori di esempio: anteprima di come appare un profilo, sempre
// marcati "Esempio", non indicizzati, non recensibili né contattabili.
// I fornitori collegati sono i fornitori di esempio (lib/demoSuppliers).
const rv = (id, name, resident_type, score, body) => ({ id, score, resident_type, body, profiles: { display_name: name } })

export const DEMO_ADMINS = [
  {
    id: 'demo-admin-1', demo: true, name: 'Studio Esempio', studio_name: 'Studio Esempio Amministrazioni',
    city: 'Milano', address: 'Via di Esempio 1', active_since: 2006, verified: true,
    score: 4.6, score_availability: 4.7, score_transparency: 4.8, score_speed: 4.4, score_assemblies: 4.6, score_value: 4.3,
    review_count: 18, building_count: 24, avg_monthly_fee: 135,
    description: 'Studio di amministrazione condominiale attivo dal 2006 tra Milano e Monza. Rendiconto online, assemblee anche in videochiamata e un referente dedicato per ogni condominio.',
    reviews: [
      rv('r1', 'Chiara M.', 'resident', 5, 'Risponde sempre entro la giornata e il rendiconto è chiaro, voce per voce.'),
      rv('r2', 'Andrea T.', 'resident', 4, 'Assemblee ben organizzate, verbali puntuali. Qualche ritardo sui lavori straordinari.'),
    ],
    buildings: [
      { id: 'demo-b1', address: 'Via Esempio', street_number: '12', city: 'Milano', neighborhood: 'NoLo', score: 4.5, review_count: 6 },
      { id: 'demo-b2', address: 'Viale Prova', street_number: '84', city: 'Milano', neighborhood: 'Loreto', score: 4.2, review_count: 4 },
      { id: 'demo-b3', address: 'Piazza Demo', street_number: '3', city: 'Monza', neighborhood: 'Centro', score: 4.8, review_count: 3 },
    ],
    supplierIds: ['demo-1', 'demo-2', 'demo-3'],
  },
  {
    id: 'demo-admin-2', demo: true, name: 'Giulia Demo', studio_name: 'Amministrazioni Demo',
    city: 'Milano', address: 'Corso Esempio 40', active_since: 2015, verified: true,
    score: 3.9, score_availability: 4.2, score_transparency: 3.8, score_speed: 3.6, score_assemblies: 4.1, score_value: 3.9,
    review_count: 9, building_count: 11, avg_monthly_fee: 110,
    description: 'Amministratrice di condominio in zona Città Studi e Lambrate. Gestione dei fornitori con preventivi comparati e archivio documenti condiviso con i residenti.',
    reviews: [
      rv('r1', 'Luca P.', 'resident', 4, 'Disponibile e precisa con i documenti, a volte lenta a rispondere in agosto.'),
      rv('r2', 'Sara F.', 'former_resident', 3.5, 'Buona gestione ordinaria, assemblee un po\' lunghe.'),
    ],
    buildings: [
      { id: 'demo-b4', address: 'Via Prova', street_number: '7', city: 'Milano', neighborhood: 'Città Studi', score: 3.9, review_count: 5 },
      { id: 'demo-b5', address: 'Via Esempio', street_number: '21', city: 'Milano', neighborhood: 'Lambrate', score: 3.7, review_count: 2 },
    ],
    supplierIds: ['demo-1', 'demo-2'],
  },
  {
    id: 'demo-admin-3', demo: true, name: 'Marco Prova', studio_name: null,
    city: 'Monza', address: 'Via Demo 9', active_since: 2021, verified: false,
    score: 3.1, score_availability: 2.9, score_transparency: 3.4, score_speed: 2.8, score_assemblies: 3.3, score_value: 3.2,
    review_count: 4, building_count: 3, avg_monthly_fee: 95,
    description: 'Amministratore indipendente a Monza, segue piccoli condomini con meno di 20 unità.',
    reviews: [
      rv('r1', 'Elena V.', 'resident', 3, 'Prezzi contenuti, ma per le urgenze bisogna insistere.'),
    ],
    buildings: [
      { id: 'demo-b6', address: 'Via Prova', street_number: '15', city: 'Monza', neighborhood: 'San Biagio', score: 3.1, review_count: 2 },
    ],
    supplierIds: ['demo-3'],
  },
]

export const findDemoAdmin = (id) => DEMO_ADMINS.find((a) => a.id === id) || null
