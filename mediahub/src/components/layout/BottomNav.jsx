import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell, FiLogIn } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useUIStore } from '../../store'
import { notificationsAPI } from '../../api'

const allTabs = [
  { to: '/', icon: FiHome, label: 'Feed' },
  { to: '/explore', icon: FiCompass, label: 'Explore' },
  { to: '/create', icon: FiPlusSquare, label: 'Create', authOnly: true },
  { to: '/notifications', icon: FiBell, label: 'Alerts', authOnly: true },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const setBottomNavHeight = useUIStore((s) => s.setBottomNavHeight)
  const [unreadCount, setUnreadCount] = useState(0)
  const outerRef = useRef(null)

  const visibleTabs = allTabs.filter((t) => !t.authOnly || user)

  // Measure height for layout offset
  useEffect(() => {
    const el = outerRef.current
    if (!el || typeof window === 'undefined') return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const bottomOffset = window.innerHeight - rect.bottom
      setBottomNavHeight(rect.height + Math.max(bottomOffset, 0))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [visibleTabs.length, setBottomNavHeight])

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getAll(1, 1)
        setUnreadCount(res.data?.unreadCount || 0)
      } catch { }
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 30000)
    return () => clearInterval(id)
  }, [user])

  const isActiveTab = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  const handleAvatarClick = () => {
    if (!user) {
      navigate('/login')
    } else {
      navigate('/profile')
    }
  }

  return createPortal(
    <motion.div
      ref={outerRef}
      className="lg:hidden fixed z-50 flex justify-center"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex items-center gap-1 p-1.5 rounded-full backdrop-blur-2xl"
        style={{
          background: 'color-mix(in oklab, var(--background) 70%, transparent)',
          border: '1px solid color-mix(in oklab, var(--border) 80%, transparent)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* All tabs always visible */}
        {visibleTabs.map(({ to, icon: Icon, label }) => {
          const active = isActiveTab(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={label}
              className="relative flex items-center justify-center w-11 h-11 rounded-full"
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                    boxShadow: '0 6px 18px rgba(245,158,11,0.45)',
                  }}
                />
              )}
              <Icon
                size={20}
                color={active ? '#fff' : 'var(--text-muted)'}
                strokeWidth={2.5}
                style={{ position: 'relative', zIndex: 1 }}
              />
              {to === '/notifications' && unreadCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-20"
                  style={{ background: '#ef4444', boxShadow: '0 0 0 2px var(--background)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          )
        })}

        {/* Avatar / Profile tab – always visible, always goes to profile */}
        <motion.button
          onClick={handleAvatarClick}
          whileTap={{ scale: 0.9 }}
          aria-label={user ? 'Profile' : 'Sign in'}
          className="relative flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
          style={{
            background: 'transparent',
          }}
        >
          {user ? (
            user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Profile'}
                className="w-9 h-9 rounded-full object-cover"
                style={{ boxShadow: '0 0 0 2px rgba(245,158,11,0.6)' }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
            >
              <FiLogIn size={16} color="#fff" strokeWidth={2.5} />
            </div>
          )}
        </motion.button>
      </motion.nav>
    </motion.div>,
    document.body
  )
}