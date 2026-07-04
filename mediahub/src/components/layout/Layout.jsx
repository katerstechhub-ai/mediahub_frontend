import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
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
          BottomNav is always `fixed` — no state, no scroll-position logic,
          nothing that can glitch. It's a static overlay, full stop.

          pb-[...]: permanent reserved space at the bottom of the scroll
          container so the last post always clears the nav once you've
          scrolled all the way down. This value never changes, so there's
          no feedback loop or browser-specific positioning bug possible —
          it's just a fixed number, calculated once.

          overscroll-contain: stops the page's rubber-band/bounce scroll
          from leaking into the body behind it on mobile.
          -webkit-overflow-scrolling: touch: proper momentum scroll on iOS.
        */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6"
          style={{ background: 'var(--bg-primary)', WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}