import { Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Leaderboard from '../components/Leaderboard'
import { useAuth } from '../hooks/useAuth'
import { getLeaderboard } from '../firebase/firestore'

export default function LeaderboardPage() {
  const { user, profile, isAuthenticated } = useAuth()

  // Find the current user's rank
  const { data: allUsers = [] } = useQuery({
    queryKey: ['leaderboard', 50],
    queryFn: () => getLeaderboard(50),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  })

  const userRank = isAuthenticated && user
    ? allUsers.findIndex((u) => u.id === user.uid)
    : -1

  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const pushes = profile?.pushes ?? 0
  const unitsWon = typeof profile?.unitsWon === 'number' ? profile.unitsWon.toFixed(1) : '0.0'
  const total = wins + losses + pushes
  const winRate = total > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={20} className="text-orange-400" />
          <h1 className="text-2xl font-extrabold text-white">Leaderboard</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8">Top bettors ranked by units won</p>

        {/* Current user's rank card */}
        {isAuthenticated && profile && userRank >= 0 && (
          <div className="bg-orange-400/10 border border-orange-400/30 rounded-xl p-4 mb-6">
            <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-3">Your Ranking</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-white">#{userRank + 1}</p>
                <p className="text-xs text-gray-400">Rank</p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-white">{wins}-{losses}</p>
                  <p className="text-xs text-gray-500">Record</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-white">{total > 0 ? `${winRate}%` : '—'}</p>
                  <p className="text-xs text-gray-500">Win Rate</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
                  <p className={`text-lg font-bold ${Number(unitsWon) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(unitsWon) >= 0 ? '+' : ''}{unitsWon}u
                  </p>
                  <p className="text-xs text-gray-500">Units</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && profile && userRank === -1 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-gray-400">
              Post picks and win to appear on the leaderboard!
            </p>
          </div>
        )}

        {!isAuthenticated && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-gray-400">Sign in to track your ranking</p>
          </div>
        )}

        {/* Leaderboard table */}
        <Leaderboard limit={50} />
      </div>
    </div>
  )
}
