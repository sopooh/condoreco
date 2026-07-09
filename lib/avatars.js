// Avatar animali CondoReco. Immagini PNG in public/avatars/.
// L'utente ne sceglie uno; se non sceglie, ne viene assegnato uno
// fisso derivato dall'id (sempre lo stesso per quell'utente).

export const ANIMAL_AVATARS = [
  { id: 'fox',     src: '/avatars/fox.png',     label: 'Volpe' },
  { id: 'dog',     src: '/avatars/dog.png',     label: 'Cane' },
  { id: 'dolphin', src: '/avatars/dolphin.png', label: 'Delfino' },
  { id: 'lion',    src: '/avatars/lion.png',    label: 'Leone' },
  { id: 'bunny',   src: '/avatars/bunny.png',   label: 'Coniglio' },
  { id: 'panda',   src: '/avatars/panda.png',   label: 'Panda' },
  { id: 'owl',     src: '/avatars/owl.png',     label: 'Gufo' },
  { id: 'cat',     src: '/avatars/cat.png',     label: 'Gatto' },
  { id: 'frog',    src: '/avatars/frog.png',    label: 'Rana' },
  { id: 'koala',   src: '/avatars/koala.png',   label: 'Koala' },
  { id: 'bear',    src: '/avatars/bear.png',    label: 'Orso' },
  { id: 'octopus', src: '/avatars/octopus.png', label: 'Polpo' },
]

// Avatar fisso derivato dall'id utente (hash deterministico)
export function defaultAvatarFor(userId = '') {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return ANIMAL_AVATARS[h % ANIMAL_AVATARS.length]
}

export function avatarById(id) {
  return ANIMAL_AVATARS.find((a) => a.id === id) || null
}

// Ruoli: condoranker = residente (verde brand), condoranked = amministratore (arancio)
export const ROLES = {
  condoranker: { label: 'Recoer', color: 'var(--teal)', sub: 'Residente' },
  condoranked: { label: 'Recoed', color: '#E8651A',     sub: 'Amministratore' },
}
