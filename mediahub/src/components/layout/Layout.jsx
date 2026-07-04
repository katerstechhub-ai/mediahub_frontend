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
          overscroll-contain: stops the page's rubber-band/bounce scroll from
          leaking into the body behind it on mobile.

          BottomNav is now rendered INSIDE this scroll container, right after
          the page content, and it uses `sticky` (see BottomNav.jsx) instead
          of `fixed`. While there's more content below it, it stays pinned to
          the bottom of the screen like a normal floating nav. Once you
          actually scroll past the last post, there's nothing left for it to
          stick against, so it settles into the page flow directly below the
          last item instead of floating over it. No artificial bottom
          padding needed here anymore — the nav reserves its own space.
        */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain lg:pb-6"
          style={{ background: 'var(--bg-primary)' }}
        >
          <Outlet />
          <BottomNav />
        </main>
      </div>
    </div>
  )
}