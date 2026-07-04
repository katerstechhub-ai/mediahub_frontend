import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useUIStore } from '../../store'
import { notificationsAPI } from '../../api'

const tabs = [
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

  const visibleTabs = tabs.filter((tab) => !tab.authOnly || user)

  // Measure the nav's real on-screen footprint (its own height + how far it
  // sits off the bottom edge) and publish it to uiStore. Anything reading
  // that value gets the true number instead of a hardcoded guess, so it
  // can't drift out of sync if the pill's size or bottom offset changes.
  useEffect(() => {
    const el = outerRef.current
    if (!el || typeof window === 'undefined') return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const bottomOffset = window.innerHeight - rect.bottom
      const footprint = rect.height + Math.max(bottomOffset, 0)
      setBottomNavHeight(footprint)
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

  useEffect(() => {
    if (!user) return // guests have nothing to fetch notifications for

    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getAll(1, 1)
        setUnreadCount(res.data?.unreadCount || 0)
      } catch {
        // silent — nav badge isn't worth surfacing an error toast for
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const isActiveTab = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  // Calculate spacing based on number of items
  const getJustifyClass = () => {
    const count = visibleTabs.length + 1 // +1 for avatar
    if (count <= 3) return 'justify-center gap-8'
    if (count === 4) return 'justify-evenly'
    return 'justify-between'
  }

  return createPortal(
    // Rendered via a portal directly into document.body — NOT nested inside
    // Layout's flex/overflow hierarchy. iOS Safari can render `position:
    // fixed` elements incorrectly (jittering, disappearing behind content
    // mid-scroll) purely as a function of DOM nesting depth inside flex/
    // overflow containers, even when no single CSS property is provably
    // "at fault." Portaling out is the reliable fix: BottomNav is now a
    // direct child of <body>, so nothing in Layout can affect it, ever.
    //
    // The plain, never-transformed div still carries `fixed` positioning;
    // the animated transform still lives on the motion.nav inside it, kept
    // off the positioned element itself for the same reason as before.
    <div
      ref={outerRef}
      className="lg:hidden fixed left-4 right-4 z-50"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex items-center px-4 py-2 rounded-full shadow-lg backdrop-blur-lg bottom-nav-panel"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div className={`flex items-center w-full ${getJustifyClass()}`}>
        {visibleTabs.map(({ to, icon: Icon, label }) => {
          const active = isActiveTab(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="relative flex items-center justify-center w-11 h-11 rounded-full"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative flex items-center justify-center w-11 h-11 rounded-full"
              >
                {active && (
                  <motion.div
                    layoutId="bottomNavActivePill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: '#f59e0b', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative z-10"
                >
                  <Icon size={20} color={active ? '#ffffff' : 'var(--text-muted)'} strokeWidth={2.5} />
                </motion.div>

                <AnimatePresence>
                  {to === '/notifications' && unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-20"
                      style={{ background: '#ef4444' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          )
        })}

        {/* Avatar — goes straight to profile if logged in, otherwise prompts login */}
        <motion.button
          onClick={() => navigate(user ? '/profile' : '/login')}
          whileTap={{ scale: 0.85 }}
          className="flex items-center justify-center w-11 h-11 rounded-full flex-shrink-0"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </motion.button>
        </div>
      </motion.nav>
    </div>,
    document.body
  )
}