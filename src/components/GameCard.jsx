import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useVotes } from '../hooks/useVotes'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'

// Map of team abbreviations to their primary colors
const TEAM_COLORS = {
  LAL: '#552583', BOS: '#007A33', GSW: '#1D428A', MIA: '#98002E',
  CHI: '#CE1141', NYK: '#006BB6', BKN: '#000000', PHI: '#006BB6',
  MIL: '#00471B', DEN: '#0E2240', PHX: '#1D1160', DAL: '#00538C',
  HOU: '#CE1141', SAS: '#C4CED4', LAC: '#C8102E', POR: '#E03A3E',
  SAC: '#5A2D81', MIN: '#0C2340', MEM: '#5D76A9', NOP: '#0C2340',
  ATL: '#E03A3E', CLE: '#6F263D', DET: '#C8102E', IND: '#002D62',
  CHA: '#1D1160', WAS: '#002B5C', ORL: '#0077C0', TOR: '#CE1141',
  UTA: '#002B5C', OKC: '#007AC1',
}

function TeamCircle({ abbreviation, name }) {
  const color = TEAM_COLORS[abbreviation] || '#374151'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-gray-600"
        style={{ backgroundColor: color }}
        title={name}
      >
        {abbreviation || '?'}
      </div>
      <span className="text-xs text-gray-400 font-medium">{abbreviation}</span>
    </div>
  )
}

function VoteSection({ label, sideA, sideB, betType, gameId, aiPick, aiConfidence }) {
  const { user, isAuthenticated } = useAuth()
  const { userVotes, castVote, isVoting, getVotePercent, getTotalVotes } = useVotes(gameId)

  const currentVote = userVotes[betType]
  const total = getTotalVotes(betType)
  const pctA = getVotePercent(betType, sideA.label)
  const pctB = getVotePercent(betType, sideB.label)

  const isAiPickA = aiPick && sideA.label === aiPick
  const isAiPickB = aiPick && sideB.label === aiPick

  const handleVote = (side) => {
    if (!isAuthenticated) return
    castVote(betType, side)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-500">{total} vote{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[{ side: sideA, pct: pctA, isAi: isAiPickA }, { side: sideB, pct: pctB, isAi: isAiPickB }].map(
          ({ side, pct, isAi }) => {
            const isVoted = currentVote === side.label
            return (
              <button
                key={side.label}
                onClick={() => handleVote(side.label)}
                disabled={!isAuthenticated || isVoting}
                title={!isAuthenticated ? 'Sign in to vote' : undefined}
                className={`relative overflow-hidden rounded-lg border p-2.5 text-left transition-all duration-200
                  ${isVoted
                    ? 'border-orange-400 bg-orange-400/15 shadow-sm shadow-orange-400/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                  }
                  ${!isAuthenticated ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                {/* Progress bar background */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ${isVoted ? 'bg-orange-400/10' : 'bg-gray-600/20'}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-1">
                  <div>
                    <p className={`text-xs font-bold ${isVoted ? 'text-orange-300' : 'text-gray-200'}`}>
                      {side.label}
                    </p>
                    {side.odds && (
                      <p className="text-xs text-gray-400">{side.odds > 0 ? `+${side.odds}` : side.odds}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-sm font-bold ${isVoted ? 'text-orange-400' : 'text-gray-300'}`}>
                      {pct}%
                    </span>
                    {isAi && (
                      <span className="flex items-center gap-0.5 text-xs text-yellow-400 font-semibold whitespace-nowrap">
                        <Zap size={10} />
                        AI {aiConfidence ? `${aiConfidence}%` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}

/**
 * GameCard — main card for a single NBA game with picks and voting.
 *
 * @param {Object} game - game object from Firestore picks document
 */
export default function GameCard({ game }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const {
    id: gameId,
    homeTeam,
    awayTeam,
    homeAbbr,
    awayAbbr,
    gameTime,
    spread,
    spreadHome,
    spreadAway,
    moneylineHome,
    moneylineAway,
    overUnder,
    aiPick,
    aiPickType,
    aiConfidence,
    aiAnalysis,
  } = game

  const gameTimeFormatted = gameTime
    ? (() => {
        try {
          return format(new Date(gameTime), 'h:mm a zzz')
        } catch {
          return gameTime
        }
      })()
    : 'TBD'

  const homeSpreadLabel = spreadHome ?? (spread ? `${homeAbbr} ${spread > 0 ? '+' : ''}${spread}` : `${homeAbbr}`)
  const awaySpreadLabel = spreadAway ?? (spread ? `${awayAbbr} ${spread > 0 ? '-' : '+'}${Math.abs(spread)}` : `${awayAbbr}`)

  const spreadSideA = { label: homeSpreadLabel, odds: -110 }
  const spreadSideB = { label: awaySpreadLabel, odds: -110 }

  const mlSideA = { label: `${homeAbbr} ML`, odds: moneylineHome }
  const mlSideB = { label: `${awayAbbr} ML`, odds: moneylineAway }

  const ouSideA = { label: `Over ${overUnder}`, odds: -110 }
  const ouSideB = { label: `Under ${overUnder}`, odds: -110 }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
      {/* Header: teams */}
      <div
        className="px-4 pt-4 pb-3 cursor-pointer"
        onClick={() => navigate(`/game/${gameId}`)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-medium">{gameTimeFormatted}</span>
          {aiPickType && (
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
              <TrendingUp size={10} />
              AI Pick
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <TeamCircle abbreviation={awayAbbr} name={awayTeam} />
          <div className="text-center">
            <span className="text-gray-500 text-sm font-medium">@</span>
            <p className="text-xs text-gray-500 mt-0.5">O/U {overUnder}</p>
          </div>
          <TeamCircle abbreviation={homeAbbr} name={homeTeam} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-300 font-medium">
          <span className="max-w-[100px] truncate text-center" style={{ flex: '1' }}>{awayTeam}</span>
          <span className="w-8" />
          <span className="max-w-[100px] truncate text-center" style={{ flex: '1' }}>{homeTeam}</span>
        </div>
      </div>

      {/* Voting sections */}
      <div className="px-4 pb-3 space-y-3 border-t border-gray-700/50 pt-3">
        {spread != null && (
          <VoteSection
            label="Spread"
            sideA={spreadSideA}
            sideB={spreadSideB}
            betType="spread"
            gameId={gameId}
            aiPick={aiPickType === 'spread' ? aiPick : null}
            aiConfidence={aiPickType === 'spread' ? aiConfidence : null}
          />
        )}
        {(moneylineHome != null || moneylineAway != null) && (
          <VoteSection
            label="Moneyline"
            sideA={mlSideA}
            sideB={mlSideB}
            betType="moneyline"
            gameId={gameId}
            aiPick={aiPickType === 'moneyline' ? aiPick : null}
            aiConfidence={aiPickType === 'moneyline' ? aiConfidence : null}
          />
        )}
        {overUnder != null && (
          <VoteSection
            label="Over/Under"
            sideA={ouSideA}
            sideB={ouSideB}
            betType="overunder"
            gameId={gameId}
            aiPick={aiPickType === 'overunder' ? aiPick : null}
            aiConfidence={aiPickType === 'overunder' ? aiConfidence : null}
          />
        )}
      </div>

      {/* AI Analysis expandable */}
      {aiAnalysis && (
        <div className="border-t border-gray-700/50">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400" />
              AI Analysis
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-300 leading-relaxed">{aiAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
