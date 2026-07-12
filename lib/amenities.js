// Definizione centralizzata dei servizi condominiali.
// Usata in AddBuilding, VivoQuiFlow, ReviewForm, FilterSidebar, score.js.

export const AMENITY_GROUPS = [
  {
    label: 'Comfort',
    items: [
      ['elevator',    'Ascensore'],
      ['concierge',   'Portineria'],
      ['gym',         'Palestra'],
      ['pool',        'Piscina'],
      ['garden',      'Giardino'],
      ['terrace',     'Terrazzo comune'],
    ],
  },
  {
    label: 'Mobilità',
    items: [
      ['parking',     'Parcheggio'],
      ['box',         'Box / garage'],
      ['bike_room',   'Deposito bici'],
      ['ev_charging', 'Colonnine elettriche'],
      ['gate',        'Cancello automatico'],
    ],
  },
  {
    label: 'Praticità',
    items: [
      ['basement',    'Cantina'],
      ['trash_room',  'Locale rifiuti'],
      ['courtyard',   'Cortile interno'],
      ['laundry',     'Lavanderia comune'],
      ['common_room', 'Sala comune'],
    ],
  },
  {
    label: 'Sicurezza e accessibilità',
    items: [
      ['cctv',          'Videosorveglianza'],
      ['disabled_access','Accesso disabili'],
      ['intercom',      'Citofono / videocitofono'],
      ['fiber',         'Fibra internet'],
    ],
  },
]

// Lista piatta — utile per toggle e mapping
export const ALL_AMENITIES = AMENITY_GROUPS.flatMap(g => g.items)

// Mappa id → colonna DB
export const AMENITY_DB = {
  elevator:       'has_elevator',
  concierge:      'has_concierge',
  gym:            'has_gym',
  pool:           'has_pool',
  garden:         'has_garden',
  terrace:        'has_terrace',
  parking:        'has_parking',
  box:            'has_box',
  bike_room:      'has_bike_room',
  ev_charging:    'has_ev_charging',
  gate:           'has_gate',
  basement:       'has_basement',
  trash_room:     'has_trash_room',
  courtyard:      'has_courtyard',
  laundry:        'has_laundry',
  common_room:    'has_common_room',
  cctv:           'has_cctv',
  disabled_access:'has_disabled_access',
  intercom:       'has_intercom',
  fiber:          'has_fiber',
}

// Estrae la lista di amenities presenti da un oggetto building
export function amenitiesFromBuilding(b) {
  return ALL_AMENITIES
    .filter(([id]) => b[AMENITY_DB[id]])
    .map(([id, label]) => ({ id, label }))
}

// Costruisce il payload {has_elevator: true, ...} da array di id selezionati
export function amenitiesToPayload(selected) {
  const payload = {}
  ALL_AMENITIES.forEach(([id]) => {
    payload[AMENITY_DB[id]] = selected.includes(id)
  })
  return payload
}
