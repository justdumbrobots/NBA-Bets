import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction,
  collectionGroup,
} from 'firebase/firestore'
import { db } from './config'
import { format } from 'date-fns'

/**
 * Get today's AI-generated picks for a specific date.
 * @param {Date|string} date - Date object or string in yyyy-MM-dd format
 * @returns {Promise<{games: Array, generatedAt: any}|null>}
 */
export async function getTodaysPicks(date) {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd')
  const docRef = doc(db, 'picks', dateStr)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Get paginated community feed.
 * @param {number} pageLimit - Number of posts per page
 * @param {import('firebase/firestore').DocumentSnapshot|null} lastDoc - Cursor for pagination
 * @returns {Promise<{posts: Array, lastDoc: DocumentSnapshot|null}>}
 */
export async function getCommunityFeed(pageLimit = 20, lastDoc = null) {
  let q = query(
    collection(db, 'community'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit)
  )
  if (lastDoc) {
    q = query(
      collection(db, 'community'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageLimit)
    )
  }
  const snap = await getDocs(q)
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const nextLastDoc = snap.docs.length === pageLimit ? snap.docs[snap.docs.length - 1] : null
  return { posts, lastDoc: nextLastDoc }
}

/**
 * Get community feed filtered by userId.
 * @param {string} userId
 * @param {number} pageLimit
 * @param {import('firebase/firestore').DocumentSnapshot|null} lastDoc
 * @returns {Promise<{posts: Array, lastDoc: DocumentSnapshot|null}>}
 */
export async function getCommunityFeedByUser(userId, pageLimit = 20, lastDoc = null) {
  let q = query(
    collection(db, 'community'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageLimit)
  )
  if (lastDoc) {
    q = query(
      collection(db, 'community'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageLimit)
    )
  }
  const snap = await getDocs(q)
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const nextLastDoc = snap.docs.length === pageLimit ? snap.docs[snap.docs.length - 1] : null
  return { posts, lastDoc: nextLastDoc }
}

/**
 * Submit a community pick post.
 * @param {string} userId
 * @param {Object} pickData - gameId, betType, side, odds, units, analysis, gameLabel
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export async function submitCommunityPick(userId, pickData) {
  const data = {
    userId,
    gameId: pickData.gameId,
    gameLabel: pickData.gameLabel || '',
    betType: pickData.betType,
    side: pickData.side,
    odds: Number(pickData.odds),
    units: Number(pickData.units),
    analysis: pickData.analysis || '',
    grade: 'PENDING',
    likes: 0,
    createdAt: serverTimestamp(),
  }
  return addDoc(collection(db, 'community'), data)
}

/**
 * Get real-time game thread messages.
 * @param {string} gameId
 * @param {number} msgLimit
 * @returns {Promise<Array>}
 */
export async function getGameThread(gameId, msgLimit = 50) {
  const q = query(
    collection(db, 'threads', gameId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(msgLimit)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Subscribe to real-time game thread messages.
 * @param {string} gameId
 * @param {function} callback
 * @returns {function} unsubscribe
 */
export function subscribeToGameThread(gameId, callback) {
  const q = query(
    collection(db, 'threads', gameId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(messages)
  })
}

/**
 * Post a message to a game thread.
 * @param {string} gameId
 * @param {string} userId
 * @param {string} text
 * @param {string} displayName
 * @param {string|null} photoURL
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export async function postMessage(gameId, userId, text, displayName, photoURL = null) {
  return addDoc(collection(db, 'threads', gameId, 'messages'), {
    userId,
    displayName,
    photoURL: photoURL || null,
    text: text.trim(),
    gameId,
    createdAt: serverTimestamp(),
  })
}

/**
 * Get a user's profile document.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Update a user's profile data.
 * @param {string} uid
 * @param {Object} data
 */
export async function updateUserProfile(uid, data) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, {
      uid,
      wins: 0,
      losses: 0,
      pushes: 0,
      unitsWon: 0,
      totalBets: 0,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

/**
 * Get leaderboard - top users by unitsWon.
 * @param {number} leaderLimit
 * @returns {Promise<Array>}
 */
export async function getLeaderboard(leaderLimit = 50) {
  const q = query(
    collection(db, 'users'),
    orderBy('unitsWon', 'desc'),
    limit(leaderLimit)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Submit or update a vote for a game bet type.
 * voteId = {gameId}_{betType}_{userId} (upsert pattern)
 * @param {string} gameId
 * @param {string} betType - 'spread' | 'moneyline' | 'overunder'
 * @param {string} side - the chosen side label
 * @param {string} userId
 */
export async function submitVote(gameId, betType, side, userId) {
  const voteId = `${gameId}_${betType}_${userId}`
  const voteRef = doc(db, 'votes', voteId)
  const aggregateRef = doc(db, 'voteAggregates', `${gameId}_${betType}`)

  await runTransaction(db, async (tx) => {
    const existingVote = await tx.get(voteRef)
    const existingAggregate = await tx.get(aggregateRef)

    const aggregateData = existingAggregate.exists() ? existingAggregate.data() : {}

    if (existingVote.exists()) {
      const oldSide = existingVote.data().side
      if (oldSide === side) {
        // Toggle off — remove vote
        tx.delete(voteRef)
        const newCount = Math.max(0, (aggregateData[oldSide] || 1) - 1)
        tx.set(aggregateRef, { ...aggregateData, [oldSide]: newCount }, { merge: true })
        return
      }
      // Switch vote
      tx.set(voteRef, { userId, gameId, betType, side, updatedAt: serverTimestamp() }, { merge: true })
      const oldCount = Math.max(0, (aggregateData[oldSide] || 1) - 1)
      const newCount = (aggregateData[side] || 0) + 1
      tx.set(aggregateRef, { ...aggregateData, [oldSide]: oldCount, [side]: newCount, gameId, betType }, { merge: true })
    } else {
      // New vote
      tx.set(voteRef, { userId, gameId, betType, side, createdAt: serverTimestamp() })
      const newCount = (aggregateData[side] || 0) + 1
      tx.set(aggregateRef, { ...aggregateData, [side]: newCount, gameId, betType }, { merge: true })
    }
  })
}

/**
 * Get vote counts for a game/betType combination.
 * @param {string} gameId
 * @returns {Promise<Object>} map of betType -> {sideA: count, sideB: count}
 */
export async function getVoteCounts(gameId) {
  const betTypes = ['spread', 'moneyline', 'overunder']
  const results = {}
  await Promise.all(
    betTypes.map(async (betType) => {
      const snap = await getDoc(doc(db, 'voteAggregates', `${gameId}_${betType}`))
      results[betType] = snap.exists() ? snap.data() : {}
    })
  )
  return results
}

/**
 * Subscribe to vote aggregate counts for a game.
 * @param {string} gameId
 * @param {function} callback - called with {spread: {...}, moneyline: {...}, overunder: {...}}
 * @returns {function} unsubscribe
 */
export function subscribeToVoteCounts(gameId, callback) {
  const betTypes = ['spread', 'moneyline', 'overunder']
  const data = {}
  const unsubscribers = betTypes.map((betType) => {
    return onSnapshot(doc(db, 'voteAggregates', `${gameId}_${betType}`), (snap) => {
      data[betType] = snap.exists() ? snap.data() : {}
      callback({ ...data })
    })
  })
  return () => unsubscribers.forEach((unsub) => unsub())
}

/**
 * Get the current user's vote for a specific game/betType.
 * @param {string} gameId
 * @param {string} betType
 * @param {string} userId
 * @returns {Promise<string|null>} the voted side or null
 */
export async function getUserVote(gameId, betType, userId) {
  const voteId = `${gameId}_${betType}_${userId}`
  const snap = await getDoc(doc(db, 'votes', voteId))
  if (!snap.exists()) return null
  return snap.data().side
}

/**
 * Toggle like on a community post.
 * @param {string} postId
 * @param {string} userId
 * @param {boolean} isLiked - current liked state
 */
export async function toggleLike(postId, userId, isLiked) {
  const postRef = doc(db, 'community', postId)
  const likeRef = doc(db, 'community', postId, 'likes', userId)

  await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef)
    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likes: increment(-1) })
    } else {
      tx.set(likeRef, { userId, createdAt: serverTimestamp() })
      tx.update(postRef, { likes: increment(1) })
    }
  })
}

/**
 * Check if a user has liked a post.
 * @param {string} postId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasUserLiked(postId, userId) {
  const snap = await getDoc(doc(db, 'community', postId, 'likes', userId))
  return snap.exists()
}
