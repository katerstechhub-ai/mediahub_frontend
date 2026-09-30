import { useNavigate, useLocation } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell, FiLogIn } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAuthStore, useUIStore } from '../../store'
import { notificationsAPI } from '../../api'
import { onNotificationsChanged, disconnectSocket } from '../../lib/notificationSocket'

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
  const userId = user?._id || user?.id
  const setBottomNavHeight = useUIStore((state) => state.setBottomNavHeight)
  const [unreadCount, setUnreadCount] = useState(0)
  const outerRef = useRef(null)
  const visibleTabs = allTabs.filter((tab) => !tab.authOnly || user)

  useEffect(() => {
    const element = outerRef.current
    if (!element || typeof window === 'undefined') return undefined

    const measure = () => {
      const rect = element.getBoundingClientRect()
      const bottomOffset = window.innerHeight - rect.bottom
      setBottomNavHeight(rect.height + Math.max(bottomOffset, 0))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [setBottomNavHeight, visibleTabs.length])

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      disconnectSocket()
      return undefined
    }
    const fetchUnread = async () => {
      try {
        const response = await notificationsAPI.getAll(1, 1)
        setUnreadCount(response.data?.unreadCount || 0)
      } catch {
        // Keep the last known count if the request fails.
      }
    }
    fetchUnread()

    // Instant updates via socket; polling stays as a slow fallback.
    const unsubscribe = onNotificationsChanged(fetchUnread)
    const intervalId = window.setInterval(fetchUnread, 60000)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
    }
  }, [userId])

  const isActiveTab = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  const handleTabClick = (to, event) => {
    event.preventDefault()
    event.stopPropagation()
    if (isActiveTab(to) && to !== '/create') {
      navigate(0)
      return
    }
    navigate(to)
  }

  return createPortal(
    <motion.div
      ref={outerRef}
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center lg:hidden"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <motion.nav
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        aria-label="Primary navigation"
        className="relative flex items-center gap-1 rounded-full border p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
        style={{
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          background: 'rgba(28, 28, 31, 0.78)',
          borderColor: 'rgba(255,255,255,0.15)',
          backdropFilter: 'saturate(140%) blur(14px)',
          WebkitBackdropFilter: 'saturate(140%) blur(14px)',
        }}
      >
        {visibleTabs.map(({ to, icon: Icon, label }) => {
          const active = isActiveTab(to)
          return (
            <button
              key={to}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => handleTabClick(to, event)}
              className="relative flex h-11 w-11 appearance-none items-center justify-center rounded-full border-0 outline-none"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'transparent' }}
            >
              {active && (
                <motion.span
                  layoutId="bottomNavActivePill"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset' }}
                />
              )}
              <Icon size={20} color={active ? '#fff' : 'rgba(255,255,255,0.58)'} strokeWidth={2.35} className="relative z-10" />
              {to === '/notifications' && unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: '#ef4444', boxShadow: '0 0 0 2px rgba(28,28,31,0.78)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}

        <motion.button
          type="button"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); navigate(user ? '/profile' : '/login') }}
          whileTap={{ scale: 0.9 }}
          aria-label={user ? 'Profile' : 'Sign in'}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none"
          style={{ background: 'transparent', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name || 'Profile'} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
              {user?.name?.[0]?.toUpperCase() || <FiLogIn size={16} color="#fff" strokeWidth={2.5} />}
            </span>
          )}
        </motion.button>
      </motion.nav>
    </motion.div>,
    document.body,
  )
}