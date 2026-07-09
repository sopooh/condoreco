import { useState, useEffect } from 'react'

// Valore iniziale FISSO (false) a prescindere dall'ambiente: durante
// l'idratazione il primo render lato client deve corrispondere esattamente
// all'HTML del server, che non conosce window.innerWidth. Leggere
// window.innerWidth nel lazy initializer di useState (com'era prima)
// produce un valore diverso tra server (sempre false) e client (vero se lo
// schermo è stretto) quando la finestra è già sotto il breakpoint al primo
// paint: hydration mismatch. Il valore reale viene applicato solo qui, in
// useEffect, cioè dopo che l'idratazione è già avvenuta.
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}
