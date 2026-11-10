import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Poll del condominio: lista con conteggi calcolati client-side,
// creazione (aperta a tutti i membri) e voto (uno per utente,
// garantito dalla primary key su poll_votes).
export function usePolls(buildingId) {
  const [polls, setPolls] = useState([])
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPolls = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('polls')
      .select(`
        id, question, min_votes, closes_at, status, rejection_reason, created_at, created_by,
        profiles:created_by(display_name),
        poll_votes(user_id, vote)
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[usePolls] load failed', error)
      setError(error.message)
    } else {
      setPolls(
        data.map((p) => {
          const total = p.poll_votes.length
          const yes = p.poll_votes.filter((v) => v.vote).length
          const myVote = p.poll_votes.find((v) => v.user_id === userId)
          return {
            ...p,
            totalVotes: total,
            yesVotes: yes,
            noVotes: total - yes,
            yesPct: total ? Math.round((yes / total) * 100) : 0,
            // complemento, non arrotondamento separato: altrimenti 37.5/62.5 -> 38% + 63%
            noPct: total ? 100 - Math.round((yes / total) * 100) : 0,
            hasVoted: !!myVote,
            // voti di altri residenti: dopo il primo, il testo non e' piu' modificabile
            othersVoted: p.poll_votes.some((v) => v.user_id !== userId),
            isMine: !!userId && p.created_by === userId,
            myVote: myVote?.vote ?? null,
            isOpen: p.status === 'open' && new Date(p.closes_at) > new Date(),
          }
        })
      )
    }
    setLoading(false)
  }, [buildingId, userId])

  useEffect(() => {
    if (buildingId) loadPolls()
  }, [buildingId, loadPolls])

  // Creazione: aperta a tutti i membri. durationDays definisce closes_at.
  const createPoll = useCallback(
    async ({ question, minVotes = 10, durationDays = 7 }) => {
      if (!userId) return { error: 'Devi essere autenticato' }

      const closesAt = new Date()
      closesAt.setDate(closesAt.getDate() + durationDays)

      const supabase = createClient()
      const { error } = await supabase.from('polls').insert({
        building_id: buildingId,
        created_by: userId,
        question: question.trim(),
        min_votes: minVotes,
        closes_at: closesAt.toISOString(),
      })

      if (!error) await loadPolls()
      return { error: error?.message ?? null }
    },
    [buildingId, userId, loadPolls]
  )

  // vote: true = favorevole, false = contrario
  const castVote = useCallback(
    async (pollId, vote) => {
      if (!userId) return { error: 'Devi essere autenticato' }

      const supabase = createClient()
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        user_id: userId,
        vote,
      })

      // 23505 = voto duplicato (primary key poll_id + user_id)
      if (error?.code === '23505') {
        return { error: "Hai gia' votato su questo sondaggio" }
      }
      if (!error) await loadPolls()
      return { error: error?.message ?? null }
    },
    [userId, loadPolls]
  )

  // Modifica (solo autore, solo se aperta: RLS + trigger lato DB).
  // .select(): se la RLS blocca, Supabase restituisce 0 righe senza errore.
  const updatePoll = useCallback(
    async (pollId, { question, minVotes, closesAt }) => {
      const supabase = createClient()
      const patch = {}
      if (question !== undefined) patch.question = question.trim()
      if (minVotes !== undefined) patch.min_votes = minVotes
      if (closesAt !== undefined) patch.closes_at = closesAt
      const { data, error } = await supabase.from('polls').update(patch).eq('id', pollId).select('id')
      if (error) {
        console.error('[usePolls] update failed', error)
        return { error: error.message }
      }
      if (!data?.length) return { error: 'Non puoi modificare questa decisione' }
      await loadPolls()
      return { error: null }
    },
    [loadPolls]
  )

  // Eliminazione: autore o admin del condominio (funzione delete_poll)
  const deletePoll = useCallback(async (pollId) => {
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_poll', { p_poll_id: pollId })
    if (error) {
      console.error('[usePolls] delete failed', error)
      return { error: error.message }
    }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  return { polls, loading, error, userId, createPoll, castVote, updatePoll, deletePoll, reload: loadPolls }
}
