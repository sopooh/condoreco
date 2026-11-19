#!/usr/bin/env node
// Importa i civici di Roma dall'indirizzario ANNCSU (Archivio nazionale dei
// numeri civici, Istat e Agenzia delle Entrate), file regionale del Lazio:
// https://anncsu.open.agenziaentrate.gov.it/age-inspire/opendata/anncsu/getds.php?INDIR_LAZI
//
// ANNCSU non distingue i civici residenziali, quindi si tengono:
// - solo il comune di Roma (codice catastale H501), con coordinate;
// - solo i civici senza esponente (12 sì, 12A/12B no);
// - solo l'area urbana, grosso modo entro il GRA (riquadro URBAN_BBOX).
// Entrano con status 'imported' come i civici di Milano. Upsert idempotente
// su (source, source_id); salta i palazzi già presenti in app a Roma.
//
// Uso:
//   node scripts/import-civici-roma.mjs <INDIR_LAZI_*.csv> --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-civici-roma.mjs <INDIR_LAZI_*.csv>

import { createClient } from '@supabase/supabase-js'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import readline from 'node:readline'
import { titleCase, norm } from './lib/italian-address.mjs'

const SOURCE = 'anncsu_roma'
const CODICE_ROMA = 'H501'
const URBAN_BBOX = { latMin: 41.80, latMax: 41.99, lngMin: 12.38, lngMax: 12.62 }
const BATCH = 1000

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
if (!file) {
  console.error('Uso: node scripts/import-civici-roma.mjs <INDIR_LAZI_*.csv> [--dry-run]')
  process.exit(1)
}

for (const envFile of ['.env.local', '.env']) {
  if (!existsSync(envFile)) continue
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const num = (v) => (v && v.trim() ? Number(v.replace(',', '.')) : NaN)

// ---------- lettura e filtro ----------

const rl = readline.createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })
let header = null
let total = 0
const rows = []
for await (const line of rl) {
  if (!header) { header = line.split(';'); continue }
  if (!line.startsWith(CODICE_ROMA + ';')) continue
  total++
  const v = line.split(';')
  const r = Object.fromEntries(header.map((h, i) => [h, v[i] ?? '']))
  if ((r.ESPONENTE || '').trim() || (r.SPECIFICITA || '').trim()) continue
  const lng = num(r.COORD_X_COMUNE)
  const lat = num(r.COORD_Y_COMUNE)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
  if (lat < URBAN_BBOX.latMin || lat > URBAN_BBOX.latMax || lng < URBAN_BBOX.lngMin || lng > URBAN_BBOX.lngMax) continue
  const civico = (r.CIVICO || '').trim()
  if (!civico || !r.ODONIMO.trim()) continue
  rows.push({
    source: SOURCE,
    source_id: String(r.PROGRESSIVO_ACCESSO),
    address: titleCase(r.ODONIMO),
    street_number: civico,
    city: 'Roma',
    province: 'RM',
    region: 'Lazio',
    neighborhood: null,
    lat,
    lng,
    status: 'imported',
    place_type: 'civico',
  })
}

console.log(`Civici di Roma nel file: ${total}. Da importare (senza esponente, area urbana): ${rows.length}.`)

if (dryRun) {
  for (const r of rows.filter((_, i) => i % Math.ceil(rows.length / 15) === 0)) {
    console.log(`  ${r.address} ${r.street_number}  ${r.lat}, ${r.lng}`)
  }
  console.log('Dry run: nessuna scrittura.')
  process.exit(0)
}

// ---------- scrittura ----------

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Mancano SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

// Palazzi già inseriti dagli utenti a Roma (anche scritti "Rome"): non duplicarli.
const { data: existing, error: exErr } = await supabase
  .from('buildings')
  .select('address, street_number')
  .or('city.ilike.roma,city.ilike.rome')
  .is('source', null)
if (exErr) throw exErr
const taken = new Set(existing.map((b) => `${norm(b.address)}|${norm(b.street_number)}`))
const toWrite = rows.filter((r) => !taken.has(`${norm(r.address)}|${norm(r.street_number)}`))
console.log(`Già presenti in app e saltati: ${rows.length - toWrite.length}.`)

let done = 0
for (let i = 0; i < toWrite.length; i += BATCH) {
  const chunk = toWrite.slice(i, i + BATCH)
  const { error } = await supabase
    .from('buildings')
    .upsert(chunk, { onConflict: 'source,source_id', ignoreDuplicates: true })
  if (error) {
    console.error(`Errore al lotto ${i / BATCH + 1}:`, error.message)
    process.exit(1)
  }
  done += chunk.length
  process.stdout.write(`\r${done}/${toWrite.length}`)
}
console.log('\nImport completato.')
