'use strict'

/**
 * Grade an AI pick against final scores.
 *
 * @param {Object} game   - Game object from Firestore picks doc (has aiPickType, aiPick, spread, etc.)
 * @param {Object} scores - { homeScore, awayScore }
 * @returns {'W'|'L'|'PUSH'|'PENDING'}
 */
function gradeAIPick(game, scores) {
  if (!scores || !game.aiPick || !game.aiPickType) return 'PENDING'
  const { homeScore, awayScore } = scores

  if (game.aiPickType === 'spread') {
    const spread = game.spread || 0
    const margin = homeScore + spread - awayScore
    if (margin > 0) return game.aiPick.includes(game.homeAbbr) ? 'W' : 'L'
    if (margin < 0) return game.aiPick.includes(game.awayAbbr) ? 'W' : 'L'
    return 'PUSH'
  }

  if (game.aiPickType === 'moneyline') {
    const homeWon = homeScore > awayScore
    const pickedHome = game.aiPick.includes(game.homeAbbr)
    return homeWon === pickedHome ? 'W' : 'L'
  }

  if (game.aiPickType === 'overunder') {
    const total = homeScore + awayScore
    const ou = game.overUnder || 0
    if (total > ou) return game.aiPick.toLowerCase().includes('over') ? 'W' : 'L'
    if (total < ou) return game.aiPick.toLowerCase().includes('under') ? 'W' : 'L'
    return 'PUSH'
  }

  return 'PENDING'
}

/**
 * Grade a community user pick against final scores.
 *
 * @param {Object} post     - Community post doc (has betType, side, units, odds)
 * @param {Object} gameData - Game object from picks doc (has spread, overUnder, homeAbbr, awayAbbr)
 * @param {Object} scores   - { homeScore, awayScore }
 * @returns {{ grade: 'W'|'L'|'PUSH'|'PENDING', unitsWon: number, unitsRisked: number }}
 */
function gradeCommunityPick(post, gameData, scores) {
  if (!scores) return { grade: 'PENDING', unitsWon: 0, unitsRisked: 0 }

  const { homeScore, awayScore } = scores
  const unitsRisked = post.units || 1
  let grade = 'PENDING'

  if (post.betType === 'spread') {
    const spread = gameData.spread || 0
    const margin = homeScore + spread - awayScore
    if (margin > 0) grade = post.side.includes(gameData.homeAbbr) ? 'W' : 'L'
    else if (margin < 0) grade = post.side.includes(gameData.awayAbbr) ? 'W' : 'L'
    else grade = 'PUSH'
  } else if (post.betType === 'moneyline') {
    const homeWon = homeScore > awayScore
    const pickedHome = post.side.includes(gameData.homeAbbr)
    grade = homeWon === pickedHome ? 'W' : 'L'
  } else if (post.betType === 'overunder') {
    const total = homeScore + awayScore
    const ou = gameData.overUnder || 0
    if (total > ou) grade = post.side.toLowerCase().includes('over') ? 'W' : 'L'
    else if (total < ou) grade = post.side.toLowerCase().includes('under') ? 'W' : 'L'
    else grade = 'PUSH'
  }

  let unitsWon = 0
  if (grade === 'W') {
    const odds = post.odds || -110
    unitsWon = odds > 0 ? (unitsRisked * odds) / 100 : (unitsRisked * 100) / Math.abs(odds)
  } else if (grade === 'L') {
    unitsWon = -unitsRisked
  }

  return { grade, unitsWon, unitsRisked }
}

module.exports = { gradeAIPick, gradeCommunityPick }
