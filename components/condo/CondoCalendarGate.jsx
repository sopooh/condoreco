'use client'

import CondoMemberGate from '@/components/condo/CondoMemberGate'
import BoardPage from '@/components/condo/BoardPage'

export default function CondoCalendarGate({ building }) {
  return (
    <CondoMemberGate building={building}>
      <BoardPage buildingId={building.id} />
    </CondoMemberGate>
  )
}
