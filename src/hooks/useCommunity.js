import { useInfiniteQuery } from '@tanstack/react-query'
import { getCommunityFeed, getCommunityFeedByUser } from '../firebase/firestore'

const PAGE_SIZE = 20

/**
 * useCommunity — infinite scroll hook for community picks feed.
 *
 * @param {'all' | 'mine'} filter - 'all' for global feed, 'mine' for current user's picks
 * @param {string|null} userId - required when filter === 'mine'
 * @returns react-query infinite query result + flat `posts` array
 */
export function useCommunity(filter = 'all', userId = null) {
  const query = useInfiniteQuery({
    queryKey: ['community', filter, userId],
    queryFn: async ({ pageParam = null }) => {
      if (filter === 'mine' && userId) {
        return getCommunityFeedByUser(userId, PAGE_SIZE, pageParam)
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
