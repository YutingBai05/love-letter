import { Navigate } from 'react-router-dom'
import { getSession } from '@/lib/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = getSession()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
