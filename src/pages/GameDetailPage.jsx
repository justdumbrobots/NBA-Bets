import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import GameCard from '../components/GameCard'
import GameThread from '../components/GameThread'
import { format } from 'date-fns'

async function fetchGameById(gameId) {
  // Games are stored within the picks/{date} document's `games` array.
  // We need to find which date document contains this gameId.
  // Strategy: check today and the past 7 days.
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const snap = await getDoc(doc(db, 'picks', dateStr))
    if (snap.exists()) {
      const data = snap.data()
      const games = data.games || []
      const game = games.find((g) => g.id === gameId)
      if (game) return { game, date: dateStr }
    }
  }
  return null
}

function GameDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-64 bg-gray-800 rounded-xl border border-gray-700 animate-pulse" />
      <div className="h-96 bg-gray-800 rounded-xl border border-gray-700 animate-pulse" />
    </div>
  )
}

export default function GameDetailPage() {
  const { gameId } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGameById(gameId),
    staleTime: 5 * 60 * 1000,
    enabled: !!gameId,
  })

  const game = data?.game

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to Picks
        </Link>

        {isLoading && <GameDetailSkeleton />}

        {isError && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-8 text-center">
            <p className="text-red-400 font-medium">Failed to load game details.</p>
            <Link to="/" className="mt-3 inline-block text-sm text-red-400 hover:text-red-300 underline">
              Go back to picks
            </Link>
          </div>
        )}

        {!isLoading && !isError && !game && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-400 mb-2">Game not found</h2>
            <p className="text-sm text-gray-500 mb-4">
              This game may not be in our current picks window.
            </p>
            <Link to="/" className="text-sm text-orange-400 hover:text-orange-300 underline">
              View today's picks
            </Link>
          </div>
        )}

        {game && (
          <div className="space-y-5">
            {/* Game title */}
            <div>
              <h1 className="text-xl font-extrabold text-white">
                {game.awayTeam} @ {game.homeTeam}
              </h1>
              {data?.date && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(data.date + 'T12:00:00'), 'EEEE, MMMM d')}
                </p>
              )}
            </div>

            {/* Game Card */}
            <GameCard game={game} />

            {/* Game Thread */}
            <div>
              <h2 className="text-base font-bold text-white mb-3">Game Discussion</h2>
              <GameThread gameId={gameId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
