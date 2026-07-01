import { useState, useEffect } from 'react'
import { useAuthStore, useThemeStore } from '../../store'
import {
  FiHome, FiCompass, FiPlusSquare,
  FiBell, FiUser, FiLogOut, FiMoon, FiSun
} from 'react-icons/fi'
import { NavLink, useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../../api'

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
        <div className="w-12 h-12 rounded-full shadow-lg overflow-hidden" title="EventPulse">
          <svg viewBox="330 300 590 590" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="epSidebarRibbonE" x1="300" y1="380" x2="620" y2="820" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f3e6d8" />
                <stop offset="55%" stopColor="#f3e6d8" />
                <stop offset="100%" stopColor="#8a6a4f" />
              </linearGradient>
              <linearGradient id="epSidebarRibbonP" x1="900" y1="380" x2="580" y2="820" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f3e6d8" />
                <stop offset="55%" stopColor="#f3e6d8" />
                <stop offset="100%" stopColor="#8a6a4f" />
              </linearGradient>
            </defs>

            <rect x="330" y="300" width="590" height="590" fill="#3c2f27" />

            <path
              d="M600 320
                 C 470 320, 355 400, 355 500
                 C 355 545, 385 575, 430 590
                 C 385 605, 355 635, 355 680
                 C 355 780, 470 860, 600 860
                 L 600 790
                 C 500 790, 425 740, 425 685
                 C 425 655, 460 630, 520 615
                 L 520 565
                 C 460 550, 425 525, 425 495
                 C 425 440, 500 390, 600 390
                 Z"
              fill="url(#epSidebarRibbonE)"
            />

            <path
              d="M600 320
                 C 600 320, 600 460, 600 490
                 C 600 545, 645 585, 715 590
                 C 645 595, 600 620, 600 665
                 C 600 700, 600 860, 600 860
                 L 670 860
                 C 670 860, 670 710, 670 680
                 C 670 650, 700 630, 760 625
                 C 830 620, 890 585, 890 530
                 C 890 470, 820 425, 730 415
                 C 700 411, 670 405, 670 380
                 C 670 350, 670 320, 670 320
                 Z"
              fill="url(#epSidebarRibbonP)"
            />

            <path
              d="M520 605 L555 605 L568 585 L582 625 L596 605 L640 605"
              fill="none"
              stroke="#3c2f27"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
            />
          </svg>
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
              `relative flex items-center justify-center w-14 h-14 mx-auto rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:scale-105'
              }`
            }
            title={label}
          >
            <Icon size={26} strokeWidth={2.5} />
            {to === '/notifications' && unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: '#ef4444' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
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