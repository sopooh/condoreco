'use client'

import { Suspense } from 'react'
import CondoMemberGate from '@/components/condo/CondoMemberGate'
import PollsPage from '@/components/condo/PollsPage'
import PollDetail from '@/components/condo/PollDetail'

// Pagine "Decisioni" dietro lo stesso gate membri di dashboard e calendario.
// Suspense: PollsPage legge useSearchParams (?nuova=1).
export function CondoPollsGate({ building }) {
  return (
    <CondoMemberGate building={building}>
      <Suspense fallback={null}>
        <PollsPage building={building} />
      </Suspense>
    </CondoMemberGate>
  )
}

export function CondoPollDetailGate({ building, pollId }) {
  return (
    <CondoMemberGate building={building}>
      <PollDetail building={building} pollId={pollId} />
    </CondoMemberGate>
  )
}
