// Testata delle liste (Amministratori, Fornitori): icona, titolo, sottotitolo
// e onda decorativa in alto a destra, come nel menu.
export default function PageHero({ icon, title, subtitle, children, accent = '#0D676F' }) {
  return (
    <header className="dir-hero">
      <svg aria-hidden="true" className="dir-hero-wave" viewBox="0 0 420 120" preserveAspectRatio="none">
        <path d="M0 70C90 20 170 18 250 40s120 30 170-10V0H0z" fill="rgba(13,103,111,0.05)" />
        <path d="M60 64C140 22 220 20 300 38s90 20 120-6" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="10" strokeLinecap="round" />
        <path d="M120 52C190 26 250 26 320 36s70 10 100-8" fill="none" stroke={accent} strokeOpacity="0.32" strokeWidth="4" strokeLinecap="round" />
      </svg>
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
