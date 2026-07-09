import { createClient } from '@/lib/supabase/server'

export default async function TestDB() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('building_scores')
    .select('id, address, city, score, review_count')
    .limit(3)

  if (error) return <pre>Errore: {error.message}</pre>

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>Test connessione DB</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
