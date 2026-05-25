import type { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-svh bg-warm-cream">
      <TopNav />
      <main className="flex-1 px-4 pb-24 pt-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
