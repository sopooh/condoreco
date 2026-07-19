'use client'

import CondoMemberGate from '@/components/condo/CondoMemberGate'
import CondoDashboard from '@/components/condo/CondoDashboard'

export default function CondoDashboardGate({ building }) {
  return (
    <CondoMemberGate building={building}>
      <CondoDashboard building={building} />
    </CondoMemberGate>
  )
}
