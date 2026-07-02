import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell, FiUser, FiMoon, FiSun, FiLogOut, FiSettings, FiX } from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../../store'
import { notificationsAPI } from '../../api'

const tabs = [
  { to: '/', icon: FiHome, label: 'Feed' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create' },
  { to: '/notifications', icon: FiBell, label: 'Alerts' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [showMore, setShowMore] = useState(false)
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

  const handleLogout = () => {
    setShowMore(false)
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Floating pill nav — leaves the edges of the page visible instead of a full-width bar */}
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

        {/* Avatar / More button */}
        <button
          onClick={() => setShowMore(true)}
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

      {/* More sheet backdrop */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative w-full rounded-t-2xl p-5 pb-8 flex flex-col gap-2"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />

            {user && (
              <div className="flex items-center gap-3 px-2 pb-3 mb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => { setShowMore(false); navigate('/profile') }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors w-full text-left"
            >
              <FiUser size={20} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Profile</span>
            </button>

            <button
              onClick={() => { setShowMore(false); navigate('/settings') }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors w-full text-left"
            >
              <FiSettings size={20} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Settings</span>
            </button>

            <button
              onClick={() => { toggleTheme(); setShowMore(false) }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors w-full text-left"
            >
              {theme === 'dark'
                ? <FiSun size={20} style={{ color: 'var(--text-secondary)' }} />
                : <FiMoon size={20} style={{ color: 'var(--text-secondary)' }} />}
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
            >
              <FiLogOut size={20} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">Log Out</span>
            </button>

            <button
              onClick={() => setShowMore(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <FiX size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}