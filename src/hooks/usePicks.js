import { useQuery } from '@tanstack/react-query'
import { getTodaysPicks, getPicksSummariesForDates } from '../firebase/firestore'

// Auto-refresh every 5 minutes to pick up the 3x-daily Cloud Function updates
const REFETCH_INTERVAL = 5 * 60 * 1000

/**
 * Returns the ET date string (yyyy-MM-dd) for a given Date.
 */
export function toETDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function getTodayET() {
  return toETDateStr(new Date())
}

export function getTomorrowET() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toETDateStr(d)
}

// The three daily update times (ET, 24h)
export const UPDATE_HOURS_ET = [8, 12, 18]

/**
 * Returns a human-readable label for the next scheduled picks update.
 */
export function getNextUpdateLabel() {
  const nowET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const etDate = new Date(nowET)
  const decimalHour = etDate.getHours() + etDate.getMinutes() / 60

  const next = UPDATE_HOURS_ET.find((h) => h > decimalHour)
  if (next !== undefined) {
    if (next === 12) return '12:00 PM ET'
    return next > 12 ? `${next - 12}:00 PM ET` : `${next}:00 AM ET`
  }
  return '8:00 AM ET tomorrow'
}

/**
 * usePicks — fetch AI-generated picks from Firestore for a given date string.
 * Auto-refreshes every 5 minutes to pick up Cloud Function updates.
 *
 * @param {string} dateStr - yyyy-MM-dd (defaults to today ET)
 */
export function usePicks(dateStr) {
  const date = dateStr || getTodayET()

  const query = useQuery({
    queryKey: ['picks', date],
    queryFn: () => getTodaysPicks(date),
    staleTime: REFETCH_INTERVAL,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: REFETCH_INTERVAL,
  })

  const picks = query.data || null
  const games = picks?.games || []

  return {
    picks,
    games,
    date,
    generatedAt: picks?.generatedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && games.length === 0,
  }
}

/**
 * usePicksCalendar — fetch picks summaries for a range of dates (for the calendar strip).
 * Covers the past N days + today + tomorrow.
 *
 * @param {number} pastDays
 */
export function usePicksCalendar(pastDays = 14) {
  const today = new Date()
  const dateStrings = []
  for (let i = pastDays; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dateStrings.push(toETDateStr(d))
  }
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  dateStrings.push(toETDateStr(tomorrow))

  const query = useQuery({
    queryKey: ['picksCalendar', dateStrings[0], dateStrings[dateStrings.length - 1]],
    queryFn: () => getPicksSummariesForDates(dateStrings),
    staleTime: REFETCH_INTERVAL,
    gcTime: 60 * 60 * 1000,
    refetchInterval: REFETCH_INTERVAL,
  })

  return {
    summaries: query.data || {},
    dateStrings,
    isLoading: query.isLoading,
  }
}
