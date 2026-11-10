import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'

const BUCKET = 'condo-documents'
export const MAX_DOC_BYTES = 20 * 1024 * 1024

// Archivio documenti del condominio: elenco (RLS: condivisi + i propri
// riservati, tutti per gli admin), caricamento, apertura con link temporaneo.
export function useDocuments(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const { isCondoAdmin } = useCondoRole(buildingId)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!buildingId || !userId) return
    const { data, error } = await createClient()
      .from('condo_documents')
      .select('id, building_id, uploaded_by, category, title, doc_date, visibility, file_path, file_name, mime_type, size_bytes, created_at')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
    if (error) { console.error('[useDocuments] load failed', error); setError(error.message) }
    else { setDocs(data || []); setError(null) }
    setLoading(false)
  }, [buildingId, userId])

  useEffect(() => { load() }, [load])

  async function upload(file, { title, category, docDate, visibility }) {
    if (!file) return { error: 'Scegli un file.' }
    if (file.size > MAX_DOC_BYTES) return { error: 'Il file supera 20 MB.' }
    const supabase = createClient()
    const safe = file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80)
    const path = `${buildingId}/${crypto.randomUUID()}-${safe}`
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (up.error) {
      console.error('[useDocuments] upload failed', up.error)
      return { error: /mime|type/i.test(up.error.message) ? 'Formato non supportato: usa PDF, immagini, Word o Excel.' : 'Caricamento non riuscito. Riprova.' }
    }
    const { error } = await supabase.from('condo_documents').insert({
      building_id: buildingId, uploaded_by: userId, category, title: title.trim(),
      doc_date: docDate || null, visibility, file_path: path, file_name: file.name,
      mime_type: file.type || null, size_bytes: file.size,
    })
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      console.error('[useDocuments] insert failed', error)
      return { error: 'Non riesco a salvare il documento. Riprova.' }
    }
    await load()
    return { error: null }
  }

  async function remove(doc) {
    const supabase = createClient()
    const { data, error } = await supabase.from('condo_documents').delete().eq('id', doc.id).select('id')
    if (error || !data?.length) return { error: 'Non puoi eliminare questo documento.' }
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    setDocs((xs) => xs.filter((d) => d.id !== doc.id))
    return { error: null }
  }

  async function setVisibility(doc, visibility) {
    const { data, error } = await createClient().from('condo_documents').update({ visibility }).eq('id', doc.id).select('id')
    if (error || !data?.length) return { error: 'Non puoi modificare questo documento.' }
    await load()
    return { error: null }
  }

  // link temporaneo (5 minuti); download=true forza lo scaricamento col nome originale
  async function fileUrl(doc, download = false) {
    const { data, error } = await createClient().storage.from(BUCKET)
      .createSignedUrl(doc.file_path, 300, download ? { download: doc.file_name } : undefined)
    if (error) return null
    return data.signedUrl
  }

  const canManage = (doc) => doc.uploaded_by === userId || isCondoAdmin
  return { docs, loading, error, userId, isCondoAdmin, upload, remove, setVisibility, fileUrl, canManage, reload: load }
}
