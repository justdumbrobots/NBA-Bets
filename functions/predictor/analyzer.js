'use strict'

const axios = require('axios')

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

function formatOdds(american) {
  if (american == null) return 'unknown'
  const n = Number(american)
  return n > 0 ? `+${n}` : `${n}`
}

/**
 * Build the analysis prompt for a single game.
 *
 * @param {Object} game        - Internal game object from odds.js
 * @param {string} sportLabel  - e.g. 'NBA' or 'NCAAB'
 * @returns {string}
 */
function buildPrompt(game, sportLabel) {
  const isNCAA = sportLabel === 'NCAAB'
  const context = isNCAA
    ? 'Consider: recent team form, home court advantage (larger in college), key player matchups, tournament seeding implications, pace of play, and coaching tendencies.'
    : 'Consider: recent team form (last 10 games), home/away records, key injuries if known, pace of play, and line movement context.'

  return `You are an expert ${sportLabel} sports betting analyst. Analyze the following game and provide a single best bet recommendation.

Game: ${game.visitor_team?.full_name} (Away) vs ${game.home_team?.full_name} (Home)
Sport: ${sportLabel}
Spread: Home team ${game.spread ?? 'unknown'}
Moneyline: Home ${formatOdds(game.moneylineHome)} / Away ${formatOdds(game.moneylineAway)}
Over/Under: ${game.overUnder ?? 'unknown'}

${context}

Respond with ONLY a valid JSON object in this exact format:
{
  "aiPickType": "spread" | "moneyline" | "overunder",
  "aiPick": "<exact side label e.g. '${game.home_team?.abbreviation} -3.5' or 'Over 224.5'>",
  "aiConfidence": <integer 51-95>,
  "aiAnalysis": "<2-3 sentence explanation under 280 characters>"
}`
}

/**
 * Call Claude to generate a pick for a single game.
 *
 * @param {Object} game        - Internal game object
 * @param {string} sportLabel  - 'NBA' or 'NCAAB'
 * @param {string} apiKey      - Anthropic API key
 * @returns {Promise<{aiPickType, aiPick, aiConfidence, aiAnalysis}>}
 */
async function analyzePick(game, sportLabel, apiKey) {
  if (!apiKey) throw new Error('CLAUDE_API_KEY not set')

  const prompt = buildPrompt(game, sportLabel)
  const response = await axios.post(
    CLAUDE_API_URL,
    {
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 15000,
    }
  )

  const text = response.data.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no valid JSON')
  return JSON.parse(match[0])
}

module.exports = { buildPrompt, analyzePick }
