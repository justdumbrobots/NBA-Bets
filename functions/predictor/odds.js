'use strict'

const axios = require('axios')

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

/**
 * Parse a single Odds API event into the predictor's internal game format.
 *
 * @param {Object} event  - Raw event from The Odds API
 * @param {Function} getAbbr - Sport-specific abbreviation resolver
 * @returns {Object|null}
 */
function parseEvent(event, getAbbr) {
  const book = (event.bookmakers || []).find((b) =>
    ['draftkings', 'fanduel', 'betmgm', 'caesars'].includes(b.key)
  ) || event.bookmakers?.[0]

  const h2h = book?.markets?.find((m) => m.key === 'h2h')
  const spreads = book?.markets?.find((m) => m.key === 'spreads')
  const totals = book?.markets?.find((m) => m.key === 'totals')

  const homeML = h2h?.outcomes?.find((o) => o.name === event.home_team)?.price ?? null
  const awayML = h2h?.outcomes?.find((o) => o.name === event.away_team)?.price ?? null
  const homeSpread = spreads?.outcomes?.find((o) => o.name === event.home_team)?.point ?? null
  const overUnder = totals?.outcomes?.find((o) => o.name === 'Over')?.point ?? null

  return {
    id: event.id,
    home_team: { full_name: event.home_team, abbreviation: getAbbr(event.home_team) },
    visitor_team: { full_name: event.away_team, abbreviation: getAbbr(event.away_team) },
    datetime: event.commence_time,
    spread: homeSpread,
    moneylineHome: homeML,
    moneylineAway: awayML,
    overUnder,
  }
}

/**
 * Fetch games for a sport and date from The Odds API, including real betting lines.
 *
 * @param {string} sportKey  - e.g. 'basketball_nba' or 'basketball_ncaab'
 * @param {string} dateStr   - yyyy-MM-dd in ET
 * @param {string} apiKey    - The Odds API key
 * @param {Function} getAbbr - Sport-specific abbreviation resolver
 * @returns {Promise<Object[]>}
 */
async function fetchGames(sportKey, dateStr, apiKey, getAbbr) {
  const dateFrom = encodeURIComponent(`${dateStr}T00:00:00Z`)
  // NBA/NCAAB tip-off can be as late as 10:30pm ET (EDT=UTC-4, EST=UTC-5).
  // Extend to next day 06:00Z to capture all games regardless of DST.
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const dateTo = encodeURIComponent(`${d.toISOString().slice(0, 10)}T06:00:00Z`)

  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&dateFormat=iso&oddsFormat=american&commenceTimeFrom=${dateFrom}&commenceTimeTo=${dateTo}`
  const res = await axios.get(url, { timeout: 10000 })
  const events = res.data || []
  return {
    games: events.map((e) => parseEvent(e, getAbbr)).filter(Boolean),
    requestsRemaining: res.headers['x-requests-remaining'] ?? 'unknown',
  }
}

/**
 * Fetch completed game scores for a date from The Odds API.
 *
 * @param {string} sportKey - e.g. 'basketball_nba'
 * @param {string} dateStr  - yyyy-MM-dd
 * @param {string} apiKey   - The Odds API key
 * @param {Function} getAbbr
 * @returns {Promise<Object[]>}
 */
async function fetchFinalScores(sportKey, dateStr, apiKey, getAbbr) {
  const url = `${ODDS_API_BASE}/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=3&dateFormat=iso`
  const res = await axios.get(url, { timeout: 10000 })
  return (res.data || [])
    .filter((e) => e.commence_time?.slice(0, 10) === dateStr && e.completed === true)
    .map((e) => ({
      id: e.id,
      home_team: { full_name: e.home_team, abbreviation: getAbbr(e.home_team) },
      visitor_team: { full_name: e.away_team, abbreviation: getAbbr(e.away_team) },
      status: 'Final',
      home_team_score: Number(e.scores?.find((s) => s.name === e.home_team)?.score ?? 0),
      visitor_team_score: Number(e.scores?.find((s) => s.name === e.away_team)?.score ?? 0),
    }))
}

module.exports = { fetchGames, fetchFinalScores }
