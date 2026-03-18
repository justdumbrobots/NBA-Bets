import { useState, useEffect, useCallback } from 'react'
import { subscribeToVoteCounts, submitVote, getUserVote } from '../firebase/firestore'
import { useAuth } from './useAuth'

/**
 * useVotes — real-time vote counts + current user's vote for a game.
 *
 * @param {string} gameId
 * @returns {Object} { voteCounts, userVotes, castVote, isVoting }
 */
export function useVotes(gameId) {
  const { user, isAuthenticated } = useAuth()
  const [voteCounts, setVoteCounts] = useState({ spread: {}, moneyline: {}, overunder: {} })
  const [userVotes, setUserVotes] = useState({ spread: null, moneyline: null, overunder: null })
  const [isVoting, setIsVoting] = useState(false)

  // Subscribe to real-time vote aggregate counts
  useEffect(() => {
    if (!gameId) return
    const unsubscribe = subscribeToVoteCounts(gameId, (counts) => {
      setVoteCounts(counts)
    })
    return unsubscribe
  }, [gameId])

  // Load the user's existing votes when they log in
  useEffect(() => {
    if (!gameId || !user) {
      setUserVotes({ spread: null, moneyline: null, overunder: null })
      return
    }
    const betTypes = ['spread', 'moneyline', 'overunder']
    Promise.all(betTypes.map((bt) => getUserVote(gameId, bt, user.uid))).then(([s, m, o]) => {
      setUserVotes({ spread: s, moneyline: m, overunder: o })
    })
  }, [gameId, user])

  /**
   * Cast or toggle a vote.
   * @param {string} betType - 'spread' | 'moneyline' | 'overunder'
   * @param {string} side - the side label being voted on
   */
  const castVote = useCallback(
    async (betType, side) => {
      if (!isAuthenticated || !user || isVoting) return
      setIsVoting(true)

      // Optimistic update
      const prevVote = userVotes[betType]
      const isSameSide = prevVote === side

      setUserVotes((prev) => ({ ...prev, [betType]: isSameSide ? null : side }))

      try {
        await submitVote(gameId, betType, side, user.uid)
      } catch (err) {
        // Rollback optimistic update on error
        setUserVotes((prev) => ({ ...prev, [betType]: prevVote }))
        console.error('Failed to submit vote:', err)
      } finally {
        setIsVoting(false)
      }
    },
    [gameId, user, isAuthenticated, isVoting, userVotes]
  )

  /**
   * Compute total votes for a betType.
   * @param {string} betType
   * @returns {number}
   */
  const getTotalVotes = useCallback(
    (betType) => {
      const counts = voteCounts[betType] || {}
      return Object.values(counts)
        .filter((v) => typeof v === 'number')
        .reduce((sum, v) => sum + v, 0)
    },
    [voteCounts]
  )

  /**
   * Get vote percentage for a specific side.
   * @param {string} betType
   * @param {string} side
   * @returns {number} 0–100
   */
  const getVotePercent = useCallback(
    (betType, side) => {
      const total = getTotalVotes(betType)
      if (total === 0) return 50
      const count = voteCounts[betType]?.[side] || 0
      return Math.round((count / total) * 100)
    },
    [voteCounts, getTotalVotes]
  )

  return {
    voteCounts,
    userVotes,
    castVote,
    isVoting,
    getTotalVotes,
    getVotePercent,
  }
}
