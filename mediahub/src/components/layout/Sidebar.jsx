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
        width: '72px',
        zIndex: 40,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center justify-center border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
          M
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`
            }
            title={label}
          >
            <Icon size={22} />
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div
        className="px-2 py-4 border-t space-y-1"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>

        {/* User avatar */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-all duration-200"
            title="Profile"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Logout"
        >
          <FiLogOut size={20} />
        </button>
      </div>
    </aside>
  )
}