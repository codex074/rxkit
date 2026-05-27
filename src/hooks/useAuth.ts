import { useState, useEffect } from 'react'
import { onAuthChanged } from '../firebase/auth'
import { getUserProfile } from '../firebase/firestore'
import { isFirebaseConfigured } from '../firebase/config'
import type { UserProfile } from '../types/user'

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isFirebaseConfigured()

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    try {
      const unsubscribe = onAuthChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid)
          setUser(profile && profile.active ? profile : null)
        } else {
          setUser(null)
        }
        setLoading(false)
      })
      return unsubscribe
    } catch {
      setLoading(false)
    }
  }, [configured])

  return { user, loading, configured }
}
