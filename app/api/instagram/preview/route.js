import { requireAdmin, json } from '@/lib/instagram/auth'
import { renderSlidePng } from '@/lib/instagram/render'

export const runtime = 'nodejs'

// GET /api/instagram/preview?template=cover&p={"title":"..."}
export async function GET(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const sp = request.nextUrl.searchParams
  let params = {}
  try { params = JSON.parse(sp.get('p') || '{}') } catch { return json({ error: 'Parametri non validi' }, 400) }
  try {
    const png = await renderSlidePng(sp.get('template'), params)
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
  } catch (e) {
    return json({ error: e.message }, 422)
  }
}
