import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithGoogle as firebaseSignIn, signOut as firebaseSignOut } from '../firebase/auth'
import { getUserProfile, updateUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the app and provides auth state to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Load user profile from Firestore when auth user changes
  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setProfile(null)
      return
    }
    try {
      let prof = await getUserProfile(firebaseUser.uid)
      if (!prof) {
        // Create initial profile if it doesn't exist (fallback — normally onCreate trigger handles this)
        await updateUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName || 'Anonymous',
          photoURL: firebaseUser.photoURL || null,
          email: firebaseUser.email || null,
        })
        prof = await getUserProfile(firebaseUser.uid)
      }
      setProfile(prof)
    } catch (err) {
      console.error('Failed to load user profile:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser)
      await loadProfile(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [loadProfile])

  const signIn = useCallback(async () => {
    setAuthError(null)
    try {
      const result = await firebaseSignIn()
      return result
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthError(null)
    try {
      await firebaseSignOut()
      setUser(null)
      setProfile(null)
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user)
    }
  }, [user, loadProfile])

  const value = {
    user,
    profile,
    loading,
    authError,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth — hook to access auth state and actions.
 * Must be used inside AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
