import { createContext, useContext, useState } from 'react'

export const SPORTS = [
  { key: 'nba',  label: 'NBA',   collection: 'picks',      description: 'National Basketball Association' },
  { key: 'ncaa', label: 'NCAAB', collection: 'ncaa_picks', description: 'NCAA Men\'s Basketball' },
  { key: 'mlb',  label: 'MLB',   collection: 'mlb_picks',  description: 'Major League Baseball' },
]

const SportContext = createContext(null)

export function SportProvider({ children }) {
  const [sport, setSport] = useState(SPORTS[0])
  return (
    <SportContext.Provider value={{ sport, setSport, sports: SPORTS }}>
      {children}
    </SportContext.Provider>
  )
}

export function useSport() {
  return useContext(SportContext)
}
