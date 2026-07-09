'use client'

import dynamic from 'next/dynamic'

const BuildingMapInner = dynamic(() => import('./BuildingMapInner'), { ssr: false })

export default function BuildingMap({ lat, lng, monthlyFee, height = 220 }) {
  return <BuildingMapInner lat={lat} lng={lng} monthlyFee={monthlyFee} height={height} />
}
