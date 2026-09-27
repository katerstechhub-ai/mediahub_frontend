import { useNavigate, useLocation } from 'react-router-dom'
import { FiHome, FiCompass, FiPlusSquare, FiBell, FiLogIn } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
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
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [visibleTabs.length, setBottomNavHeight])

  useEffect(() => {
    if (!user) return undefined
    const fetchUnread = async () => {
      try {
        const response = await notificationsAPI.getAll(1, 1)
        setUnreadCount(response.data?.unreadCount || 0)
      } catch { /* Keep the last known count. */ }
    }
    fetchUnread()
    const intervalId = setInterval(fetchUnread, 30000)
    return () => clearInterval(intervalId)
  }, [user])

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
      className="pointer-events-none fixed z-[100] flex justify-center lg:hidden"
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
          className="relative flex items-center gap-1 rounded-full border p-1.5"
          style={{ pointerEvents: 'auto', touchAction: 'manipulation', background: 'rgba(28,28,31,0.72)', borderColor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          {visibleTabs.map(({ to, icon: Icon, label }) => {
            const active = isActiveTab(to)
            return (
              <button key={to} type="button" aria-label={label} onClick={(event) => handleTabClick(to, event)} className="relative flex h-11 w-11 appearance-none items-center justify-center rounded-full border-0" style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'transparent' }}>
                {active && <motion.div layoutId="bottomNavActivePill" transition={{ type: 'spring', stiffness: 500, damping: 34 }} className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />}
                <Icon size={20} color={active ? '#fff' : 'var(--text-muted)'} strokeWidth={2.5} style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }} />
                {to === '/notifications' && unreadCount > 0 && <span className="absolute right-0.5 top-0.5 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: '#ef4444', boxShadow: '0 0 0 2px var(--background)' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
            )
          })}
          <motion.button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); navigate(user ? '/profile' : '/login') }} whileTap={{ scale: 0.9 }} aria-label={user ? 'Profile' : 'Sign in'} className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: 'transparent', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            {user?.avatar ? <img src={user.avatar} alt={user.name || 'Profile'} className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>{user?.name?.[0]?.toUpperCase() || <FiLogIn size={16} color="#fff" strokeWidth={2.5} />}</div>}
          </motion.button>
        </motion.nav>
    </motion.div>,
    document.body,
  )
}
