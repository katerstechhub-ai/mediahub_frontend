import { NavLink, useNavigate } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store'
import { notificationsAPI } from '../../api'

const tabs = [
  { to: '/', icon: FiHome, label: 'Feed' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create' },
  { to: '/notifications', icon: FiBell, label: 'Alerts' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getAll(1, 1)
        setUnreadCount(res.data?.unreadCount || 0)
      } catch {
        // silent — nav badge isn't worth surfacing an error toast for
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <nav
      className="lg:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between px-2 py-2 rounded-full shadow-lg backdrop-blur-lg"
      style={{
        background: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200"
        >
          {({ isActive }) => (
            <>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200"
                style={{
                  background: isActive ? '#f59e0b' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(245,158,11,0.4)' : 'none',
                }}
              >
                <Icon size={20} color={isActive ? '#ffffff' : 'var(--text-muted)'} strokeWidth={2.5} />
              </div>
              {to === '/notifications' && unreadCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: '#ef4444' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Avatar — goes straight to profile, no sheet */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center justify-center w-11 h-11 rounded-full"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </button>
    </nav>
  )
}