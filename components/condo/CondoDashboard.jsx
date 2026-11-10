'use client'

import { useCondoChat } from '@/hooks/useCondoChat'
import { usePolls } from '@/hooks/usePolls'
import { useTickets } from '@/hooks/useTickets'
import { useCondoRole } from '@/hooks/useCondoRole'
import CondoPrivateHeader from '@/components/condo/CondoPrivateHeader'
import TicketBoardCard from '@/components/condo/TicketBoardCard'
import PollsCard from '@/components/condo/PollsCard'
import ChatPreviewCard from '@/components/condo/ChatPreviewCard'

export default function CondoDashboard({ building }) {
  const buildingId = building.id
  const { isCondoAdmin } = useCondoRole(buildingId)
  const { tickets, loading: ticketsLoading, userId, openTicket, setTicketOpen } = useTickets(buildingId)
  const { polls, loading: pollsLoading, castVote } = usePolls(buildingId)
  const { messages, loading: chatLoading, sendMessage, hideMessage } = useCondoChat(buildingId)

  return (
    <div className="wrap condo-private-wrap">
      <CondoPrivateHeader building={building} />

      {ticketsLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento bacheca...</p>
      ) : (
        <TicketBoardCard
          tickets={tickets}
          userId={userId}
          isCondoAdmin={isCondoAdmin}
          onOpenTicket={openTicket}
          onSetOpen={setTicketOpen}
          calendarHref={`/edificio/${buildingId}/condominio/calendario`}
        />
      )}

      {pollsLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento decisioni...</p>
      ) : (
        <PollsCard buildingId={buildingId} polls={polls} onVote={castVote} />
      )}

      {chatLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento chat...</p>
      ) : (
        <ChatPreviewCard messages={messages} isCondoAdmin={isCondoAdmin} onSend={sendMessage} onHide={hideMessage} />
      )}
    </div>
  )
}
