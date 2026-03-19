import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar, RefreshCw, Zap, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePicks, usePicksCalendar, getTodayET, getTomorrowET, getNextUpdateLabel } from '../hooks/usePicks'
import GameCard from '../components/GameCard'

// ─── Skeleton ──────────────────────────────────────────────────────────────

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

// ─── Update Banner ──────────────────────────────────────────────────────────

function UpdateBanner({ generatedAt, isTomorrow }) {
  const nextUpdate = getNextUpdateLabel()

  const generatedLabel = (() => {
    if (!generatedAt) return null
    try {
      const d = generatedAt.toDate ? generatedAt.toDate() : new Date(generatedAt)
      return format(d, 'h:mm a') + ' ET'
    } catch {
      return null
    }
  })()

  if (isTomorrow) {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg px-3 py-2 mb-5">
        <Clock size={13} />
        <span>Tomorrow&apos;s preview picks · Updated daily at 8:00 AM, 12:00 PM &amp; 6:00 PM ET</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between text-xs bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 mb-5">
      <div className="flex items-center gap-2 text-gray-400">
        <Clock size={13} />
        {generatedLabel ? (
          <span>Picks updated at <span className="text-gray-200 font-medium">{generatedLabel}</span></span>
        ) : (
          <span>Updates 3× daily at 8 AM, 12 PM &amp; 6 PM ET</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-orange-400">
        <RefreshCw size={11} />
        <span>Next update <span className="font-medium">{nextUpdate}</span></span>
      </div>
    </div>
  )
}

// ─── Calendar Strip ─────────────────────────────────────────────────────────

function CalendarStrip({ selectedDate, onSelectDate }) {
  const { summaries, dateStrings } = usePicksCalendar(14)
  const todayStr = getTodayET()
  const tomorrowStr = getTomorrowET()
  const scrollRef = useRef(null)

  // Scroll selected date into view
  useEffect(() => {
    if (!scrollRef.current) return
    const idx = dateStrings.indexOf(selectedDate)
    if (idx === -1) return
    const el = scrollRef.current.children[idx]
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate, dateStrings])

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div className="relative mb-6">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-white"
        aria-label="Scroll left"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth px-7 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dateStrings.map((dateStr) => {
          const isToday = dateStr === todayStr
          const isTomorrow = dateStr === tomorrowStr
          const isSelected = dateStr === selectedDate
          const isFuture = dateStr > todayStr
          const summary = summaries[dateStr]
          const parsed = parseISO(dateStr)
          const dayName = format(parsed, 'EEE')
          const dayNum = format(parsed, 'd')
          const monthLabel = format(parsed, 'MMM')
          const hasResults = summary && (summary.wins > 0 || summary.losses > 0 || summary.pushes > 0)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2.5 min-w-[60px] transition-all border
                ${isSelected
                  ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20'
                  : isToday
                  ? 'bg-gray-700 border-gray-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${isSelected ? 'text-orange-100' : ''}`}>
                {isToday ? 'Today' : isTomorrow ? 'Tmrw' : dayName}
              </span>
              <span className="text-lg font-bold leading-none mt-0.5">{dayNum}</span>
              <span className={`text-xs mt-0.5 ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>{monthLabel}</span>

              {/* W/L summary for graded past days */}
              {!isFuture && hasResults && (
                <div className="flex items-center gap-1 mt-1.5">
                  {summary.wins > 0 && <span className="text-xs font-bold text-green-400">{summary.wins}W</span>}
                  {summary.losses > 0 && <span className="text-xs font-bold text-red-400">{summary.losses}L</span>}
                  {summary.pushes > 0 && <span className="text-xs font-bold text-yellow-400">{summary.pushes}P</span>}
                </div>
              )}

              {/* Orange dot: picks exist but not graded */}
              {!isFuture && summary && !hasResults && summary.gameCount > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5" />
              )}

              {/* Blue dot: tomorrow has picks */}
              {isFuture && summary && summary.gameCount > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-white"
        aria-label="Scroll right"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ─── Home Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const todayStr = getTodayET()
  const tomorrowStr = getTomorrowET()
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const { games, generatedAt, isLoading, isError, isEmpty, refetch } = usePicks(selectedDate)

  const isTomorrow = selectedDate === tomorrowStr
  const isPast = selectedDate < todayStr

  const headingLabel = (() => {
    if (selectedDate === todayStr) return "Today's Picks"
    if (isTomorrow) return "Tomorrow's Picks"
    try { return format(parseISO(selectedDate), 'MMM d Picks') } catch { return 'Picks' }
  })()

  const dateFormatted = (() => {
    try { return format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy') } catch { return selectedDate }
  })()

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={18} className="text-orange-400" />
              <h1 className="text-2xl font-extrabold text-white">{headingLabel}</h1>
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

        {/* Calendar strip */}
        <CalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Update banner (today and tomorrow only) */}
        {(selectedDate === todayStr || isTomorrow) && (
          <UpdateBanner generatedAt={generatedAt} isTomorrow={isTomorrow} />
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-400 text-sm font-medium">Failed to load picks. Please try again.</p>
            <button onClick={() => refetch()} className="mt-2 text-sm text-red-400 hover:text-red-300 underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <GameCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && !isError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
              <Zap size={32} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isTomorrow ? "Tomorrow's Picks Coming Soon" : isPast ? 'No Picks Found' : "Generating Today's Picks"}
            </h2>
            <p className="text-gray-400 text-sm max-w-md">
              {isTomorrow
                ? "Tomorrow's preview picks are generated at 6:00 PM ET. Check back later."
                : isPast
                ? 'No picks were recorded for this date.'
                : 'Picks are generated at 8 AM ET. Our model analyzes injury reports, recent form, and betting lines to find the best edges.'}
            </p>
            {!isPast && (
              <button
                onClick={() => refetch()}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw size={14} />
                Check Again
              </button>
            )}
          </div>
        )}

        {/* Games grid */}
        {!isLoading && games.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              {games.length} game{games.length !== 1 ? 's' : ''} · {isTomorrow ? 'preview' : isPast ? 'final' : 'today'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {games.map((game) => <GameCard key={game.id} game={game} />)}
            </div>
          </>
        )}

        <p className="text-xs text-gray-600 text-center mt-12 max-w-2xl mx-auto">
          Picks are generated by AI for entertainment purposes only. Always gamble responsibly. This is not financial advice.
        </p>
      </div>
    </div>
  )
}
