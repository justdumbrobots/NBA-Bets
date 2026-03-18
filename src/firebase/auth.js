import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('profile')
googleProvider.addScope('email')
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

/**
 * Sign in with Google via popup.
 * Returns the UserCredential on success.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result
  } catch (error) {
    // Handle specific auth errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please try again.')
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site.')
    }
    if (error.code === 'auth/cancelled-popup-request') {
      // Silently ignore — another popup was already open
      return null
    }
    throw error
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 * @param {function} callback - Called with (user | null)
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback)
}

/**
 * Get the current user synchronously.
 */
export function getCurrentUser() {
  return auth.currentUser
}
