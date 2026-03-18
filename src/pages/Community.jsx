import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Filter, Loader2, Users } from 'lucide-react'
import PickCard from '../components/PickCard'
import SubmitPickModal from '../components/SubmitPickModal'
import { useCommunity } from '../hooks/useCommunity'
import { useAuth } from '../hooks/useAuth'

const FILTER_TABS = [
  { id: 'all', label: 'All Picks' },
  { id: 'mine', label: 'My Picks' },
]

function PickCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex-shrink-0" />
          <div>
            <div className="h-3.5 w-24 bg-gray-700 rounded mb-1.5" />
            <div className="h-3 w-16 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-5 w-14 bg-gray-700 rounded" />
      </div>
      <div className="h-16 bg-gray-700 rounded-lg mb-3" />
      <div className="h-3 w-full bg-gray-700 rounded mb-1" />
      <div className="h-3 w-3/4 bg-gray-700 rounded mb-3" />
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="h-4 w-12 bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-700 rounded" />
        </div>
        <div className="h-3 w-20 bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export default function Community() {
  const { user, isAuthenticated } = useAuth()
  const [activeFilter, setActiveFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const loadMoreRef = useRef(null)

  const { posts, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useCommunity(
    activeFilter,
    activeFilter === 'mine' ? user?.uid : null
  )

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1, rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  const handleFilterChange = (filterId) => {
    if (filterId === 'mine' && !isAuthenticated) return
    setActiveFilter(filterId)
  }

  const handlePostSuccess = () => {
    refetch()
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-orange-400" />
              <h1 className="text-2xl font-extrabold text-white">Community</h1>
            </div>
            <p className="text-sm text-gray-400">Share picks and discuss with other bettors</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors duration-150 shadow-lg shadow-orange-500/20"
            >
              <Plus size={16} />
              Post Pick
            </button>
          )}
        </div>

        {/* Sign-in prompt */}
        {!isAuthenticated && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-400">Sign in to post picks and join the conversation.</p>
            <span className="text-xs text-orange-400 font-medium flex-shrink-0">Sign in ↑</span>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-5">
          <Filter size={14} className="text-gray-500 flex-shrink-0" />
          {FILTER_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleFilterChange(id)}
              disabled={id === 'mine' && !isAuthenticated}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === id
                  ? 'bg-orange-400/15 text-orange-400 border border-orange-400/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-transparent disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <PickCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
              <Users size={28} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-1">
              {activeFilter === 'mine' ? 'No picks posted yet' : 'No picks today'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {activeFilter === 'mine'
                ? "You haven't posted any picks yet. Share your first pick!"
                : 'Be the first to post a pick for today\'s games.'}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Plus size={14} />
                Post a Pick
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PickCard key={post.id} post={post} />
            ))}

            {/* Load more sentinel */}
            <div ref={loadMoreRef} className="py-2">
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="text-orange-400 animate-spin" />
                </div>
              )}
              {!hasNextPage && posts.length > 0 && (
                <p className="text-center text-xs text-gray-600 py-4">You've reached the end</p>
              )}
            </div>
          </div>
        )}
      </div>

      <SubmitPickModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handlePostSuccess}
      />
    </div>
  )
}
