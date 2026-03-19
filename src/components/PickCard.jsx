import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageSquare, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import GradeTag from './GradeTag'
import { useAuth } from '../hooks/useAuth'
import { toggleLike, hasUserLiked, deleteCommunityPick } from '../firebase/firestore'

const BET_TYPE_LABELS = {
  spread: 'Spread',
  moneyline: 'Moneyline',
  overunder: 'Over/Under',
}

/**
 * PickCard — community pick card with like functionality.
 */
export default function PickCard({ post }) {
  const { user, isAuthenticated } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const {
    id,
    userId,
    gameLabel,
    gameId,
    betType,
    side,
    odds,
    units,
    analysis,
    grade = 'PENDING',
    createdAt,
  } = post

  // Load like status for current user
  useEffect(() => {
    if (!user || !id) return
    hasUserLiked(id, user.uid).then(setLiked)
  }, [id, user])

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
      return
    }
    try {
      await deleteCommunityPick(id)
      setDeleted(true)
    } catch (err) {
      console.error('Failed to delete pick:', err)
      setDeleteConfirm(false)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated || likeLoading) return
    setLikeLoading(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))
    try {
      await toggleLike(id, user.uid, wasLiked)
    } catch {
      // Rollback
      setLiked(wasLiked)
      setLikeCount((c) => c + (wasLiked ? 1 : -1))
    } finally {
      setLikeLoading(false)
    }
  }

  const timeAgo = createdAt?.toDate
    ? formatDistanceToNow(createdAt.toDate(), { addSuffix: true })
    : createdAt
      ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
      : 'just now'

  const oddsDisplay = odds > 0 ? `+${odds}` : `${odds}`
  const unitsDisplay = `${units}u`

  const displayName = post.displayName || 'Anonymous'
  const photoURL = post.photoURL || null
  const isOwner = user?.uid === userId

  if (deleted) return null

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors duration-150 animate-fade-in">
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-9 h-9 rounded-full border border-gray-600 flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">
              {displayName[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
          </div>
        </div>
        <GradeTag grade={grade} />
      </div>

      {/* Pick info */}
      <div className="bg-gray-750 rounded-lg p-3 mb-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          {gameId ? (
            <Link
              to={`/game/${gameId}`}
              className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors truncate max-w-[180px]"
            >
              {gameLabel || gameId}
            </Link>
          ) : (
            <span className="text-xs text-gray-500">{gameLabel || 'Unknown Game'}</span>
          )}
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {BET_TYPE_LABELS[betType] || betType}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-white">{side}</span>
          <span className="text-sm text-gray-400">{oddsDisplay}</span>
          <span className="text-xs bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
            {unitsDisplay}
          </span>
        </div>
      </div>

      {/* Analysis */}
      {analysis && (
        <p className="text-sm text-gray-300 leading-relaxed mb-3 line-clamp-3">{analysis}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            disabled={!isAuthenticated || likeLoading}
            className={`flex items-center gap-1 text-sm transition-colors duration-150 ${
              liked
                ? 'text-rose-400 hover:text-rose-300'
                : 'text-gray-500 hover:text-gray-300'
            } disabled:cursor-default`}
          >
            <Heart size={14} className={liked ? 'fill-current' : ''} />
            <span>{likeCount}</span>
          </button>
          {gameId && (
            <Link
              to={`/game/${gameId}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <MessageSquare size={14} />
              <span>Thread</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1 text-xs transition-colors duration-150 ${
                deleteConfirm
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
              title={deleteConfirm ? 'Click again to confirm delete' : 'Delete pick'}
            >
              <Trash2 size={12} />
              {deleteConfirm && <span>Confirm?</span>}
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
