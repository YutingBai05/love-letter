import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { loadSettings } from '@/lib/settings-store'
import type { AppUser } from '@/lib/auth-store'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refresh: async () => {} })

async function loadUser(): Promise<AppUser | null> {
  try {
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    const raceResult = await Promise.race([sessionPromise, timeoutPromise])

    if (!raceResult) {
      console.warn('[Auth] getSession timed out')
      return null
    }

    const session = raceResult.data.session
    if (!session?.user?.id) return null

    const userId = session.user.id
    const email = session.user.email || ''

    // Try to get profile, but don't fail if it's missing
    let profile = null
    try {
      const profilePromise = supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      const profileResult = await Promise.race([profilePromise, profileTimeout])
      profile = profileResult?.data
    } catch {
      // profile query failed, continue without it
    }

    console.log('[Auth] User loaded:', email, profile ? '(profile found)' : '(no profile)')

    return {
      id: userId,
      email: profile?.email || email,
      nickname: profile?.nickname || email.split('@')[0],
      role: (profile?.role as 'owner' | 'invitee') || 'owner',
      pairedWith: profile?.paired_with || null,
    }
  } catch (e) {
    console.error('[Auth] loadUser error:', e)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const u = await loadUser()
    setUser(u)
  }

  useEffect(() => {
    // Load settings from Supabase
    loadSettings()

    // Force stop loading after 5 seconds max
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    refresh().finally(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      console.log('[Auth] State change:', event)
      const u = await loadUser()
      setUser(u)
    })

    return () => {
      clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
