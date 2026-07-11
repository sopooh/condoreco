'use client'

import dynamic from 'next/dynamic'

const ResultsMapInner = dynamic(() => import('./ResultsMapInner'), { ssr: false })

export default function ResultsMap(props) {
  return <ResultsMapInner {...props} />
}
