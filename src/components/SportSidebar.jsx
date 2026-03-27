import { useSport, SPORTS } from '../context/SportContext'

function BasketballIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c0 0-4 4-4 10s4 10 4 10" />
      <path d="M12 2c0 0 4 4 4 10s-4 10-4 10" />
      <path d="M2 12h20" />
    </svg>
  )
}

function BaseballIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.5 4.5C14.5 4.5 16 8 16 12s-1.5 7.5-1.5 7.5" strokeLinecap="round" />
      <path d="M9.5 4.5C9.5 4.5 8 8 8 12s1.5 7.5 1.5 7.5" strokeLinecap="round" />
      <path d="M14.5 4.5 C15.5 5 17 6 18 7.5" strokeLinecap="round" />
      <path d="M14.5 19.5 C15.5 19 17 18 18 16.5" strokeLinecap="round" />
      <path d="M9.5 4.5 C8.5 5 7 6 6 7.5" strokeLinecap="round" />
      <path d="M9.5 19.5 C8.5 19 7 18 6 16.5" strokeLinecap="round" />
    </svg>
  )
}

function SportIcon({ sportKey, size = 18 }) {
  if (sportKey === 'mlb') return <BaseballIcon size={size} />
  return <BasketballIcon size={size} />
}

export default function SportSidebar() {
  const { sport, setSport } = useSport()

  return (
    <>
      {/* ── Desktop: vertical left sidebar ── */}
      <aside className="hidden lg:flex flex-col w-44 shrink-0 border-r border-gray-800 pt-6 pb-4 px-3 gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Sport</p>
        {SPORTS.map((s) => {
          const active = sport.key === s.key
          return (
            <button
              key={s.key}
              onClick={() => setSport(s)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <SportIcon sportKey={s.key} size={16} />
              <span>{s.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
            </button>
          )
        })}
      </aside>

      {/* ── Mobile / tablet: horizontal pill row ── */}
      <div className="lg:hidden flex gap-2 px-4 pt-4 pb-0">
        {SPORTS.map((s) => {
          const active = sport.key === s.key
          return (
            <button
              key={s.key}
              onClick={() => setSport(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
              }`}
            >
              <SportIcon sportKey={s.key} size={13} />
              {s.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
