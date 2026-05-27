import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { loadSettings } from '@/lib/settings-store'
import type { AppUser } from '@/lib/auth-store'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refresh: async () => {} })

function getSessionFromLocal(): { userId: string; email: string } | null {
  try {
    // Read Supabase session from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          const userId = parsed?.user?.id
          const email = parsed?.user?.email
          if (userId) return { userId, email: email || '' }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

async function loadUser(): Promise<AppUser | null> {
  try {
    const local = getSessionFromLocal()
    if (!local) return null

    const { userId, email } = local

    // Get profile via REST (fast, no SDK)
    let profile: any = null
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        profile = data?.[0]
      }
    } catch { /* ignore */ }

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
    Promise.all([loadSettings(), refresh()]).finally(() => {
      setLoading(false)
    })
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
