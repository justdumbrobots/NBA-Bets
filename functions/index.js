const functions = require('firebase-functions')
const admin = require('firebase-admin')
const axios = require('axios')
const fetch = require('node-fetch')

admin.initializeApp()
const db = admin.firestore()

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getDateStrET(offsetDays = 0) {
  const now = new Date()
  // Use Intl to get the correct ET date (handles DST automatically)
  const etStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (offsetDays === 0) return etStr
  const d = new Date(etStr + 'T12:00:00')
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function getTodayDateStr() {
  return getDateStrET(0)
}

function getTomorrowDateStr() {
  return getDateStrET(1)
}

function formatOdds(american) {
  if (!american) return null
  const n = Number(american)
  return n > 0 ? `+${n}` : `${n}`
}

/**
 * Build a prompt for Claude to analyze a single game.
 */
function buildPickPrompt(game) {
  return `You are an expert NBA sports betting analyst. Analyze the following game and provide a single best bet recommendation.

Game: ${game.away_team?.full_name} (Away) vs ${game.home_team?.full_name} (Home)
Date: ${game.date}
Spread: Home team ${game.spread ?? 'unknown'}
Moneyline: Home ${formatOdds(game.home_ml) ?? 'unknown'} / Away ${formatOdds(game.away_ml) ?? 'unknown'}
Over/Under: ${game.over_under ?? 'unknown'}

Consider: recent team form (last 10 games), home/away records, key injuries if known, pace of play, and line movement context.

Respond with ONLY a valid JSON object in this exact format:
{
  "aiPickType": "spread" | "moneyline" | "overunder",
  "aiPick": "<exact side label e.g. 'LAL -3.5' or 'Over 224.5'>",
  "aiConfidence": <integer 51-95>,
  "aiAnalysis": "<2-3 sentence explanation under 280 characters>"
}`
}

/**
 * Call Claude API with a prompt.
 */
async function callClaude(prompt) {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error('CLAUDE_API_KEY not set')

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-haiku-20240307',
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
  // Extract JSON from the response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no valid JSON')
  return JSON.parse(match[0])
}

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

const NBA_ABBR = {
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
}

function getAbbr(teamName) {
  return NBA_ABBR[teamName] || teamName.split(' ').pop().slice(0, 3).toUpperCase()
}


/**
 * Parse an Odds API event into our internal game format.
 */
function parseOddsEvent(event) {
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
 * Fetch NBA games for a date from The Odds API (includes real betting lines).
 */
async function fetchNBAGames(dateStr) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    functions.logger.error('ODDS_API_KEY not configured')
    return []
  }
  try {
    const dateFrom = encodeURIComponent(`${dateStr}T00:00:00Z`)
    const dateTo = encodeURIComponent(`${dateStr}T23:59:59Z`)
    const url = `${ODDS_API_BASE}/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&dateFormat=iso&oddsFormat=american&commenceTimeFrom=${dateFrom}&commenceTimeTo=${dateTo}`
    const res = await axios.get(url, { timeout: 10000 })
    const events = res.data || []
    functions.logger.info(`Odds API returned ${events.length} games for ${dateStr}. Remaining requests: ${res.headers['x-requests-remaining']}`)
    return events.map(parseOddsEvent).filter(Boolean)
  } catch (err) {
    functions.logger.error(`Failed to fetch NBA games for ${dateStr}: status=${err.response?.status} ${err.message}`)
    return []
  }
}

/**
 * Fetch completed game scores for a date from The Odds API.
 */
async function fetchFinalScores(dateStr) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    functions.logger.error('ODDS_API_KEY not configured')
    return []
  }
  try {
    const url = `${ODDS_API_BASE}/sports/basketball_nba/scores/?apiKey=${apiKey}&daysFrom=3&dateFormat=iso`
    const res = await axios.get(url, { timeout: 10000 })
    const events = (res.data || []).filter((e) => {
      const gameDate = e.commence_time?.slice(0, 10)
      return gameDate === dateStr && e.completed === true
    })
    functions.logger.info(`Odds API returned ${events.length} completed games for ${dateStr}`)
    return events.map((e) => ({
      id: e.id,
      home_team: { full_name: e.home_team, abbreviation: getAbbr(e.home_team) },
      visitor_team: { full_name: e.away_team, abbreviation: getAbbr(e.away_team) },
      status: 'Final',
      home_team_score: Number(e.scores?.find((s) => s.name === e.home_team)?.score ?? 0),
      visitor_team_score: Number(e.scores?.find((s) => s.name === e.away_team)?.score ?? 0),
    }))
  } catch (err) {
    functions.logger.error(`Failed to fetch final scores for ${dateStr}: ${err.message}`)
    return []
  }
}

// ─────────────────────────────────────────────────────────
// 1. generateDailyPicks — scheduled 8am ET daily
// ─────────────────────────────────────────────────────────
/**
 * Core picks generation logic — shared by scheduled and HTTP functions.
 * @param {string} dateStr - yyyy-MM-dd
 * @param {boolean} force - overwrite existing picks if true
 * @returns {Promise<{skipped?: boolean, gameCount?: number, message?: string}>}
 */
async function generatePicksForDate(dateStr, force = false) {
  functions.logger.info(`Generating picks for ${dateStr} (force=${force})`)

  if (!force) {
    const existingDoc = await db.collection('picks').doc(dateStr).get()
    if (existingDoc.exists) {
      functions.logger.info(`Picks already exist for ${dateStr}, skipping.`)
      return { skipped: true }
    }
  }

  const rawGames = await fetchNBAGames(dateStr)
  if (rawGames.length === 0) {
    functions.logger.info(`No NBA games found for ${dateStr}`)
    await db.collection('picks').doc(dateStr).set({
      date: dateStr,
      games: [],
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      message: 'No games scheduled today.',
    })
    return { gameCount: 0, message: 'No games scheduled.' }
  }

  // For each game, attempt to get AI pick (with graceful fallback)
  const gamesWithPicks = await Promise.all(
    rawGames.map(async (game) => {
      const homeAbbr = game.home_team?.abbreviation || game.home_team?.full_name?.slice(0, 3).toUpperCase() || 'HOM'
      const awayAbbr = game.visitor_team?.abbreviation || game.visitor_team?.full_name?.slice(0, 3).toUpperCase() || 'AWY'

      const spread = game.spread ?? null
      const moneylineHome = game.moneylineHome ?? null
      const moneylineAway = game.moneylineAway ?? null
      const overUnder = game.overUnder ?? null

      const gameData = {
        id: String(game.id),
        homeTeam: game.home_team?.full_name || 'Home Team',
        awayTeam: game.visitor_team?.full_name || 'Away Team',
        homeAbbr,
        awayAbbr,
        gameTime: game.datetime || `${dateStr}T00:00:00Z`,
        spread,
        spreadHome: spread != null ? `${homeAbbr} ${spread > 0 ? '+' : ''}${spread}` : null,
        spreadAway: spread != null ? `${awayAbbr} ${spread < 0 ? '+' : ''}${-spread}` : null,
        moneylineHome,
        moneylineAway,
        overUnder,
        aiPickType: null,
        aiPick: null,
        aiConfidence: null,
        aiAnalysis: null,
      }

      try {
        const prompt = buildPickPrompt({
          ...game,
          home_team: game.home_team,
          away_team: game.visitor_team,
          spread,
          home_ml: moneylineHome,
          away_ml: moneylineAway,
          over_under: overUnder,
        })
        const aiResult = await callClaude(prompt)
        return {
          ...gameData,
          aiPickType: aiResult.aiPickType || null,
          aiPick: aiResult.aiPick || null,
          aiConfidence: aiResult.aiConfidence || null,
          aiAnalysis: aiResult.aiAnalysis || null,
        }
      } catch (err) {
        functions.logger.warn(`AI pick failed for game ${game.id}: ${err.message}`)
        return gameData
      }
    })
  )

  await db.collection('picks').doc(dateStr).set({
    date: dateStr,
    games: gamesWithPicks,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    gameCount: gamesWithPicks.length,
  })

  functions.logger.info(`Generated picks for ${gamesWithPicks.length} games on ${dateStr}`)
  return { gameCount: gamesWithPicks.length }
}

// Runs at 8am, 12pm, and 6pm ET.
// Each run force-refreshes today's picks and seeds tomorrow's picks if missing.
exports.generateDailyPicks = functions.pubsub
  .schedule('0 8,12,18 * * *')
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const today = getTodayDateStr()
    const tomorrow = getTomorrowDateStr()
    // Force-refresh today's picks on every run so data stays current
    await generatePicksForDate(today, true)
    // Seed tomorrow only if it doesn't exist yet
    await generatePicksForDate(tomorrow, false)
    return null
  })

// ─────────────────────────────────────────────────────────
// HTTP trigger to manually generate picks for a date.
// POST /triggerPicksGeneration  { date?: "yyyy-MM-dd", force?: boolean }
// Requires a secret header: x-admin-key == ADMIN_SECRET env var
// ─────────────────────────────────────────────────────────
exports.triggerPicksGeneration = functions.https.onRequest(async (req, res) => {
  // Simple secret key guard
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && req.headers['x-admin-key'] !== adminSecret) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const dateStr = req.body?.date || getTodayDateStr()
  const force = req.body?.force === true

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    res.status(400).json({ error: 'Invalid date format. Use yyyy-MM-dd.' })
    return
  }

  try {
    const result = await generatePicksForDate(dateStr, force)
    res.json({ date: dateStr, ...result })
  } catch (err) {
    functions.logger.error('triggerPicksGeneration failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────
// 2. gradeResults — scheduled 11pm ET daily
// ─────────────────────────────────────────────────────────
exports.gradeResults = functions.pubsub
  .schedule('0 23 * * *')
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const dateStr = getTodayDateStr()
    functions.logger.info(`Grading results for ${dateStr}`)

    const finalScores = await fetchFinalScores(dateStr)
    if (finalScores.length === 0) {
      functions.logger.info(`No final scores available yet for ${dateStr}`)
      return null
    }

    // Build score map: gameId -> { homeScore, awayScore }
    const scoreMap = {}
    for (const g of finalScores) {
      scoreMap[String(g.id)] = {
        homeScore: g.home_team_score,
        awayScore: g.visitor_team_score,
      }
    }

    // Grade the AI picks document
    const picksRef = db.collection('picks').doc(dateStr)
    const picksSnap = await picksRef.get()
    if (picksSnap.exists) {
      const picksData = picksSnap.data()
      const gradedGames = (picksData.games || []).map((game) => {
        const scores = scoreMap[game.id]
        if (!scores || !game.aiPick || !game.aiPickType) return game

        const { homeScore, awayScore } = scores
        let grade = 'PENDING'

        if (game.aiPickType === 'spread') {
          const spread = game.spread || 0
          const homeCover = homeScore + spread - awayScore
          if (homeCover > 0) {
            grade = game.aiPick.includes(game.homeAbbr) ? 'W' : 'L'
          } else if (homeCover < 0) {
            grade = game.aiPick.includes(game.awayAbbr) ? 'W' : 'L'
          } else {
            grade = 'PUSH'
          }
        } else if (game.aiPickType === 'moneyline') {
          const homeWon = homeScore > awayScore
          const pickedHome = game.aiPick.includes(game.homeAbbr)
          grade = homeWon === pickedHome ? 'W' : 'L'
        } else if (game.aiPickType === 'overunder') {
          const total = homeScore + awayScore
          const ou = game.overUnder || 0
          if (total > ou) {
            grade = game.aiPick.toLowerCase().includes('over') ? 'W' : 'L'
          } else if (total < ou) {
            grade = game.aiPick.toLowerCase().includes('under') ? 'W' : 'L'
          } else {
            grade = 'PUSH'
          }
        }

        return { ...game, grade, homeScore, awayScore }
      })

      await picksRef.update({ games: gradedGames, gradedAt: admin.firestore.FieldValue.serverTimestamp() })
    }

    // Grade community picks for this date
    const communitySnap = await db.collection('community')
      .where('grade', '==', 'PENDING')
      .get()

    const batch = db.batch()
    const userUpdates = {}

    for (const postDoc of communitySnap.docs) {
      const post = postDoc.data()
      const scores = scoreMap[post.gameId]
      if (!scores) continue

      const { homeScore, awayScore } = scores
      let grade = 'PENDING'

      // Find the matching game data
      const picksSnap2 = await picksRef.get()
      const gameData = picksSnap2.exists
        ? (picksSnap2.data().games || []).find((g) => g.id === post.gameId)
        : null

      if (!gameData) continue

      if (post.betType === 'spread') {
        const spread = gameData.spread || 0
        const homeCover = homeScore + spread - awayScore
        if (homeCover > 0) {
          grade = post.side.includes(gameData.homeAbbr) ? 'W' : 'L'
        } else if (homeCover < 0) {
          grade = post.side.includes(gameData.awayAbbr) ? 'W' : 'L'
        } else {
          grade = 'PUSH'
        }
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

      if (grade !== 'PENDING') {
        batch.update(postDoc.ref, { grade })

        // Accumulate user stat updates
        if (!userUpdates[post.userId]) {
          userUpdates[post.userId] = { wins: 0, losses: 0, pushes: 0, unitsWon: 0, unitsRisked: 0 }
        }
        const unitsRisked = post.units || 1
        if (grade === 'W') {
          userUpdates[post.userId].wins += 1
          // Calculate units won from American odds
          const odds = post.odds || -110
          const unitsWon = odds > 0 ? (unitsRisked * odds) / 100 : (unitsRisked * 100) / Math.abs(odds)
          userUpdates[post.userId].unitsWon += unitsWon
          userUpdates[post.userId].unitsRisked += unitsRisked
        } else if (grade === 'L') {
          userUpdates[post.userId].losses += 1
          userUpdates[post.userId].unitsWon -= unitsRisked
          userUpdates[post.userId].unitsRisked += unitsRisked
        } else if (grade === 'PUSH') {
          userUpdates[post.userId].pushes += 1
          userUpdates[post.userId].unitsRisked += unitsRisked
        }
      }
    }

    await batch.commit()

    // Update user stats
    for (const [uid, updates] of Object.entries(userUpdates)) {
      const userRef = db.collection('users').doc(uid)
      await userRef.update({
        wins: admin.firestore.FieldValue.increment(updates.wins),
        losses: admin.firestore.FieldValue.increment(updates.losses),
        pushes: admin.firestore.FieldValue.increment(updates.pushes),
        unitsWon: admin.firestore.FieldValue.increment(updates.unitsWon),
        unitsRisked: admin.firestore.FieldValue.increment(updates.unitsRisked),
        totalBets: admin.firestore.FieldValue.increment(updates.wins + updates.losses + updates.pushes),
      })
    }

    functions.logger.info(`Graded results for ${dateStr}. Updated ${Object.keys(userUpdates).length} user profiles.`)
    return null
  })

// ─────────────────────────────────────────────────────────
// 3. postToSocial — HTTP callable
// ─────────────────────────────────────────────────────────
exports.postToSocial = functions.https.onCall(async (data, context) => {
  // Only allow admin users (you can add your UID here)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.')
  }

  const { date: picksDate } = data
  if (!picksDate) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required.')
  }

  const publerApiKey = process.env.PUBLER_API_KEY
  if (!publerApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'PUBLER_API_KEY not configured.')
  }

  const picksSnap = await db.collection('picks').doc(picksDate).get()
  if (!picksSnap.exists) {
    throw new functions.https.HttpsError('not-found', `No picks found for ${picksDate}.`)
  }

  const picksData = picksSnap.data()
  const games = (picksData.games || []).filter((g) => g.aiPick)

  if (games.length === 0) {
    throw new functions.https.HttpsError('not-found', 'No AI picks to post.')
  }

  // Format the social post text
  const dateLabel = new Date(picksDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  let postText = `🏀 NBA Picks - ${dateLabel}\n\n`
  for (const game of games.slice(0, 5)) {
    const confidence = game.aiConfidence ? ` (${game.aiConfidence}%)` : ''
    postText += `• ${game.awayAbbr} @ ${game.homeAbbr}: ${game.aiPick}${confidence}\n`
  }
  postText += `\n📊 Full analysis + community picks: https://nba-picks-community.web.app\n\n#NBA #SportsBetting #NBAPicksToday`

  // Post to Publer
  const publerRes = await fetch('https://api.publer.io/v1/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publerApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: postText,
      schedule_type: 'now',
    }),
  })

  if (!publerRes.ok) {
    const errText = await publerRes.text()
    functions.logger.error('Publer API error:', errText)
    throw new functions.https.HttpsError('internal', 'Failed to post to social media.')
  }

  const publerData = await publerRes.json()
  functions.logger.info('Posted to social media via Publer:', publerData)

  return { success: true, postId: publerData.id, text: postText }
})

// ─────────────────────────────────────────────────────────
// 4. onUserCreate — Auth onCreate trigger
// ─────────────────────────────────────────────────────────
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, displayName, email, photoURL } = user

  functions.logger.info(`New user created: ${uid} (${email})`)

  try {
    await db.collection('users').doc(uid).set({
      uid,
      displayName: displayName || 'Anonymous',
      email: email || null,
      photoURL: photoURL || null,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalBets: 0,
      unitsWon: 0,
      unitsRisked: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    functions.logger.info(`User profile created for ${uid}`)
  } catch (err) {
    functions.logger.error(`Failed to create user profile for ${uid}:`, err)
  }
})
