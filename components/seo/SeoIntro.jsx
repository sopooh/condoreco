// Blocco di testo indicizzabile in fondo alle pagine di elenco: dà a Google
// contenuto testuale reale anche quando i risultati cambiano.
export default function SeoIntro({ title, children }) {
  return (
    <section className="wrap" style={{ padding: '40px 40px 56px', maxWidth: 860 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </section>
  )
}
