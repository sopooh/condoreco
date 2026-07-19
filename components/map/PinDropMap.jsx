'use client'

import dynamic from 'next/dynamic'

const PinDropMapInner = dynamic(() => import('./PinDropMapInner'), { ssr: false })

export default function PinDropMap({ lat, lng, city, onChange, height = 300 }) {
  return <PinDropMapInner lat={lat} lng={lng} city={city} onChange={onChange} height={height} />
}
