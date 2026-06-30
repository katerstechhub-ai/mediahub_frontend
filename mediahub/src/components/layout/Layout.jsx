import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
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