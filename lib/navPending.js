'use client'

import { useSyncExternalStore } from 'react'

// Conteggio delle navigazioni dei filtri in corso, condiviso tra i componenti
// che usano useParamNav: serve a mostrare il loader mentre arrivano i dati.
let count = 0
const subs = new Set()
const emit = () => subs.forEach((f) => f())

export function navStart() { count += 1; emit() }
export function navEnd() { count = Math.max(0, count - 1); emit() }

export function useNavPending() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f) },
    () => count > 0,
    () => false,
  )
}
