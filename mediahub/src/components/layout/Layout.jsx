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
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 pb-20 lg:pb-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}