import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import { useUIStore } from '../../store'

/*
 * Design tokens — Apple liquid-glass / spatial system.
 * Injected once at the root so every route/component can consume the same
 * scale via var(--...) instead of re-deriving radii, blur, and easing
 * ad hoc. Brand colors (amber accent, dark --bg-*) are left untouched —
 * this only standardizes geometry, glass, motion, and spacing.
 *
 * Concentric corner rule: a nested element's radius = container radius -
 * the padding between them, so corners stay visually parallel instead of
 * fighting each other (e.g. a 20px-radius sheet with 8px padding holds a
 * 12px-radius card, not an arbitrary rounded-xl).
 */
const DESIGN_TOKENS = `
  :root {
    /* Concentric radius scale */
    --radius-xs: 8px;
    --radius-sm: 12px;
    --radius-md: 18px;
    --radius-lg: 26px;
    --radius-xl: 34px;
    --radius-pill: 999px;

    /* Glass layers — blur + translucency increase with elevation */
    --glass-blur-sm: saturate(180%) blur(12px);
    --glass-blur-md: saturate(180%) blur(20px);
    --glass-blur-lg: saturate(180%) blur(32px);
    --glass-surface-1: color-mix(in oklab, var(--bg-primary) 72%, transparent);
    --glass-surface-2: color-mix(in oklab, var(--bg-secondary) 65%, transparent);
    --glass-border: color-mix(in oklab, var(--border) 70%, transparent);
    --glass-shadow: 0 8px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.06);

    /* Spacing scale — 4px base, Apple-ish jumps */
    --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
    --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;

    /* Motion — spring-first, matches framer-motion defaults used app-wide */
    --ease-spatial: cubic-bezier(0.2, 0.8, 0.2, 1);
    --duration-fast: 0.18s;
    --duration-base: 0.28s;
    --duration-slow: 0.42s;
  }
`

// Fires once per mount. A style tag (same pattern already used in the
// composer and settings sheets for nav-hiding) rather than a separate CSS
// file, since Layout is the one component guaranteed to wrap every route.
function useDesignTokens() {
  useEffect(() => {
    if (document.getElementById('liquid-glass-tokens')) return
    const style = document.createElement('style')
    style.id = 'liquid-glass-tokens'
    style.textContent = DESIGN_TOKENS
    document.head.appendChild(style)
  }, [])
}

// Spatial route transition — a soft cross-fade with a touch of scale and
// blur, standing in for Apple's "lift and settle" navigation feel without
// fighting each page's own internal animations (which stay untouched).
const pageVariants = {
  initial: { opacity: 0, scale: 0.985, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.01, filter: 'blur(4px)' },
}

export default function Layout() {
  const bottomNavHeight = useUIStore((s) => s.bottomNavHeight)
  const location = useLocation()
  useDesignTokens()

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
          className="flex-1 min-w-0 overflow-y-auto overscroll-contain touch-pan-y lg:!pb-6"
          style={{ background: 'var(--bg-primary)', paddingBottom: `${mobileBottomPadding}px`, WebkitOverflowScrolling: 'touch' }}
        >
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}