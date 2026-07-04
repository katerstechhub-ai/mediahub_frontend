import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const mainRef = useRef(null)
  const sentinelRef = useRef(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  useEffect(() => {
    const mainEl = mainRef.current
    const sentinelEl = sentinelRef.current
    if (!mainEl || !sentinelEl) return

    // We use an IntersectionObserver instead of `position: sticky; bottom`
    // for the "release below the last post" behavior. Safari's support for
    // sticky-BOTTOM (unlike sticky-top, which is fine) has long been
    // unreliable and can fail to render at all on real iOS devices. A
    // sentinel + observer produces the identical effect on every browser,
    // since it doesn't depend on sticky positioning at all.
    const observer = new IntersectionObserver(
      ([entry]) => setReachedEnd(entry.isIntersecting),
      { root: mainEl, threshold: 0 }
    )
    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [])

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
          -webkit-overflow-scrolling: touch: gives proper momentum scrolling
          on iOS Safari for this container.
        */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overscroll-contain lg:pb-6"
          style={{ background: 'var(--bg-primary)', WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
          {/* Sentinel — once this scrolls into view, we've hit the true end
              of the page's content, and BottomNav switches from floating
              over everything to resting in normal flow below it. */}
          <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
          <BottomNav floating={!reachedEnd} />
        </main>
      </div>
    </div>
  )
}