import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import { useUIStore } from '../../store'

export default function Layout() {
  const bottomNavHeight = useUIStore((s) => s.bottomNavHeight)
  // 96px fallback (roughly the pill's usual footprint) until BottomNav's
  // first real measurement lands on mount — avoids a flash of zero padding.
  const mobileBottomPadding = bottomNavHeight > 0 ? bottomNavHeight + 24 : 96

  return (
    // h-screen (100vh) is unreliable on mobile Safari/Chrome: 100vh is
    // calculated as if the address bar is hidden, but the real visible
    // viewport shrinks when it's showing — which is what made the bottom
    // of scrollable pages (like the feed) get cut off. h-dvh tracks the
    // *actual* visible viewport instead. h-screen stays as a fallback for
    // older browsers that don't support dvh units.
    <div className="flex h-screen h-dvh overflow-hidden">
      {/* Sidebar - bold icon-only */}
      <div className="hidden lg:block lg:w-[84px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {/*
          overscroll-contain: stops the page's rubber-band/bounce scroll from
          leaking into the body behind it on mobile.

          paddingBottom is now driven by BottomNav's own measured height
          (see uiStore + BottomNav's ResizeObserver) plus 24px of real
          margin — not a hardcoded pb-[...] guess. That guess kept covering
          the last post because a fixed Tailwind value can't self-correct if
          the pill's actual rendered size differs from what was assumed.
          lg:!pb-6 overrides it back down on desktop, where BottomNav is
          hidden entirely.
        */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain lg:!pb-6"
          style={{ background: 'var(--bg-primary)', paddingBottom: `${mobileBottomPadding}px`, WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}