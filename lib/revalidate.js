// Chiede al server di aggiornare subito le pagine pubbliche toccate da una
// moderazione (vedi app/api/revalidate). Non blocca mai l'azione dell'admin.
export async function revalidatePublic({ buildings = [], administrators = [] } = {}) {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildings: buildings.filter(Boolean), administrators: administrators.filter(Boolean) }),
    })
  } catch { /* la cache scade comunque entro un'ora */ }
}
