import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { renderTemplate, setLogos, setAvatars, setMascots, setCovers, TEMPLATES, SLIDE_W, SLIDE_H } from './templates'
import { loadTemplateData } from './data'

let logosPromise = null
function loadLogos() {
  if (!logosPromise) {
    const dir = path.join(process.cwd(), 'lib/instagram')
    const uri = async (f) => `data:image/png;base64,${(await readFile(path.join(dir, f))).toString('base64')}`
    logosPromise = Promise.all([uri('logo-teal.png'), uri('logo-white.png')])
      .then(([teal, white]) => setLogos({ teal, white }))
      .then(async () => {
        const ids = ['owl', 'fox', 'dog', 'dolphin', 'lion', 'bunny', 'panda', 'cat', 'frog', 'koala', 'bear', 'octopus']
        const entries = await Promise.all(ids.map(async (id) => [id, await uri(`characters/${id}.png`)]))
        setAvatars(Object.fromEntries(entries))
        const jpg = async (f) => `data:image/jpeg;base64,${(await readFile(path.join(dir, f))).toString('base64')}`
        setCovers({ 'condor-flight': await jpg('covers/condor-flight.jpg'), 'condor-desk': await jpg('covers/condor-desk.jpg') })
        setMascots({ happy: await uri('characters/condor.png'), determined: await uri('characters/condor-determined.png'), jump: await jpg('characters/condor-jump.jpg'), sleep: await jpg('characters/condor-sleep.jpg') })
      })
  }
  return logosPromise
}

let fontsPromise = null
function loadFonts() {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), 'lib/instagram/fonts')
    fontsPromise = Promise.all(
      [400, 600, 800].map(async (weight) => ({
        name: 'Inter',
        data: await readFile(path.join(dir, `inter-latin-${weight}-normal.woff`)),
        weight,
        style: 'normal',
      }))
    )
  }
  return fontsPromise
}

// Restituisce il PNG della slide (per l'anteprima nello studio).
export async function renderSlidePng(template, params) {
  const tpl = TEMPLATES[template]
  if (!tpl) throw new Error(`Template sconosciuto: ${template}`)
  const data = tpl.data ? await loadTemplateData(tpl.data, params) : null
  const [fonts] = await Promise.all([loadFonts(), loadLogos()])
  const res = new ImageResponse(renderTemplate(template, params, data), {
    width: SLIDE_W, height: SLIDE_H, fonts,
  })
  return Buffer.from(await res.arrayBuffer())
}

// Instagram accetta solo JPEG per le immagini: convertiamo il PNG.
export async function renderSlideJpeg(template, params) {
  const png = await renderSlidePng(template, params)
  return sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
}
