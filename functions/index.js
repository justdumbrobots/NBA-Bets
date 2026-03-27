'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')
const predictor = require('./predictor')

admin.initializeApp()
const db = admin.firestore()

// ─────────────────────────────────────────────────────────
// Date helpers (Eastern Time)
// ─────────────────────────────────────────────────────────

function getDateStrET(offsetDays = 0) {
  const etStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (offsetDays === 0) return etStr
  const d = new Date(etStr + 'T12:00:00')
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

const getTodayET = () => getDateStrET(0)
const getTomorrowET = () => getDateStrET(1)

// ─────────────────────────────────────────────────────────
// Core: generate picks for a date (NBA or NCAA)
// ─────────────────────────────────────────────────────────

/**
 * @param {string}  dateStr  - yyyy-MM-dd
 * @param {Object}  sport    - predictor.sports.nba | predictor.sports.ncaa
 * @param {boolean} force    - overwrite existing picks
 * @param {string}  collection - Firestore collection name (e.g. 'picks', 'ncaa_picks')
 */
async function generatePicksForDate(dateStr, sport, force = false, collection = 'picks') {
  functions.logger.info(`[${sport.SPORT_LABEL}] Generating picks for ${dateStr} (force=${force})`)

  if (!force) {
    const existing = await db.collection(collection).doc(dateStr).get()
    if (existing.exists) {
      functions.logger.info(`[${sport.SPORT_LABEL}] Picks already exist for ${dateStr}, skipping.`)
      return { skipped: true }
    }
  }

  const oddsApiKey = process.env.ODDS_API_KEY
  const claudeApiKey = process.env.CLAUDE_API_KEY

  let games = []
  let requestsRemaining = 'unknown'
  try {
    const result = await predictor.fetchGames(sport, dateStr, oddsApiKey)
    games = result.games
    requestsRemaining = result.requestsRemaining
    functions.logger.info(`[${sport.SPORT_LABEL}] ${games.length} games fetched. API requests remaining: ${requestsRemaining}`)
  } catch (err) {
    functions.logger.error(`[${sport.SPORT_LABEL}] Failed to fetch games: ${err.message}`)
    games = []
  }

  if (games.length === 0) {
    await db.collection(collection).doc(dateStr).set({
      date: dateStr,
      sport: sport.SPORT_LABEL,
      games: [],
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      message: 'No games scheduled.',
    })
    return { gameCount: 0, message: 'No games scheduled.' }
  }

  const gamesWithPicks = await Promise.all(
    games.map(async (game) => {
      const homeAbbr = game.home_team.abbreviation
      const awayAbbr = game.visitor_team.abbreviation

      const gameData = {
        id: String(game.id),
        homeTeam: game.home_team.full_name,
        awayTeam: game.visitor_team.full_name,
        homeAbbr,
        awayAbbr,
        gameTime: game.datetime || `${dateStr}T00:00:00Z`,
        spread: game.spread ?? null,
        spreadHome: game.spread != null ? `${homeAbbr} ${game.spread > 0 ? '+' : ''}${game.spread}` : null,
        spreadAway: game.spread != null ? `${awayAbbr} ${game.spread < 0 ? '+' : ''}${-game.spread}` : null,
        moneylineHome: game.moneylineHome ?? null,
        moneylineAway: game.moneylineAway ?? null,
        overUnder: game.overUnder ?? null,
        aiPickType: null,
        aiPick: null,
        aiConfidence: null,
        aiAnalysis: null,
      }

      try {
        const aiResult = await predictor.analyzePick(game, sport.SPORT_LABEL, claudeApiKey)
        return {
          ...gameData,
          aiPickType: aiResult.aiPickType || null,
          aiPick: aiResult.aiPick || null,
          aiConfidence: aiResult.aiConfidence || null,
          aiAnalysis: aiResult.aiAnalysis || null,
        }
      } catch (err) {
        functions.logger.warn(`[${sport.SPORT_LABEL}] AI pick failed for game ${game.id}: ${err.message}`)
        return gameData
      }
    })
  )

  await db.collection(collection).doc(dateStr).set({
    date: dateStr,
    sport: sport.SPORT_LABEL,
    games: gamesWithPicks,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    gameCount: gamesWithPicks.length,
  })

  functions.logger.info(`[${sport.SPORT_LABEL}] Generated picks for ${gamesWithPicks.length} games on ${dateStr}`)
  return { gameCount: gamesWithPicks.length }
}

// ─────────────────────────────────────────────────────────
// Core: grade results for a date
// ─────────────────────────────────────────────────────────

async function gradeResultsForDate(dateStr, sport, collection = 'picks') {
  functions.logger.info(`[${sport.SPORT_LABEL}] Grading results for ${dateStr}`)

  let finalScores
  try {
    finalScores = await predictor.fetchFinalScores(sport, dateStr, process.env.ODDS_API_KEY)
  } catch (err) {
    functions.logger.error(`[${sport.SPORT_LABEL}] Failed to fetch final scores: ${err.message}`)
    return
  }

  if (finalScores.length === 0) {
    functions.logger.info(`[${sport.SPORT_LABEL}] No final scores available for ${dateStr}`)
    return
  }

  const scoreMap = {}
  for (const g of finalScores) {
    scoreMap[String(g.id)] = { homeScore: g.home_team_score, awayScore: g.visitor_team_score }
  }

  // Grade AI picks
  const picksRef = db.collection(collection).doc(dateStr)
  const picksSnap = await picksRef.get()
  if (picksSnap.exists) {
    const gradedGames = (picksSnap.data().games || []).map((game) => {
      const scores = scoreMap[game.id]
      const grade = predictor.gradeAIPick(game, scores)
      if (grade === 'PENDING') return game
      return { ...game, grade, homeScore: scores.homeScore, awayScore: scores.awayScore }
    })
    await picksRef.update({ games: gradedGames, gradedAt: admin.firestore.FieldValue.serverTimestamp() })
  }

  // Grade community picks (NBA collection only — community picks reference NBA game IDs)
  if (collection !== 'picks') return

  const communitySnap = await db.collection('community').where('grade', '==', 'PENDING').get()
  const batch = db.batch()
  const userUpdates = {}

  // Cache the picks doc to avoid re-fetching per post
  const picksData = (await picksRef.get()).data() || {}
  const gamesById = Object.fromEntries((picksData.games || []).map((g) => [g.id, g]))

  for (const postDoc of communitySnap.docs) {
    const post = postDoc.data()
    const scores = scoreMap[post.gameId]
    const gameData = gamesById[post.gameId]
    if (!scores || !gameData) continue

    const { grade, unitsWon, unitsRisked } = predictor.gradeCommunityPick(post, gameData, scores)
    if (grade === 'PENDING') continue

    batch.update(postDoc.ref, { grade })

    if (!userUpdates[post.userId]) {
      userUpdates[post.userId] = { wins: 0, losses: 0, pushes: 0, unitsWon: 0, unitsRisked: 0 }
    }
    const u = userUpdates[post.userId]
    if (grade === 'W') u.wins += 1
    else if (grade === 'L') u.losses += 1
    else if (grade === 'PUSH') u.pushes += 1
    u.unitsWon += unitsWon
    u.unitsRisked += unitsRisked
  }

  await batch.commit()

  for (const [uid, updates] of Object.entries(userUpdates)) {
    await db.collection('users').doc(uid).update({
      wins: admin.firestore.FieldValue.increment(updates.wins),
      losses: admin.firestore.FieldValue.increment(updates.losses),
      pushes: admin.firestore.FieldValue.increment(updates.pushes),
      unitsWon: admin.firestore.FieldValue.increment(updates.unitsWon),
      unitsRisked: admin.firestore.FieldValue.increment(updates.unitsRisked),
      totalBets: admin.firestore.FieldValue.increment(updates.wins + updates.losses + updates.pushes),
    })
  }

  functions.logger.info(`[${sport.SPORT_LABEL}] Graded ${dateStr}. Updated ${Object.keys(userUpdates).length} user profiles.`)
}

// ─────────────────────────────────────────────────────────
// 1. NBA: generateDailyPicks — 8am, 12pm, 6pm ET
// ─────────────────────────────────────────────────────────

exports.generateDailyPicks = functions.pubsub
  .schedule('0 8,12,18 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    const today = getTodayET()
    const tomorrow = getTomorrowET()
    await generatePicksForDate(today, predictor.sports.nba, true, 'picks')
    await generatePicksForDate(tomorrow, predictor.sports.nba, false, 'picks')
    return null
  })

// ─────────────────────────────────────────────────────────
// 2. NCAA: generateNCAADailyPicks — 11am, 1pm, 5pm ET
//    (tournament/late-season games tend to tip earlier)
// ─────────────────────────────────────────────────────────

exports.generateNCAADailyPicks = functions.pubsub
  .schedule('0 11,13,17 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    const today = getTodayET()
    const tomorrow = getTomorrowET()
    await generatePicksForDate(today, predictor.sports.ncaa, true, 'ncaa_picks')
    await generatePicksForDate(tomorrow, predictor.sports.ncaa, false, 'ncaa_picks')
    return null
  })

// ─────────────────────────────────────────────────────────
// 3. HTTP trigger: manually generate picks for any sport/date
//    POST /triggerPicksGeneration
//    Body: { date?: "yyyy-MM-dd", sport?: "nba"|"ncaa", force?: boolean }
// ─────────────────────────────────────────────────────────

exports.triggerPicksGeneration = functions.https.onRequest(async (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && req.headers['x-admin-key'] !== adminSecret) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const dateStr = req.body?.date || getTodayET()
  const sportKey = req.body?.sport || 'nba'
  const force = req.body?.force === true

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    res.status(400).json({ error: 'Invalid date format. Use yyyy-MM-dd.' })
    return
  }

  const sport = predictor.sports[sportKey]
  if (!sport) {
    res.status(400).json({ error: `Unknown sport "${sportKey}". Use "nba" or "ncaa".` })
    return
  }

  const collection = sportKey === 'ncaa' ? 'ncaa_picks' : 'picks'

  try {
    const result = await generatePicksForDate(dateStr, sport, force, collection)
    res.json({ date: dateStr, sport: sport.SPORT_LABEL, ...result })
  } catch (err) {
    functions.logger.error('triggerPicksGeneration failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────
// 4. NBA: gradeResults — 11pm ET
// ─────────────────────────────────────────────────────────

exports.gradeResults = functions.pubsub
  .schedule('0 23 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    await gradeResultsForDate(getTodayET(), predictor.sports.nba, 'picks')
    return null
  })

// ─────────────────────────────────────────────────────────
// 5. NCAA: gradeNCAAResults — 1am ET (games finish later)
// ─────────────────────────────────────────────────────────

exports.gradeNCAAResults = functions.pubsub
  .schedule('0 1 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    // Grade yesterday's NCAA games (1am ET = after all games finish)
    const yesterday = getDateStrET(-1)
    await gradeResultsForDate(yesterday, predictor.sports.ncaa, 'ncaa_picks')
    return null
  })

// ─────────────────────────────────────────────────────────
// 6. postToSocial — HTTP callable (authenticated)
// ─────────────────────────────────────────────────────────

exports.postToSocial = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.')
  }

  const { date: picksDate, sport: sportKey = 'nba' } = data
  if (!picksDate) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required.')
  }

  const publerApiKey = process.env.PUBLER_API_KEY
  if (!publerApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'PUBLER_API_KEY not configured.')
  }

  const collection = sportKey === 'ncaa' ? 'ncaa_picks' : 'picks'
  const sport = predictor.sports[sportKey] || predictor.sports.nba

  const picksSnap = await db.collection(collection).doc(picksDate).get()
  if (!picksSnap.exists) {
    throw new functions.https.HttpsError('not-found', `No ${sport.SPORT_LABEL} picks found for ${picksDate}.`)
  }

  const games = (picksSnap.data().games || []).filter((g) => g.aiPick)
  if (games.length === 0) {
    throw new functions.https.HttpsError('not-found', 'No AI picks to post.')
  }

  const dateLabel = new Date(picksDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  const emoji = sportKey === 'ncaa' ? '🏀' : '🏀'
  let postText = `${emoji} ${sport.SPORT_LABEL} Picks - ${dateLabel}\n\n`
  for (const game of games.slice(0, 5)) {
    const confidence = game.aiConfidence ? ` (${game.aiConfidence}%)` : ''
    postText += `• ${game.awayAbbr} @ ${game.homeAbbr}: ${game.aiPick}${confidence}\n`
  }
  postText += `\n📊 Full analysis + community picks: https://coverkingsbets.com\n\n#${sport.SPORT_LABEL} #SportsBetting`

  const publerRes = await fetch('https://api.publer.io/v1/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${publerApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: postText, schedule_type: 'now' }),
  })

  if (!publerRes.ok) {
    functions.logger.error('Publer API error:', await publerRes.text())
    throw new functions.https.HttpsError('internal', 'Failed to post to social media.')
  }

  const publerData = await publerRes.json()
  return { success: true, postId: publerData.id, text: postText }
})

// ─────────────────────────────────────────────────────────
// 7. onUserCreate — Auth onCreate trigger
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
      wins: 0, losses: 0, pushes: 0,
      totalBets: 0, unitsWon: 0, unitsRisked: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (err) {
    functions.logger.error(`Failed to create user profile for ${uid}:`, err)
  }
})
