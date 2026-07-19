// Dati mock per l'area privata del condominio (bacheca/poll/chat).
// Forma allineata alle convenzioni già usate nel DB (snake_case, campi tipo
// resident_type/is_verified), cosi il collegamento a Supabase in futuro è
// solo una sostituzione della fonte dati, non un cambio di struttura.

export const urgentNotices = [
  {
    id: 'n1', condominium_id: 'demo', type: 'urgent',
    title: 'Chiusura acqua', date: '18 Luglio', time_range: '09:00–13:00',
    author: 'admin', created_at: '2026-07-10T09:00:00Z', status: 'active',
  },
  {
    id: 'n2', condominium_id: 'demo', type: 'info',
    title: 'Controllo ascensore', date: '22 Luglio', time_range: '08:30',
    author: 'admin', created_at: '2026-07-11T10:00:00Z', status: 'active',
  },
  {
    id: 'n3', condominium_id: 'demo', type: 'event',
    title: 'Riunione condominiale', date: '29 Luglio', time_range: '19:30',
    author: 'admin', created_at: '2026-07-12T11:00:00Z', status: 'active',
  },
]

export const polls = [
  {
    id: 'p1', condominium_id: 'demo',
    question: 'Sostituire le luci dell\'ingresso con LED?',
    options: [
      { id: 'si', label: 'Sì', votes: 35 },
      { id: 'no', label: 'No', votes: 17 },
    ],
    total_votes: 52, user_vote: null,
    closes_at: '2026-08-01T00:00:00Z', created_at: '2026-07-05T00:00:00Z', status: 'active',
  },
  {
    id: 'p2', condominium_id: 'demo',
    question: 'Aggiungere una rastrelliera per biciclette in cortile?',
    options: [
      { id: 'favorevole', label: 'Favorevole', votes: 20 },
      { id: 'contrario', label: 'Contrario', votes: 17 },
    ],
    total_votes: 37, user_vote: null,
    closes_at: '2026-08-05T00:00:00Z', created_at: '2026-07-08T00:00:00Z', status: 'active',
  },
]

export const chatPreview = [
  {
    id: 'm1', condominium_id: 'demo', sender: 'Laura', role: 'resident', verified: false,
    text: 'L\'acqua torna regolare dopo le 13?', timestamp: '11:02', read: true,
  },
  {
    id: 'm2', condominium_id: 'demo', sender: 'Amministratore', role: 'admin', verified: true,
    text: 'Sì, salvo imprevisti.', timestamp: '11:05', read: true,
  },
  {
    id: 'm3', condominium_id: 'demo', sender: 'Marco', role: 'resident', verified: false,
    text: 'Ho votato per i LED 👍', timestamp: '11:07', read: false,
  },
]
