import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, type User } from 'firebase/auth'
import { setAuthToken } from '../api/client'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!!auth)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const token = await u.getIdToken()
        setAuthToken(token)
      } else {
        setAuthToken(null)
      }
      setLoading(false)
    })
  }, [])

  // Refresh token periodically
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const token = await user.getIdToken(true)
      setAuthToken(token)
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const signIn = async () => {
    if (!auth) return
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ hd: 'tarttelin.co.uk' })
    await signInWithPopup(auth, provider)
  }

  const logOut = async () => {
    if (!auth) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
