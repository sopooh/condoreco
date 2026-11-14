#!/usr/bin/env node
// Sincronizza i post Instagram sul Mac e su Google Drive.
//
// 1. "Studio/": ogni carosello creato nello studio (bozze comprese), con le
//    slide numerate, caption.txt e post.json.
// 2. "Pubblicati su Instagram/": tutto ciò che è pubblicato su @condoreco,
//    anche i post fatti direttamente dall'app Instagram.
//
// Scrive in LOCAL_DIR e poi copia in DRIVE_DIR (la cartella di Google Drive
// per desktop, rilevata da sola se non indicata). Non cancella mai nulla
// sul Drive: se elimini una bozza nello studio, la copia resta.
//
// Configurazione: ~/.condoreco-instagram-sync.env (vedi install script)
//   SUPABASE_URL=https://ragltuoxnduohyqigkcg.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//   LOCAL_DIR=~/Condoreco/Instagram          (opzionale)
//   DRIVE_DIR=~/Library/CloudStorage/GoogleDrive-.../My Drive/Condoreco Instagram  (opzionale)
//
// Uso: node scripts/instagram-sync.mjs

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const HOME = os.homedir()
const expand = (p) => (p ? p.replace(/^~(?=$|\/)/, HOME) : p)

function loadEnvFile(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvFile(path.join(HOME, '.condoreco-instagram-sync.env'))

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Mancano SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY in ~/.condoreco-instagram-sync.env')
  process.exit(1)
}

const LOCAL_DIR = expand(process.env.LOCAL_DIR) || path.join(HOME, 'Condoreco', 'Instagram')

function detectDriveDir() {
  if (process.env.DRIVE_DIR) return expand(process.env.DRIVE_DIR)
  const cloud = path.join(HOME, 'Library', 'CloudStorage')
  if (!existsSync(cloud)) return null
  const drive = readdirSync(cloud).find((d) => d.startsWith('GoogleDrive-'))
  if (!drive) return null
  for (const sub of ['My Drive', 'Il mio Drive', 'Mon Drive']) {
    const p = path.join(cloud, drive, sub)
    if (existsSync(p)) return path.join(p, 'Condoreco Instagram')
  }
  return null
}
const DRIVE_DIR = detectDriveDir()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const slugify = (s) => (s || 'post').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50) || 'post'

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status} ${url}`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return null }
}

// ── 1. Caroselli dello studio ───────────────────────────────────────────────
async function syncStudio() {
  const { data: posts, error } = await supabase
    .from('ig_posts').select('*, ig_slides(*)').order('created_at', { ascending: true })
  if (error) throw new Error(`ig_posts: ${error.message}`)

  const changed = []
  for (const post of posts) {
    const slides = [...(post.ig_slides || [])].sort((a, b) => a.position - b.position)
    const date = (post.published_at || post.created_at).slice(0, 10)
    const folder = path.join('Studio', `${date}_${slugify(post.title)}_${post.id.slice(0, 6)}`)
    const dir = path.join(LOCAL_DIR, folder)
    const fingerprint = `${post.updated_at}|${post.status}|${slides.map((s) => s.storage_path).join(',')}`

    // stessa bozza rinominata: elimina la vecchia cartella locale (solo locale)
    const studioRoot = path.join(LOCAL_DIR, 'Studio')
    if (existsSync(studioRoot)) {
      for (const d of readdirSync(studioRoot)) {
        if (d.endsWith(`_${post.id.slice(0, 6)}`) && d !== path.basename(folder)) {
          await rm(path.join(studioRoot, d), { recursive: true, force: true })
        }
      }
    }

    const meta = await readJson(path.join(dir, 'post.json'))
    if (meta?.fingerprint === fingerprint) continue

    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    for (let i = 0; i < slides.length; i++) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/instagram/${slides[i].storage_path}`
      await download(url, path.join(dir, `${String(i + 1).padStart(2, '0')}.jpg`))
    }
    await writeFile(path.join(dir, 'caption.txt'), post.caption || '')
    await writeFile(path.join(dir, 'post.json'), JSON.stringify({
      fingerprint, id: post.id, title: post.title, status: post.status,
      permalink: post.permalink, published_at: post.published_at, created_at: post.created_at,
      boost: post.boost, slides: slides.map((s) => ({ source: s.source, template: s.template, params: s.params })),
    }, null, 2))
    changed.push(folder)
  }
  return changed
}

// ── 2. Archivio di tutto il profilo Instagram ───────────────────────────────
async function syncInstagramArchive() {
  const { data: creds, error } = await supabase.from('ig_credentials').select('access_token, ig_user_id').eq('id', 1).maybeSingle()
  if (error) throw new Error(`ig_credentials: ${error.message}`)
  if (!creds) return []

  const version = process.env.IG_GRAPH_VERSION || 'v25.0'
  const fields = 'id,caption,media_type,media_url,permalink,timestamp,children{media_type,media_url}'
  const igLogin = creds.access_token.startsWith('IG')
  const host = igLogin ? 'graph.instagram.com' : 'graph.facebook.com'
  const node = igLogin ? 'me' : creds.ig_user_id
  let url = `https://${host}/${version}/${node}/media?fields=${encodeURIComponent(fields)}&limit=50`
  const changed = []

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${creds.access_token}` } })
    const page = await res.json()
    if (!res.ok || page.error) throw new Error(`Instagram: ${page.error?.message || res.status}`)
    for (const m of page.data || []) {
      const folder = path.join('Pubblicati su Instagram', `${m.timestamp.slice(0, 10)}_${m.id}`)
      const dir = path.join(LOCAL_DIR, folder)
      if (existsSync(path.join(dir, 'post.json'))) continue
      await mkdir(dir, { recursive: true })
      const items = m.media_type === 'CAROUSEL_ALBUM' ? (m.children?.data || []) : [m]
      for (let i = 0; i < items.length; i++) {
        if (!items[i].media_url) continue
        const ext = items[i].media_type === 'VIDEO' ? 'mp4' : 'jpg'
        await download(items[i].media_url, path.join(dir, `${String(i + 1).padStart(2, '0')}.${ext}`))
      }
      await writeFile(path.join(dir, 'caption.txt'), m.caption || '')
      await writeFile(path.join(dir, 'post.json'), JSON.stringify({
        id: m.id, media_type: m.media_type, permalink: m.permalink, timestamp: m.timestamp,
      }, null, 2))
      changed.push(folder)
    }
    url = page.paging?.next || null
  }
  return changed
}

async function main() {
  await mkdir(LOCAL_DIR, { recursive: true })
  const changed = [...await syncStudio()]
  try {
    changed.push(...await syncInstagramArchive())
  } catch (e) {
    console.error(`[archivio Instagram] ${e.message}`)
  }

  if (DRIVE_DIR) {
    // copia ciò che è cambiato + tutto ciò che sul Drive non c'è ancora
    const all = new Set(changed)
    for (const root of ['Studio', 'Pubblicati su Instagram']) {
      const local = path.join(LOCAL_DIR, root)
      if (!existsSync(local)) continue
      for (const d of readdirSync(local)) {
        if (!existsSync(path.join(DRIVE_DIR, root, d, 'post.json'))) all.add(path.join(root, d))
      }
    }
    for (const folder of all) {
      const target = path.join(DRIVE_DIR, folder)
      await rm(target, { recursive: true, force: true })
      await mkdir(path.dirname(target), { recursive: true })
      await cp(path.join(LOCAL_DIR, folder), target, { recursive: true })
    }
  }

  const stamp = new Date().toLocaleString('it-IT')
  console.log(`[${stamp}] ${changed.length} cartelle aggiornate. Mac: ${LOCAL_DIR}${DRIVE_DIR ? ` | Drive: ${DRIVE_DIR}` : ' | Drive non trovato'}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
