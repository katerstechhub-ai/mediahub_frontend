import { useAuthStore, useThemeStore } from '../../store'
import {
  FiHome, FiCompass, FiPlusSquare,
  FiBell, FiUser, FiLogOut, FiMoon, FiSun
} from 'react-icons/fi'
import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create' },
  { to: '/notifications', icon: FiBell, label: 'Notifications' },
  { to: '/profile', icon: FiUser, label: 'Profile' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col"
      style={{
        width: '84px',
        zIndex: 40,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-20 flex items-center justify-center border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-amber-500/30">
          M
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-center w-14 h-14 mx-auto rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:scale-105'
              }`
            }
            title={label}
          >
            <Icon size={26} strokeWidth={2.5} />
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div
        className="px-3 py-5 border-t space-y-3"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-14 h-14 mx-auto flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:scale-105 text-[var(--text-secondary)]"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <FiSun size={24} strokeWidth={2.5} /> : <FiMoon size={24} strokeWidth={2.5} />}
        </button>

        {/* User avatar */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="w-14 h-14 mx-auto flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] hover:scale-105 transition-all duration-200"
            title="Profile"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-amber-500/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-base font-bold shadow-md">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-14 h-14 mx-auto flex items-center justify-center rounded-full transition-all duration-200 text-red-500 hover:bg-red-50 hover:scale-105 dark:hover:bg-red-900/20"
          title="Logout"
        >
          <FiLogOut size={24} strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  )
}