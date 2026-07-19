'use client'

import { useCondoChat } from '@/hooks/useCondoChat'
import { usePolls } from '@/hooks/usePolls'
import { useEvents } from '@/hooks/useEvents'
import { useCondoRole } from '@/hooks/useCondoRole'
import CondoPrivateHeader from '@/components/condo/CondoPrivateHeader'
import UrgentNoticesCard from '@/components/condo/UrgentNoticesCard'
import PollsCard from '@/components/condo/PollsCard'
import ChatPreviewCard from '@/components/condo/ChatPreviewCard'

export default function CondoDashboard({ building }) {
  const buildingId = building.id
  const { isCondoAdmin } = useCondoRole(buildingId)
  const { events, loading: eventsLoading, approveEvent } = useEvents(buildingId)
  const { polls, loading: pollsLoading, createPoll, castVote } = usePolls(buildingId)
  const { messages, loading: chatLoading, sendMessage, hideMessage } = useCondoChat(buildingId)

  return (
    <div className="wrap condo-private-wrap">
      <CondoPrivateHeader building={building} />

      {eventsLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento bacheca...</p>
      ) : (
        <UrgentNoticesCard
          events={events}
          isCondoAdmin={isCondoAdmin}
          onApprove={approveEvent}
          viewAllHref={`/edificio/${buildingId}/condominio/calendario`}
        />
      )}

      {pollsLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento decisioni...</p>
      ) : (
        <PollsCard polls={polls} onVote={castVote} onCreate={createPoll} />
      )}

      {chatLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento chat...</p>
      ) : (
        <ChatPreviewCard messages={messages} isCondoAdmin={isCondoAdmin} onSend={sendMessage} onHide={hideMessage} />
      )}
    </div>
  )
}
