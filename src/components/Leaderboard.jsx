import { Trophy, Medal, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '../firebase/firestore'
import { useAuth } from '../hooks/useAuth'

const RANK_STYLES = {
  0: { icon: '🥇', bg: 'bg-yellow-900/30 border-yellow-700/50', text: 'text-yellow-400' },
  1: { icon: '🥈', bg: 'bg-gray-700/50 border-gray-600/50', text: 'text-gray-300' },
  2: { icon: '🥉', bg: 'bg-orange-900/30 border-orange-700/50', text: 'text-orange-400' },
}

function LeaderboardRow({ user: u, rank, isCurrentUser }) {
  const wins = u.wins ?? 0
  const losses = u.losses ?? 0
  const pushes = u.pushes ?? 0
  const total = wins + losses + pushes
  const winRate = total > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0
  const unitsWon = typeof u.unitsWon === 'number' ? u.unitsWon.toFixed(1) : '0.0'
  const roi = total > 0 && u.unitsRisked > 0 ? ((u.unitsWon / u.unitsRisked) * 100).toFixed(1) : '—'

  const rankStyle = RANK_STYLES[rank] || {}
  const isTop3 = rank < 3

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isCurrentUser
          ? 'bg-orange-400/10 border-orange-400/30'
          : isTop3
            ? `${rankStyle.bg} border`
            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {isTop3 ? (
          <span className="text-lg">{rankStyle.icon}</span>
        ) : (
          <span className="text-sm font-bold text-gray-500">#{rank + 1}</span>
        )}
      </div>

      {/* Avatar */}
      {u.photoURL ? (
        <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full border border-gray-600 flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 text-xs font-bold flex-shrink-0">
          {(u.displayName || 'U')[0].toUpperCase()}
        </div>
      )}

      {/* Name + record */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-orange-300' : 'text-white'}`}>
            {u.displayName || 'Anonymous'}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {wins}W - {losses}L{pushes > 0 ? ` - ${pushes}P` : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500 mb-0.5">Win%</p>
          <p className={`text-sm font-bold ${winRate >= 55 ? 'text-green-400' : winRate >= 50 ? 'text-gray-200' : 'text-gray-400'}`}>
            {total > 0 ? `${winRate}%` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Units</p>
          <p className={`text-sm font-bold ${Number(unitsWon) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {Number(unitsWon) >= 0 ? '+' : ''}{unitsWon}u
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs text-gray-500 mb-0.5">ROI</p>
          <p className={`text-sm font-bold ${roi === '—' ? 'text-gray-500' : Number(roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roi !== '—' ? `${Number(roi) >= 0 ? '+' : ''}${roi}%` : roi}
          </p>
        </div>
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-800 rounded-xl border border-gray-700 animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Leaderboard component — shows top bettors by units won.
 * @param {number} limit - number of users to show
 */
export default function Leaderboard({ limit = 50 }) {
  const { user } = useAuth()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })

  if (isLoading) return <LeaderboardSkeleton />

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy size={48} className="text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-400">No rankings yet</h3>
        <p className="text-sm text-gray-500 mt-1">Start posting picks to appear on the leaderboard!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="w-8" />
        <div className="w-8" />
        <div className="flex-1">Bettor</div>
        <div className="hidden sm:block w-12 text-right">Win%</div>
        <div className="w-16 text-right">Units</div>
        <div className="hidden md:block w-12 text-right">ROI</div>
      </div>

      {users.map((u, i) => (
        <LeaderboardRow
          key={u.id}
          user={u}
          rank={i}
          isCurrentUser={user?.uid === u.id}
        />
      ))}
    </div>
  )
}
