// Personaggi di Condoreco: gli stessi animali degli avatar del sito.
// Nei testi si scrivono per nome italiano (o id inglese): "gufo: testo".

export const CHARACTERS = {
  gufo: { id: 'owl', name: 'Gufo', color: '#975A2B' },
  volpe: { id: 'fox', name: 'Volpe', color: '#FA6408' },
  cane: { id: 'dog', name: 'Cane', color: '#DA011E' },
  delfino: { id: 'dolphin', name: 'Delfino', color: '#078EFB' },
  leone: { id: 'lion', name: 'Leone', color: '#DA550A' },
  coniglio: { id: 'bunny', name: 'Coniglio', color: '#F773A7' },
  panda: { id: 'panda', name: 'Panda', color: '#111111' },
  gatto: { id: 'cat', name: 'Gatto', color: '#E69E06' },
  rana: { id: 'frog', name: 'Rana', color: '#1A8955' },
  koala: { id: 'koala', name: 'Koala', color: '#888887' },
  orso: { id: 'bear', name: 'Orso', color: '#C49D6B' },
  polpo: { id: 'octopus', name: 'Polpo', color: '#7D40E5' },
}

export function findCharacter(key) {
  const k = String(key || '').trim().toLowerCase()
  return CHARACTERS[k] || Object.values(CHARACTERS).find((c) => c.id === k) || null
}

// "gufo: testo" una riga per battuta -> [{ character, text }]
export function parseDialogue(lines) {
  return String(lines || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^:]{1,20}):\s*(.+)$/)
      const character = m ? findCharacter(m[1]) : null
      return character ? { character, text: m[2] } : { character: null, text: l }
    })
    .slice(0, 5)
}
