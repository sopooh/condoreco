// Autocertificazione di residenza/domicilio (artt. 46-47 DPR 445/2000):
// testo fisso (non generato), compilato con i dati della persona, firma
// disegnata sullo schermo e copia del documento d'identita' nelle pagine
// successive. Tutto in un unico PDF, cosi' segue lo stesso percorso degli
// altri documenti (bucket residence-docs, controllo di Condor, cancellazione
// dopo la decisione).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const A4 = [595.28, 841.89]
const M = 56

function wrap(text, font, size, maxWidth) {
  const out = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) { out.push(line); line = word } else line = next
    }
    out.push(line)
  }
  return out
}

// Foto (anche HEIC su iPhone) -> JPEG ridotto, incorporabile nel PDF
export async function imageToJpegBytes(file, max = 2000) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
  return new Uint8Array(await blob.arrayBuffer())
}

export async function buildAutocertificazione({ nome, cognome, luogoNascita, dataNascita, indirizzo, comune, citta, piano, tenure, signaturePng, idImages }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle('Autocertificazione di residenza')
  pdf.setProducer('Condoreco')
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage(A4)
  const width = A4[0] - M * 2
  let y = A4[1] - M

  const draw = (text, { size = 11, f = font, gap = 6, center = false } = {}) => {
    for (const line of wrap(text, f, size, width)) {
      const x = center ? (A4[0] - f.widthOfTextAtSize(line, size)) / 2 : M
      page.drawText(line, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) })
      y -= size + 4
    }
    y -= gap
  }

  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const nascita = dataNascita ? new Date(dataNascita).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const titolo = tenure === 'owner' ? 'proprietario/a' : tenure === 'tenant' ? 'inquilino/a' : 'residente'

  draw('DICHIARAZIONE SOSTITUTIVA DI CERTIFICAZIONE E DI ATTO DI NOTORIETÀ', { size: 13, f: bold, center: true, gap: 2 })
  draw('(artt. 46 e 47 del D.P.R. 28 dicembre 2000, n. 445)', { size: 10, center: true, gap: 22 })
  draw(`Il/La sottoscritto/a ${nome} ${cognome}, nato/a a ${luogoNascita} il ${nascita},`)
  draw('consapevole delle sanzioni penali previste dall\'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci, formazione o uso di atti falsi, e della decadenza dai benefici prevista dall\'art. 75 del medesimo decreto,', { gap: 14 })
  draw('DICHIARA', { size: 12, f: bold, center: true, gap: 14 })
  draw(`di risiedere o comunque di abitare stabilmente nell'immobile sito in ${indirizzo}, ${comune}${piano ? `, piano ${piano}` : ''}, in qualità di ${titolo}.`, { gap: 14 })
  draw('Dichiara inoltre di essere informato/a, ai sensi del Regolamento (UE) 2016/679, che i dati personali contenuti in questa dichiarazione saranno trattati da Condoreco esclusivamente per verificare che abiti nel condominio, come descritto nell\'informativa privacy disponibile su condoreco.com, e che la dichiarazione sarà cancellata appena la richiesta di accesso sarà decisa.', { size: 10, gap: 14 })
  draw('Si allega copia di un documento d\'identità in corso di validità (art. 38 del D.P.R. 445/2000).', { size: 10, gap: 26 })
  draw(`Luogo e data: ${citta || comune}, ${oggi}`, { gap: 18 })
  draw('Firma del/della dichiarante', { size: 10, gap: 4 })

  const sig = await pdf.embedPng(signaturePng)
  const sw = Math.min(220, sig.width)
  const sh = sw * (sig.height / sig.width)
  page.drawImage(sig, { x: M, y: y - sh, width: sw, height: sh })

  for (const img of idImages) {
    const jpg = await pdf.embedJpg(await imageToJpegBytes(img))
    const p = pdf.addPage(A4)
    p.drawText('Copia del documento d\'identità', { x: M, y: A4[1] - M, size: 11, font: bold })
    const maxW = A4[0] - M * 2, maxH = A4[1] - M * 2 - 30
    const s = Math.min(maxW / jpg.width, maxH / jpg.height, 1)
    p.drawImage(jpg, { x: M, y: A4[1] - M - 24 - jpg.height * s, width: jpg.width * s, height: jpg.height * s })
  }

  const bytes = await pdf.save()
  return new File([bytes], 'Autocertificazione-residenza.pdf', { type: 'application/pdf' })
}
