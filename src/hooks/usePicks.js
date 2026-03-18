import { useQuery } from '@tanstack/react-query'
import { getTodaysPicks } from '../firebase/firestore'
import { format } from 'date-fns'

/**
 * usePicks — fetch today's AI-generated picks from Firestore.
 * Uses React Query for caching and background refetch.
 *
 * @param {Date} [date] - Date to fetch picks for. Defaults to today.
 * @returns {{ picks, games, date, isLoading, isError, error, refetch }}
 */
export function usePicks(date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd')

  const query = useQuery({
    queryKey: ['picks', dateStr],
    queryFn: () => getTodaysPicks(dateStr),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  })

  // Normalize: picks doc has a `games` array
  const picks = query.data || null
  const games = picks?.games || []

  return {
    picks,
    games,
    date: dateStr,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isEmpty: !query.isLoading && games.length === 0,
  }
}
