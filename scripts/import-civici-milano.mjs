#!/usr/bin/env node
// Importa i civici del Comune di Milano (dataset ds634 "Numeri civici con
// coordinate", licenza CC BY, fonte: Comune di Milano) nella tabella buildings.
//
// Tiene solo i civici residenziali, applicati e non soppressi, senza passi
// carrai e senza i civici interni/secondari (BARRA2: N.., P.., G..).
// Entrano con status 'imported' ("Non recensito"); alla prima recensione un
// trigger li porta a 'pending' (Da verificare).
// Rilanciabile: fa upsert su (source, source_id) e salta i palazzi che esistono
// già in app con lo stesso indirizzo e civico.
//
// Uso:
//   node scripts/import-civici-milano.mjs <file.json> --dry-run   (solo anteprima)
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/import-civici-milano.mjs <file.json>
// Le variabili si possono anche mettere in .env.local.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

const SOURCE = 'comune_milano_ds634'
const BATCH = 1000

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
if (!file) {
  console.error('Uso: node scripts/import-civici-milano.mjs <file.json> [--dry-run]')
  process.exit(1)
}

for (const envFile of ['.env.local', '.env']) {
  if (!existsSync(envFile)) continue
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

// ---------- normalizzazione nomi ----------

const LOWER = new Set([
  'di', 'da', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'dal', 'dalla', 'dai', 'dalle',
  'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'e', 'ed', 'in', 'a', 'sul', 'sulla', 'per', 'con', 'tra', 'fra',
  // articolate elise: dell'Arte, sull'Isola (D' resta maiuscola: D'Annunzio)
  'dell', 'dall', 'all', 'sull', 'nell',
])
const ROMAN = /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/
const ACCENT = { A: 'à', E: 'è', I: 'ì', O: 'ò', U: 'ù' }

function capWord(w, first) {
  if (!w) return w
  // accento scritto come apostrofo finale: SAVARE' -> Savarè
  const acc = w.match(/^(.*)([AEIOU])'$/)
  if (acc) return capWord(acc[1], first) + ACCENT[acc[2]]
  // elisioni: DELL'ARTE -> dell'Arte, D'ANNUNZIO -> D'Annunzio
  if (w.includes("'")) {
    const [a, ...rest] = w.split("'")
    const head = capWord(a, first)
    return [head, ...rest.map((r) => capWord(r, true))].join("'")
  }
  if (w.includes('-')) return w.split('-').map((p, i) => capWord(p, first || i > 0)).join('-')
  const lw = w.toLowerCase()
  if (LOWER.has(lw)) return first ? lw.charAt(0).toUpperCase() + lw.slice(1) : lw
  if (ROMAN.test(w) && w.length > 1) return w
  return lw.charAt(0).toUpperCase() + lw.slice(1)
}

function titleCase(s) {
  return s.trim().split(/\s+/).map((w, i) => capWord(w, i === 0)).join(' ')
}

const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function streetNumber(r) {
  let n = String(r.NUMERO || '').trim()
  if (r.LETTERA && r.LETTERA.trim()) n += r.LETTERA.trim().toUpperCase()
  if (r.BARRA && r.BARRA.trim()) n += '/' + r.BARRA.trim()
  return n || null
}

// ---------- lettura e filtro ----------

const raw = readFileSync(file, 'utf8')
const records = raw.trimStart().startsWith('[')
  ? JSON.parse(raw)
  : raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))

const keep = (r) =>
  r.STATOCIVICO === 'Applicato' &&
  r.RESIDENZIALE === '1' &&
  r.PASSOCARRAIO !== '1' &&
  !(r.BARRA2 || '').trim() &&
  (r.DATA_SOPPRESSIONE == null || r.DATA_SOPPRESSIONE === '0') &&
  Number.isFinite(r.LAT_WGS84) && Number.isFinite(r.LONG_WGS84)

const rows = records.filter(keep).map((r) => ({
  source: SOURCE,
  source_id: String(r.IDMASTER),
  address: titleCase(`${r.TIPO} ${r.DESCRITTIVO}`),
  street_number: streetNumber(r),
  city: 'Milano',
  province: 'MI',
  region: 'Lombardia',
  neighborhood: r.NIL ? titleCase(r.NIL) : null,
  lat: r.LAT_WGS84,
  lng: r.LONG_WGS84,
  status: 'imported',
  place_type: 'civico',
}))

console.log(`Record nel file: ${records.length}. Civici residenziali da importare: ${rows.length}.`)

if (dryRun) {
  for (const r of rows.filter((_, i) => i % Math.ceil(rows.length / 15) === 0)) {
    console.log(`  ${r.address} ${r.street_number} (${r.neighborhood})  ${r.lat}, ${r.lng}`)
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

// Palazzi già presenti in app (inseriti dagli utenti): non duplicarli.
const { data: existing, error: exErr } = await supabase
  .from('buildings')
  .select('address, street_number')
  .ilike('city', 'milano')
  .is('source', null)
if (exErr) throw exErr
const taken = new Set(existing.map((b) => `${norm(b.address)}|${norm(b.street_number)}`))
const toWrite = rows.filter((r) => !taken.has(`${norm(r.address)}|${norm(r.street_number)}`))
console.log(`Già presenti in app e saltati: ${rows.length - toWrite.length}.`)

let done = 0
for (let i = 0; i < toWrite.length; i += BATCH) {
  const chunk = toWrite.slice(i, i + BATCH)
  // ignoreDuplicates: ai rilanci non tocca i civici già importati (né il loro status).
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
