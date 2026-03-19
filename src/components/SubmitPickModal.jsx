import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { submitCommunityPick } from '../firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { usePicks, getTodayET } from '../hooks/usePicks'

const BET_TYPES = [
  { value: 'spread', label: 'Spread' },
  { value: 'moneyline', label: 'Moneyline' },
  { value: 'overunder', label: 'Over/Under' },
]

const UNIT_OPTIONS = [
  { value: 0.5, label: '0.5u' },
  { value: 1, label: '1u' },
  { value: 1.5, label: '1.5u' },
  { value: 2, label: '2u' },
  { value: 3, label: '3u' },
  { value: 5, label: '5u' },
]

const MAX_ANALYSIS_CHARS = 280

function getSidesForBetType(game, betType) {
  if (!game) return []
  switch (betType) {
    case 'spread': {
      const home = game.spreadHome || `${game.homeAbbr} ${game.spread >= 0 ? '+' : ''}${game.spread}`
      const away = game.spreadAway || `${game.awayAbbr} ${game.spread <= 0 ? '+' : ''}${-game.spread}`
      return [
        { label: home, odds: -110 },
        { label: away, odds: -110 },
      ]
    }
    case 'moneyline':
      return [
        { label: `${game.homeAbbr} ML`, odds: game.moneylineHome },
        { label: `${game.awayAbbr} ML`, odds: game.moneylineAway },
      ]
    case 'overunder':
      return [
        { label: `Over ${game.overUnder}`, odds: -110 },
        { label: `Under ${game.overUnder}`, odds: -110 },
      ]
    default:
      return []
  }
}

/**
 * SubmitPickModal — modal for submitting a community pick.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onSuccess - called after successful submission
 */
export default function SubmitPickModal({ isOpen, onClose, onSuccess }) {
  const { user, isAuthenticated } = useAuth()
  const { games } = usePicks()

  const [selectedGameId, setSelectedGameId] = useState('')
  const [betType, setBetType] = useState('spread')
  const [selectedSide, setSelectedSide] = useState('')
  const [odds, setOdds] = useState(-110)
  const [units, setUnits] = useState(1)
  const [analysis, setAnalysis] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const selectedGame = games.find((g) => g.id === selectedGameId) || null
  const sides = getSidesForBetType(selectedGame, betType)

  // Reset side when game or bet type changes
  useEffect(() => {
    setSelectedSide('')
    if (sides.length > 0) {
      setOdds(sides[0].odds || -110)
    }
  }, [selectedGameId, betType])

  // Auto-fill odds when side changes
  useEffect(() => {
    if (!selectedSide) return
    const found = sides.find((s) => s.label === selectedSide)
    if (found?.odds) setOdds(found.odds)
  }, [selectedSide, sides])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated || !user) return
    if (!selectedGameId || !betType || !selectedSide) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const game = games.find((g) => g.id === selectedGameId)
      const gameLabel = game ? `${game.awayAbbr} @ ${game.homeAbbr}` : selectedGameId
      await submitCommunityPick(user.uid, {
        gameId: selectedGameId,
        gameLabel,
        betType,
        side: selectedSide,
        odds: Number(odds),
        units: Number(units),
        analysis: analysis.trim(),
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null,
        date: getTodayET(),
      })
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError('Failed to submit pick. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedGameId('')
    setBetType('spread')
    setSelectedSide('')
    setOdds(-110)
    setUnits(1)
    setAnalysis('')
    setError(null)
    onClose()
  }

  const isValid = selectedGameId && betType && selectedSide

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Post a Pick</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Game select */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Game *
            </label>
            {games.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No games available for today.</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  required
                  className="w-full appearance-none bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400 transition-colors pr-8"
                >
                  <option value="">Select a game</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.awayTeam} @ {g.homeTeam}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Bet type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Bet Type *
            </label>
            <div className="flex gap-2">
              {BET_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBetType(value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    betType === value
                      ? 'bg-orange-400/15 border-orange-400 text-orange-400'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Side selection */}
          {selectedGame && sides.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Pick *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sides.map((side) => (
                  <button
                    key={side.label}
                    type="button"
                    onClick={() => setSelectedSide(side.label)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      selectedSide === side.label
                        ? 'bg-orange-400/15 border-orange-400 text-orange-300'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {side.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Odds + Units row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Odds
              </label>
              <input
                type="number"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                placeholder="-110"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Unit Size
              </label>
              <div className="relative">
                <select
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full appearance-none bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400 transition-colors pr-8"
                >
                  {UNIT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Analysis <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value.slice(0, MAX_ANALYSIS_CHARS))}
              placeholder="Share your reasoning..."
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors resize-none"
            />
            <p className={`text-xs mt-1 text-right ${analysis.length >= MAX_ANALYSIS_CHARS ? 'text-red-400' : 'text-gray-500'}`}>
              {analysis.length}/{MAX_ANALYSIS_CHARS}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors duration-150"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              'Post Pick'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
