// Le sezioni arrivano come prop dal genitore (app/admin/page.jsx), che è
// l'unica fonte di verità: nel progetto sorgente questo file duplicava un
// proprio SECTIONS a 8 voci, disallineato da quello a 9 voci della pagina
// (mancava "Foto" — irraggiungibile da desktop). L'email in fondo era
// hardcoded a un singolo admin: ora che il ruolo è basato su profiles.role
// e più account possono essere admin, arriva come prop dalla sessione reale.
export default function AdminSidebar({ sections, active, onSelect, adminEmail }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: 'var(--white)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-2)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Admin Dashboard
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>CondoReco</div>
      </div>

      <nav style={{ padding: '8px 0', flex: 1 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', border: 'none', borderRadius: 0, cursor: 'pointer',
              background: active === s.id ? 'var(--teal-lt)' : 'transparent',
              color: active === s.id ? 'var(--teal-dk)' : 'var(--text-2)',
              fontSize: 13, fontWeight: active === s.id ? 700 : 500,
              textAlign: 'left', transition: 'background 0.1s',
              borderLeft: active === s.id ? '3px solid var(--teal)' : '3px solid transparent',
            }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-2)', fontSize: 11, color: 'var(--text-4)' }}>
        {adminEmail}
      </div>
    </div>
  )
}
