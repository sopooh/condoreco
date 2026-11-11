import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'intervention-files'
export const FILE_KINDS = { quote: 'Preventivo', invoice: 'Fattura', photo: 'Foto del lavoro' }

// Preventivi, fatture e foto di un intervento (residente che l'ha chiesto,
// amministratore del condominio e fornitore scelto)
export function useInterventionFiles(interventionId) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!interventionId) return
    const { data } = await createClient().from('condo_intervention_files')
      .select('id, kind, amount_cents, file_path, file_name, mime_type, uploaded_by, created_at')
      .eq('intervention_id', interventionId).order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }, [interventionId])

  useEffect(() => { load() }, [load])

  async function upload(file, kind, amountEuro) {
    if (!file) return { error: 'Scegli un file.' }
    if (file.size > 20 * 1024 * 1024) return { error: 'Il file supera 20 MB.' }
    const supabase = createClient()
    const safe = file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80)
    const path = `${interventionId}/${crypto.randomUUID()}-${safe}`
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
    if (up.error) return { error: /mime|type/i.test(up.error.message) ? 'Formato non supportato: usa PDF o foto.' : 'Caricamento non riuscito. Riprova.' }
    const cents = amountEuro ? Math.round(Number(String(amountEuro).replace(/\./g, '').replace(',', '.')) * 100) : null
    const { error } = await supabase.from('condo_intervention_files').insert({
      intervention_id: interventionId, kind, file_path: path, file_name: file.name, mime_type: file.type || null,
      amount_cents: Number.isFinite(cents) ? cents : null,
    })
    if (error) { await supabase.storage.from(BUCKET).remove([path]); return { error: 'Non riesco a salvare il file. Riprova.' } }
    await load()
    return { error: null }
  }

  async function open(f, download = false) {
    const { data } = await createClient().storage.from(BUCKET).createSignedUrl(f.file_path, 300, download ? { download: f.file_name } : undefined)
    return data?.signedUrl || null
  }

  async function remove(f) {
    const supabase = createClient()
    const { data } = await supabase.from('condo_intervention_files').delete().eq('id', f.id).select('id')
    if (data?.length) await supabase.storage.from(BUCKET).remove([f.file_path])
    await load()
  }

  return { files, loading, upload, open, remove, reload: load }
}

export const euro = (cents) => (cents == null ? '' : (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }))
