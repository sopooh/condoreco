// Testata delle liste (Esplora, Amministratori, Fornitori): icona, titolo,
// sottotitolo, ricerca e controlli.
export default function PageHero({ icon, title, subtitle, children, accent = '#0D676F' }) {
  return (
    <header className="dir-hero">
      <div className="dir-hero-inner">
        <div className="dir-hero-title">
          <span className="dir-hero-icon" style={{ color: accent }}>{icon}</span>
          <h1>{title}</h1>
        </div>
        {subtitle && <p className="dir-hero-sub">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
