#!/usr/bin/env node
// Collega gli studi di amministrazione (tabella administrators) alla loro scheda
// Google Maps. Per ogni studio fa una Text Search (Places API New) con nome e
// indirizzo, controlla che il risultato combaci e salva SOLO il place_id
// (l'unico dato Google che i termini consentono di conservare). Nome, indirizzo
// e recensioni Google non vengono salvati.
//
// Un risultato combacia se l'indirizzo Google ha lo stesso numero civico e
// almeno una parola della via, E il nome ha almeno una parola significativa in
// comune con il nostro. Gli studi già controllati (google_checked_at) si saltano,
// quindi rilanciare non consuma altre chiamate.
//
// Costo: 1 chiamata Text Search Pro per studio (quota gratuita Google: 5.000 al
// mese). Con --limit N si fa una prova su N studi.
//
// Uso:
//   GOOGLE_MAPS_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/match-google-places.mjs [--limit 20] [--dry-run]

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { norm } from './lib/italian-address.mjs'

for (const envFile of ['.env.local', '.env']) {
  if (!existsSync(envFile)) continue
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity

const KEY = process.env.GOOGLE_MAPS_API_KEY
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY || !url || !serviceKey) {
  console.error('Servono GOOGLE_MAPS_API_KEY, SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

// Parole che non identificano uno studio
const STOP = new Set(('srl srls spa sas snc ss societa semplice responsabilita limitata semplificata accomandita ' +
  'nome collettivo cooperativa consortile unipersonale breve forma abbreviata abbreviabile socio unico ' +
  'studio amministrazione amministrazioni amministrativo immobiliare immobiliari immobili gestione gestioni ' +
  'stabili condominio condomini condominiale condominiali servizi service group gruppo italia milano ' +
  'della delle dei degli del di da e ed in per con rag geom ing dott associati partners company').split(' '))
const STREET_STOP = new Set('via viale piazza piazzale corso largo privata della delle dei degli del dalle galleria foro vicolo alzaia'.split(' '))

const words = (s, stop) => norm(s).split(' ').filter((w) => w.length >= 3 && !stop.has(w))
const civicOf = (address) => (address.match(/(\d+)[^\s]*$/) || [])[1]

function matches(admin, place) {
  const gAddr = norm(place.formattedAddress || '')
  const civ = civicOf(admin.address || '')
  if (!civ || !new RegExp(`\\b${civ}\\b`).test(gAddr)) return false
  const streetHit = words((admin.address || '').replace(/\s+\S*\d\S*$/, ''), STREET_STOP).some((w) => gAddr.includes(w))
  if (!streetHit) return false
  const gName = norm(place.displayName?.text || '')
  return words(admin.name, STOP).some((w) => gName.includes(w))
}

async function search(admin) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: `${admin.name} ${admin.address} Milano`,
      languageCode: 'it',
      regionCode: 'IT',
      pageSize: 3,
      locationBias: { circle: { center: { latitude: 45.4642, longitude: 9.19 }, radius: 20000 } },
    }),
  })
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()).places || []
}

const { data: admins, error } = await supabase
  .from('administrators')
  .select('id, name, address')
  .eq('city', 'Milano')
  .eq('is_sample', false)
  .is('google_checked_at', null)
  .not('address', 'is', null)
  .order('import_rank', { ascending: true, nullsFirst: true })
if (error) throw error

const todo = admins.slice(0, limit)
console.log(`Studi da controllare: ${todo.length}${dryRun ? ' (dry run, nessuna scrittura)' : ''}`)
let found = 0
for (const [i, admin] of todo.entries()) {
  let placeId = null
  try {
    const hit = (await search(admin)).find((p) => matches(admin, p))
    placeId = hit?.id || null
    if (hit) { found++; console.log(`  ✓ ${admin.name}  →  ${hit.displayName?.text}`) }
  } catch (e) {
    console.error(`\nInterrotto a ${admin.name}: ${e.message}`)
    break
  }
  if (!dryRun) {
    const { error: upErr } = await supabase
      .from('administrators')
      .update({ google_place_id: placeId, google_checked_at: new Date().toISOString() })
      .eq('id', admin.id)
    if (upErr) { console.error(upErr.message); break }
  }
  if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${todo.length}, collegati ${found}`)
}
console.log(`Fatto: ${found} studi collegati a Google su ${todo.length} controllati.`)
