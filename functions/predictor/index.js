'use strict'

/**
 * @cover-kings/predictor
 *
 * Sports betting prediction engine supporting NBA and NCAA basketball.
 *
 * Usage:
 *   const { sports, fetchGames, fetchFinalScores, analyzePick, gradeAIPick, gradeCommunityPick } = require('./predictor')
 *
 *   // Fetch today's NBA games with real odds
 *   const { games } = await fetchGames(sports.nba, '2026-03-27', process.env.ODDS_API_KEY)
 *
 *   // Generate AI pick for a game
 *   const pick = await analyzePick(games[0], sports.nba.SPORT_LABEL, process.env.CLAUDE_API_KEY)
 *
 *   // Grade a completed pick
 *   const grade = gradeAIPick(storedGame, { homeScore: 112, awayScore: 108 })
 */

const nba = require('./sports/nba')
const ncaa = require('./sports/ncaa')
const { fetchGames: _fetchGames, fetchFinalScores: _fetchFinalScores } = require('./odds')
const { buildPrompt, analyzePick } = require('./analyzer')
const { gradeAIPick, gradeCommunityPick } = require('./grader')

const sports = { nba, ncaa }

/**
 * Fetch games with real betting lines for a sport and date.
 *
 * @param {Object} sport   - sports.nba or sports.ncaa
 * @param {string} dateStr - yyyy-MM-dd (ET)
 * @param {string} apiKey  - The Odds API key
 * @returns {Promise<{ games: Object[], requestsRemaining: string }>}
 */
function fetchGames(sport, dateStr, apiKey) {
  return _fetchGames(sport.SPORT_KEY, dateStr, apiKey, sport.getAbbr)
}

/**
 * Fetch completed game scores for grading.
 *
 * @param {Object} sport   - sports.nba or sports.ncaa
 * @param {string} dateStr - yyyy-MM-dd (ET)
 * @param {string} apiKey  - The Odds API key
 * @returns {Promise<Object[]>}
 */
function fetchFinalScores(sport, dateStr, apiKey) {
  return _fetchFinalScores(sport.SPORT_KEY, dateStr, apiKey, sport.getAbbr)
}

module.exports = {
  sports,
  fetchGames,
  fetchFinalScores,
  buildPrompt,
  analyzePick,
  gradeAIPick,
  gradeCommunityPick,
}
