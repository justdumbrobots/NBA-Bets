import { format } from 'date-fns'
import { Calendar, RefreshCw, Zap } from 'lucide-react'
import { usePicks } from '../hooks/usePicks'
import GameCard from '../components/GameCard'

function GameCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-gray-700 rounded" />
        <div className="h-5 w-16 bg-gray-700 rounded-full" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-gray-700" />
          <div className="h-3 w-8 bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-8 bg-gray-700 rounded" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-gray-700" />
          <div className="h-3 w-8 bg-gray-700 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 bg-gray-700 rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 bg-gray-700 rounded-lg" />
              <div className="h-12 bg-gray-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const today = new Date()
  const { games, date, isLoading, isError, isEmpty, refetch } = usePicks(today)

  const dateFormatted = format(today, 'EEEE, MMMM d, yyyy')

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={18} className="text-orange-400" />
              <h1 className="text-2xl font-extrabold text-white">Today's Picks</h1>
            </div>
            <p className="text-sm text-gray-400">{dateFormatted}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <button
                onClick={() => refetch()}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full border border-orange-400/20">
              <Zap size={12} />
              <span className="font-semibold">AI-Powered</span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-400 text-sm font-medium">Failed to load picks. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && !isError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
              <Zap size={32} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Generating Today's Picks</h2>
            <p className="text-gray-400 text-sm max-w-md">
              Today's AI-powered picks are being generated. Check back after 8 AM ET — our model analyzes
              injury reports, recent form, and betting lines to find the best edges.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Check Again
            </button>
          </div>
        )}

        {/* Games grid */}
        {!isLoading && games.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              {games.length} game{games.length !== 1 ? 's' : ''} today
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-600 text-center mt-12 max-w-2xl mx-auto">
          Picks are generated by AI for entertainment purposes only. Always gamble responsibly.
          This is not financial advice.
        </p>
      </div>
    </div>
  )
}
