import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useThemeStore } from '../../store'
import {
  FiHome, FiCompass, FiPlusSquare,
  FiBell, FiUser, FiLogOut, FiLogIn, FiMoon, FiSun
} from 'react-icons/fi'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { notificationsAPI } from '../../api'

const navItems = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create', authOnly: true },
  { to: '/notifications', icon: FiBell, label: 'Notifications', authOnly: true },
  { to: '/profile', icon: FiUser, label: 'Profile', authOnly: true },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [unreadCount, setUnreadCount] = useState(0)

  const visibleNavItems = navItems.filter((item) => !item.authOnly || user)

  useEffect(() => {
    if (!user) return

    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getAll(1, 1)
        setUnreadCount(res.data?.unreadCount || 0)
      } catch {
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActiveTab = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col pointer-events-auto"
      style={{
        width: '84px',
        zIndex: 100,
        background: 'color-mix(in srgb, var(--bg-primary) 94%, transparent)',
        backdropFilter: 'saturate(140%) blur(18px)',
        WebkitBackdropFilter: 'saturate(140%) blur(18px)',
        borderRight: '1px solid color-mix(in srgb, var(--border) 82%, transparent)',
        boxShadow: '4px 0 24px rgba(15,23,42,0.05)',
      }}
    >
      {/* Minimal Apple-style rail identity — no logo artwork */}
      <div className="flex h-20 items-center justify-center border-b" style={{ borderColor: 'color-mix(in srgb, var(--border) 82%, transparent)' }}>
        <div className="flex flex-col items-center gap-1.5" aria-label="Memories">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Memories</span>
        </div>
      </div>

      {/* Navigation */}
      <motion.nav
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
        }}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-6"
      >
        {visibleNavItems.map(({ to, icon: Icon, label }) => {
          const active = isActiveTab(to)
          return (
            <motion.div
              key={to}
              variants={{
                hidden: { opacity: 0, x: -16 },
                show: { opacity: 1, x: 0 },
              }}
            >
              <NavLink
                to={to}
                end={to === '/'}
                title={label}
                className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.88 }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                >
                  {active && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, #f59e0b 16%, var(--bg-secondary))',
                        border: '1px solid color-mix(in srgb, #f59e0b 38%, transparent)',
                        boxShadow: '0 6px 16px rgba(15,23,42,0.08)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={26}
                    strokeWidth={2.5}
                    className="pointer-events-none relative z-10"
                    color={active ? '#d97706' : 'var(--text-secondary)'}
                  />
                  <AnimatePresence>
                    {to === '/notifications' && unreadCount > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-20"
                        style={{ background: '#ef4444' }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </NavLink>
            </motion.div>
          )
        })}
      </motion.nav>

      {/* Bottom actions */}
      <div
        className="mx-2 mb-3 space-y-1 rounded-3xl border p-2"
        style={{ borderColor: 'var(--glass-border, var(--border))' }}
      >
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.88 }}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {theme === 'dark' ? <FiSun size={24} strokeWidth={2.5} /> : <FiMoon size={24} strokeWidth={2.5} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {user && (
          <motion.button
            onClick={() => navigate('/profile')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl transition-colors hover:bg-[var(--bg-primary)]"
            title="Profile"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
                style={{ boxShadow: '0 0 0 2px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.2)' }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-base font-bold"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              >
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </motion.button>
        )}

        {user ? (
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Logout"
          >
            <FiLogOut size={24} strokeWidth={2.5} />
          </motion.button>
        ) : (
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20"
            title="Login"
          >
            <FiLogIn size={24} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
    </aside>
  )
}
