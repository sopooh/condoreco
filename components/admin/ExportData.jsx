'use client'

import { useState } from 'react'
import { exportUsers, exportBuildings, exportReviews, exportReports, downloadCSV } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function ExportCard({ title, description, icon, onExport, busy }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <button
        onClick={onExport}
        disabled={busy}
        style={{
          padding: '10px 0', background: busy ? 'var(--border)' : 'var(--teal)',
          color: busy ? 'var(--text-3)' : '#fff',
          border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
          cursor: busy ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
        }}
      >
        {busy ? 'Preparazione...' : '⬇ Esporta CSV'}
      </button>
    </div>
  )
}

export default function ExportData() {
  const [busy, setBusy] = useState({})
  const [done, setDone] = useState('')
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  async function doExport(key, fn, filename) {
    setBusy(b => ({ ...b, [key]: true }))
    try {
      const data = await fn()
      if (data.length === 0) {
        setDone('Nessun dato da esportare.')
      } else {
        downloadCSV(data, filename)
        setDone(`${filename} scaricato (${data.length} righe)`)
      }
      setTimeout(() => setDone(''), 4000)
    } catch (e) {
      setDone('Errore durante l\'esportazione.')
    }
    setBusy(b => ({ ...b, [key]: false }))
  }

  const exports = [
    {
      key: 'users',
      title: 'Utenti',
      description: 'ID, nome, email, ruolo, stato, data iscrizione',
      icon: '👥',
      fn: exportUsers,
      filename: `condoreco_utenti_${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      key: 'buildings',
      title: 'Condomini',
      description: 'ID, indirizzo, città, stato, visite, data aggiunta',
      icon: '🏢',
      fn: exportBuildings,
      filename: `condoreco_condomini_${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      key: 'reviews',
      title: 'Recensioni',
      description: 'ID, edificio, utente, punteggio, testo, stato moderazione',
      icon: '⭐',
      fn: exportReviews,
      filename: `condoreco_recensioni_${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      key: 'reports',
      title: 'Segnalazioni',
      description: 'ID, tipo contenuto, motivo, stato, data',
      icon: '🚩',
      fn: exportReports,
      filename: `condoreco_segnalazioni_${new Date().toISOString().slice(0, 10)}.csv`,
    },
  ]

  return (
    <div style={{ padding: pad, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Esportazione dati</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Scarica i dati in formato CSV per analisi, report o pitch deck.
          I file includono tutti i dati aggiornati al momento del download.
        </p>
      </div>

      {done && (
        <div style={{ background: 'var(--green-bg)', color: 'var(--green-tx)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
          ✓ {done}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        {exports.map(e => (
          <ExportCard
            key={e.key}
            title={e.title}
            description={e.description}
            icon={e.icon}
            busy={!!busy[e.key]}
            onExport={() => doExport(e.key, e.fn, e.filename)}
          />
        ))}
      </div>

      {/* Esportazione completa */}
      <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '22px 24px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Esportazione completa</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          Scarica tutti i dataset in sequenza per preparare un report completo o un pitch deck.
        </p>
        <button
          onClick={async () => {
            for (const e of exports) {
              await doExport(e.key, e.fn, e.filename)
              await new Promise(r => setTimeout(r, 500))
            }
          }}
          disabled={Object.values(busy).some(Boolean)}
          style={{
            padding: '11px 24px', background: 'var(--teal)', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          ⬇ Scarica tutti i CSV
        </button>
      </div>

      {/* Note */}
      <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Note</div>
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            'I file CSV sono in formato UTF-8 con BOM (compatibile con Excel)',
            'I dati includono tutti i record visibili all\'admin, inclusi quelli non pubblici',
            'Non condividere questi file con personale non autorizzato',
            'Le password e i token di autenticazione non vengono mai esportati',
          ].map((note, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--text-3)' }}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
