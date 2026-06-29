import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell, FiUser, FiMoon, FiSun, FiLogOut, FiSettings, FiX } from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../../store'

const tabs = [
  { to: '/', icon: FiHome, label: 'Feed' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create' },
  { to: '/notifications', icon: FiBell, label: 'Alerts' },
  { to: '/profile', icon: FiUser, label: 'Profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [showMore, setShowMore] = useState(false)

  const handleLogout = () => {
    setShowMore(false)
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center py-3 gap-0.5"
          >
            {({ isActive }) => (
              <>
                <Icon size={22} color={isActive ? '#f59e0b' : 'var(--text-muted)'} />
                <span className="text-[10px]" style={{ color: isActive ? '#f59e0b' : 'var(--text-muted)' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center py-3 gap-0.5"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>More</span>
        </button>
      </nav>

      {/* More sheet backdrop */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end"
          onClick={() => setShowMore(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full rounded-t-2xl p-5 pb-8 flex flex-col gap-2"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />

            {/* User info */}
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

            {/* Settings */}
            <button
              onClick={() => { setShowMore(false); navigate('/settings') }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors w-full text-left"
            >
              <FiSettings size={20} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Settings</span>
            </button>

            {/* Theme toggle */}
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

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
            >
              <FiLogOut size={20} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">Log Out</span>
            </button>

            {/* Close */}
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