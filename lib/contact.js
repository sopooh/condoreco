// Link di contatto diretto con un manutentore (telefono, WhatsApp, email)
// con un messaggio gia' pronto.

// numero in formato internazionale senza "+" per wa.me; numeri italiani
// scritti senza prefisso (3xx..., 0x...) ricevono il 39
export function waNumber(phone) {
  if (!phone) return null
  let d = phone.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) return d.slice(1)
  if (d.startsWith('00')) return d.slice(2)
  if (d.startsWith('3') || d.startsWith('0')) return '39' + d
  return d
}

export function contactMessage({ maintainer, intervention, senderName, address }) {
  const lines = [
    `Buongiorno${maintainer?.name ? ' ' + maintainer.name : ''},`,
    `sono ${senderName || 'un residente'}${address ? `, residente in ${address}` : ''}.`,
    `Vi contatto per: ${intervention.title}.`,
  ]
  if (intervention.location) lines.push(`Dove: ${intervention.location}.`)
  if (intervention.description) lines.push(intervention.description)
  lines.push('Quando potreste passare? Grazie.')
  return lines.join('\n')
}

export const telLink = (phone) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null)
export const waLink = (phone, text) => (phone ? `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}` : null)
export const mailLink = (email, subject, body) =>
  email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null
