import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { uploadPollImage } from '@/lib/pollImages'

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
    // Conteggi da poll_tallies (funziona anche per le decisioni anonime, dove
    // la RLS mostra a ciascuno solo il proprio voto). Nomi dei votanti solo
    // per le decisioni palesi.
    const [{ data, error }, { data: tallies }, { data: votes }, { data: options }, { data: optTallies }, { data: optVotes }] = await Promise.all([
      supabase
        .from('polls')
        .select('id, building_id, question, min_votes, closes_at, status, rejection_reason, created_at, created_by, is_anonymous, phase2_status, phase2_question, phase2_days, phase2_opens_at, phase2_closes_at, phase2_winner, profiles:created_by(display_name)')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false }),
      supabase.rpc('poll_tallies', { p_building: buildingId }),
      supabase.from('poll_votes').select('poll_id, user_id, vote, changed_count, polls!inner(building_id)').eq('polls.building_id', buildingId),
      // fase 2: proposte, conteggi e voti (i propri sempre, gli altri se il voto è palese)
      supabase.from('poll_options').select('id, poll_id, title, description, image_path, position, created_at, polls!inner(building_id)').eq('polls.building_id', buildingId).order('position').order('created_at'),
      supabase.rpc('poll_option_tallies', { p_building: buildingId }),
      supabase.from('poll_option_votes').select('poll_id, user_id, option_id, changed_count, polls!inner(building_id)').eq('polls.building_id', buildingId),
    ])

    if (error) {
      console.error('[usePolls] load failed', error)
      setError(error.message)
    } else {
      const tally = Object.fromEntries((tallies || []).map((t) => [t.poll_id, t]))
      const votesBy = {}
      ;(votes || []).forEach((v) => { (votesBy[v.poll_id] ??= []).push(v) })
      const optCount = Object.fromEntries((optTallies || []).map((t) => [t.option_id, t.votes]))
      const optsBy = {}
      ;(options || []).forEach((o) => { (optsBy[o.poll_id] ??= []).push(o) })
      const optVotesBy = {}
      ;(optVotes || []).forEach((v) => { (optVotesBy[v.poll_id] ??= []).push(v) })
      setPolls(
        data.map((p) => {
          const t = tally[p.id] || { yes_votes: 0, total_votes: 0, others_voted: false }
          const total = t.total_votes
          const yes = t.yes_votes
          const pv = votesBy[p.id] || []
          const myVote = pv.find((v) => v.user_id === userId)
          return {
            ...p,
            totalVotes: total,
            yesVotes: yes,
            noVotes: total - yes,
            yesPct: total ? Math.round((yes / total) * 100) : 0,
            // complemento, non arrotondamento separato: altrimenti 37.5/62.5 -> 38% + 63%
            noPct: total ? 100 - Math.round((yes / total) * 100) : 0,
            hasVoted: !!myVote,
            // voti di altri residenti: dopo il primo, testo e anonimato non sono piu' modificabili
            othersVoted: t.others_voted,
            isMine: !!userId && p.created_by === userId,
            myVote: myVote?.vote ?? null,
            canChangeVote: !!myVote && (myVote.changed_count ?? 0) < 1,
            voters: p.is_anonymous ? [] : pv.map((v) => ({ userId: v.user_id, vote: v.vote })),
            isOpen: p.status === 'open' && new Date(p.closes_at) > new Date(),
            ...phase2Of(p, optsBy[p.id] || [], optCount, optVotesBy[p.id] || [], userId),
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
    async ({ question, minVotes = 10, durationDays = 7, isAnonymous = false }) => {
      if (!userId) return { error: 'Devi essere autenticato' }

      const closesAt = new Date()
      closesAt.setDate(closesAt.getDate() + durationDays)

      const supabase = createClient()
      const { data, error } = await supabase.from('polls').insert({
        building_id: buildingId,
        created_by: userId,
        question: question.trim(),
        min_votes: minVotes,
        closes_at: closesAt.toISOString(),
        is_anonymous: !!isAnonymous,
      }).select('id').single()

      if (!error) await loadPolls()
      return { error: error?.message ?? null, id: data?.id ?? null }
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

  // Cambio voto: una sola volta, a decisione aperta (funzione change_poll_vote)
  const changeVote = useCallback(async (pollId, vote) => {
    const { error } = await createClient().rpc('change_poll_vote', { p_poll_id: pollId, p_vote: vote })
    if (error) return { error: /già cambiato/.test(error.message) ? 'Hai già cambiato il voto una volta.' : 'Non riesco a cambiare il voto. Riprova.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  // Modifica (solo autore, solo se aperta: RLS + trigger lato DB).
  // .select(): se la RLS blocca, Supabase restituisce 0 righe senza errore.
  const updatePoll = useCallback(
    async (pollId, { question, minVotes, closesAt, isAnonymous }) => {
      const supabase = createClient()
      const patch = {}
      if (question !== undefined) patch.question = question.trim()
      if (minVotes !== undefined) patch.min_votes = minVotes
      if (closesAt !== undefined) patch.closes_at = closesAt
      if (isAnonymous !== undefined) patch.is_anonymous = !!isAnonymous
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

  // ── Fase 2 ──
  const setPhase2 = useCallback(async (pollId, { enabled = true, question = null, days = 7, closesAt = null }) => {
    const { error } = await createClient().rpc('set_poll_phase2', { p_poll: pollId, p_enabled: enabled, p_question: question, p_days: days, p_closes_at: closesAt })
    if (error) return { error: error.message.includes('votato') ? 'Qualcuno ha già votato nella fase 2: si può solo prolungare.' : 'Non riesco a salvare la fase 2. Riprova.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  const openPhase2 = useCallback(async (pollId) => {
    const { data, error } = await createClient().rpc('open_poll_phase2', { p_poll: pollId })
    if (error || !data) return { error: 'Servono almeno 2 proposte e la decisione approvata.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  const saveOption = useCallback(async (poll, { id, title, description, file, removeImage }) => {
    const supabase = createClient()
    let image_path
    if (file) {
      const up = await uploadPollImage({ buildingId: poll.building_id, pollId: poll.id, file })
      if (up.error) return up
      image_path = up.path
    } else if (removeImage) image_path = null
    const row = { title: title.trim(), description: description?.trim() || null, ...(image_path !== undefined ? { image_path } : {}) }
    const { error } = id
      ? await supabase.from('poll_options').update(row).eq('id', id)
      : await supabase.from('poll_options').insert({ ...row, poll_id: poll.id, position: (poll.options?.length || 0) })
    if (error) return { error: 'Proposta non salvata: dopo il primo voto della fase 2 non si può più modificare.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  const deleteOption = useCallback(async (optionId) => {
    const { error } = await createClient().from('poll_options').delete().eq('id', optionId)
    if (error) return { error: 'Non riesco a togliere la proposta.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls])

  const voteOption = useCallback(async (poll, optionId) => {
    const supabase = createClient()
    const { error } = poll.myOption
      ? await supabase.rpc('change_option_vote', { p_poll: poll.id, p_option: optionId })
      : await supabase.from('poll_option_votes').insert({ poll_id: poll.id, user_id: userId, option_id: optionId })
    if (error) return { error: /cambiato/.test(error.message) ? 'Hai già cambiato il voto una volta.' : 'Voto non registrato. Riprova.' }
    await loadPolls()
    return { error: null }
  }, [loadPolls, userId])

  return { polls, loading, error, userId, createPoll, castVote, changeVote, updatePoll, deletePoll, reload: loadPolls, setPhase2, openPhase2, saveOption, deleteOption, voteOption }
}

// Dati della fase 2 di una decisione, già pronti per l'interfaccia
function phase2Of(p, opts, counts, votes, userId) {
  const total = opts.reduce((n, o) => n + (counts[o.id] || 0), 0)
  const mine = votes.find((v) => v.user_id === userId)
  return {
    options: opts.map((o) => {
      const n = counts[o.id] || 0
      return { ...o, votes: n, pct: total ? Math.round((n / total) * 100) : 0, voters: p.is_anonymous ? [] : votes.filter((v) => v.option_id === o.id).map((v) => v.user_id) }
    }),
    phase2Total: total,
    myOption: mine?.option_id ?? null,
    canChangeOption: !!mine && (mine.changed_count ?? 0) < 1,
    phase2Open: p.phase2_status === 'open' && new Date(p.phase2_closes_at) > new Date(),
  }
}
