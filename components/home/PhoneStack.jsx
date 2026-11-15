'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileText, Plus, SendHorizontal, Star } from 'lucide-react'

// Due telefoni con anteprime dell'app. Al passaggio del mouse (o quando la
// sezione entra nello schermo, su touch) si aprono a ventaglio come carte.
export default function PhoneStack() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`lp-phones${inView ? ' is-in' : ''}`} aria-hidden="true">
      <div className="lp-phone lp-phone-a">
        <div className="lp-screen">
          <div className="lp-ph-top"><ChevronLeft size={14} /><b>Via Solari 12</b></div>
          <div className="lp-ph-photo" />
          <div className="lp-ph-tabs"><span className="is-on">Panoramica</span><span>Domande</span><span>Recensioni</span></div>
          <div className="lp-ph-score"><Star size={16} fill="#F5A524" stroke="#F5A524" /><b>4,6</b><small>(24 recensioni)</small></div>
          {[['Gestione', 86], ['Manutenzione', 74], ['Spese', 68], ['Tranquillità', 80], ['Servizi', 72]].map(([l, v]) => (
            <div key={l} className="lp-ph-bar"><small>{l}</small><i><em style={{ width: `${v}%` }} /></i></div>
          ))}
        </div>
      </div>
      <div className="lp-phone lp-phone-b">
        <div className="lp-screen">
          <div className="lp-ph-top"><ChevronLeft size={14} /><span className="lp-ph-av" /><b>Via Solari 12<small>Condominio</small></b></div>
          <div className="lp-ph-tabs"><span className="is-on">Condominio</span><span>Amministratore</span><span>Fornitori</span></div>
          <div className="lp-ph-msg"><span className="lp-ph-dot" /><p>L&apos;intervento in cortile è confermato per martedì.<small>09:12</small></p></div>
          <div className="lp-ph-file"><FileText size={16} /><p><b>Convocazione assemblea.pdf</b><small>2,4 MB</small></p></div>
          <div className="lp-ph-msg is-me"><p>Perfetto, grazie!<small>09:24</small></p></div>
          <div className="lp-ph-input"><Plus size={14} /><span>Scrivi un messaggio…</span><SendHorizontal size={14} /></div>
        </div>
      </div>
    </div>
  )
}
