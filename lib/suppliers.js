import { createClient } from '@/lib/supabase/client'

// Partita IVA italiana: 11 cifre con cifra di controllo (algoritmo Luhn modificato)
export function isValidVat(v) {
  const s = String(v || '').replace(/\s+/g, '')
  if (!/^\d{11}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 10; i++) {
    let n = Number(s[i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return (10 - (sum % 10)) % 10 === Number(s[10])
}

export async function getMySupplier(userId) {
  if (!userId) return null
  const { data } = await createClient().from('suppliers').select('*').eq('id', userId).maybeSingle()
  return data
}

export async function saveMySupplier(userId, values, exists) {
  const supabase = createClient()
  const row = {
    company_name: values.company_name.trim(),
    vat_number: values.vat_number ? values.vat_number.replace(/\s+/g, '') : null,
    categories: values.categories,
    zones: values.zones,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    description: values.description?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = exists
    ? await supabase.from('suppliers').update(row).eq('id', userId)
    : await supabase.from('suppliers').insert({ id: userId, ...row })
  if (error) { console.error('[suppliers] save failed', error); return { error: 'Non riesco a salvare il profilo. Riprova.' } }
  // l'account diventa Recofixer se non è già usato come residente o amministratore
  await supabase.rpc('become_supplier_role')
  return { error: null }
}

export const INVITE_URL = (token) => `${typeof window !== 'undefined' ? window.location.origin : 'https://www.condoreco.com'}/fornitori/invito/${token}`
