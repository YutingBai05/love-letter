import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Mail, PenLine, Library, MessageCircle, Settings } from 'lucide-react'
import { getUnreadCount, getLetterUnreadCount } from '@/lib/store'
import { getSession } from '@/lib/auth-store'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/editor/postcard', icon: Mail, label: '明信片' },
  { to: '/editor/letter', icon: PenLine, label: '信封' },
  { to: '/library', icon: Library, label: '文库' },
  { to: '/qa', icon: MessageCircle, label: '问答' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export function BottomNav() {
  const [unread, setUnread] = useState(0)
  const location = useLocation()

  useEffect(() => {
    setUnread(getUnreadCount() + getLetterUnreadCount())
    const interval = setInterval(
      () => setUnread(getUnreadCount() + getLetterUnreadCount()),
      3000
    )
    return () => clearInterval(interval)
  }, [location])

  const user = getSession()
  if (!user) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-warm-cream/95 backdrop-blur border-t border-warm-beige">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-rose'
                  : 'text-warm-gray hover:text-ink-brown'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            <span className="text-[11px]">{label}</span>
            {to === '/' && unread > 0 && (
              <span className="absolute -top-0.5 right-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
