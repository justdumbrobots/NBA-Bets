import { useInfiniteQuery } from '@tanstack/react-query'
import { getCommunityFeed, getCommunityFeedByUser, getCommunityFeedByDate } from '../firebase/firestore'
import { getTodayET } from './usePicks'

const PAGE_SIZE = 20

/**
 * useCommunity — infinite scroll hook for community picks feed.
 *
 * @param {'all' | 'today' | 'mine'} filter
 * @param {string|null} userId - required when filter === 'mine'
 * @returns react-query infinite query result + flat `posts` array
 */
export function useCommunity(filter = 'all', userId = null) {
  const todayStr = getTodayET()

  const query = useInfiniteQuery({
    queryKey: ['community', filter, userId, todayStr],
    queryFn: async ({ pageParam = null }) => {
      if (filter === 'mine' && userId) {
        return getCommunityFeedByUser(userId, PAGE_SIZE, pageParam)
      }
      if (filter === 'today') {
        return getCommunityFeedByDate(todayStr, PAGE_SIZE, pageParam)
      }
      return getCommunityFeed(PAGE_SIZE, pageParam)
    },
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: filter !== 'mine' || !!userId,
  })

  // Flatten all pages into a single posts array
  const posts = query.data?.pages.flatMap((page) => page.posts) ?? []

  return {
    posts,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  }
}
