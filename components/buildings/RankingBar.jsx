// Barra di ranking generale in cima alla pagina edificio: "Meglio del X% dei
// condomini simili" + posizione su una scala Meglio(0)→Peggio(100). Il
// percentile arriva già calcolato da lib/percentile.js (null se il cohort di
// edifici comparabili è troppo piccolo) — qui non si inventa mai un numero.
export default function RankingBar({ percentile, sampleSize }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Posizionamento del condominio
      </div>

      {percentile == null ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>
            Dati insufficienti per il confronto
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
            Servono più condomini comparabili (stessa città/quartiere) per calcolare un percentile affidabile.
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal-dk)', letterSpacing: '-0.5px', marginBottom: 2 }}>
            Meglio del {percentile}% dei condomini simili
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 18px' }}>
            Basato su recensioni, manutenzione, costi e vicinato — confronto su {sampleSize} condomini simili.
          </p>

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textAlign: 'center', marginBottom: 6 }}>
            {percentile}° percentile
          </div>
          <div style={{ position: 'relative', height: 10, borderRadius: 100, background: 'linear-gradient(90deg, #0D676F 0%, #4CAF8C 25%, #D9C441 50%, #E8651A 75%, #DC2626 100%)' }}>
            <div style={{
              position: 'absolute', top: -5, left: `${percentile}%`, transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              border: '3px solid var(--text-2)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-4)' }}>
            <span>Meglio<br />0° percentile</span>
            <span style={{ textAlign: 'right' }}>Peggio<br />100° percentile</span>
          </div>
        </>
      )}
    </div>
  )
}
