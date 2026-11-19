import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { FiHeart } from 'react-icons/fi'
import { useThemeStore, useAuthStore } from './store'
import Layout from "./components/layout/Layout";
import ProtectedRoute from './components/layout/ProtectedRoute'

// Login/Register are paused: GuestEntryPage (name only) replaces them for now.
// To bring them back, uncomment these imports and the two original routes below.
// import Login from './pages/Login'
// import Register from './pages/Register'
import GuestEntryPage from './pages/GuestEntryPage'

const GiftsPage = lazy(() => import('./pages/GiftsPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'))
const Notifications = lazy(() => import('./pages/Notifications'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const UserProfilePage = lazy(() => import('./pages/Userprofilepage'))
const LikesPage = lazy(() => import('./pages/LikesPage'))
const CommentsPage = lazy(() => import('./pages/CommentsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const PrintQr = lazy(() => import('./pages/PrintQr'))

// Start downloading the Feed chunk right now, in parallel with the auth check,
// instead of waiting until auth finishes. (Dynamic imports are cached, so
// lazy() above reuses this same download.)
if (typeof window !== 'undefined' && window.location.pathname === '/') {
  import('./pages/FeedPage')
}

function PageFallback({ fullScreen = false, label = 'Loading memories' }) {
  return (
    <motion.div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[50vh]'} flex flex-col items-center justify-center gap-4`}
      style={{ background: 'var(--bg-primary)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] border border-sky-300/40 bg-[var(--bg-secondary)] text-sky-500 shadow-[0_12px_34px_rgba(14,165,233,0.16)]"
        animate={{ y: [0, -7, 0], rotate: [-3, 3, -3] }}
        transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
      >
        <span aria-hidden="true" className="relative block h-9 w-9 rounded-xl border-2 border-current/70"><span className="absolute -left-1 -top-1 h-6 w-6 rounded-lg border-2 border-current/55" /><span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg border-2 border-current/55" /></span>
        <motion.span
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sky-200"
          animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      </motion.div>
      <div className="flex items-center gap-1.5" aria-label={label}>
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-2 w-2 rounded-full bg-amber-500"
            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: dot * 0.14 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function App() {
  const { theme } = useThemeStore()
  const { user, isLoading, checkAuth } = useAuthStore()

  const [hasSession] = useState(
    () => !!localStorage.getItem('auth_token') && !!useAuthStore.getState().user
  )
  const [authChecked, setAuthChecked] = useState(hasSession)

  useEffect(() => {
    checkAuth({ silent: hasSession }).finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  if (!authChecked || isLoading) {
    return <PageFallback fullScreen label="Loading your memories" />
  }

  return (
    <BrowserRouter>
      <div className="min-h-dvh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* QR link lands here. Already entered -> straight into the site. */}
            <Route path="/welcome" element={!user ? <GuestEntryPage /> : <Navigate to="/" replace />} />

            {/* Login/Register paused: both show the name-only page for now. */}
            <Route path="/login" element={!user ? <GuestEntryPage /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <GuestEntryPage /> : <Navigate to="/" replace />} />
            {/* Original routes, to restore later:
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
            */}

            <Route path="/print-qr" element={<PrintQr />} />

            <Route path="/" element={<Layout />}>
              <Route index element={<FeedPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="gifts" element={<GiftsPage />} />
              <Route path="posts/:id" element={<PostDetailPage />} />
              <Route path="users/:userId" element={<UserProfilePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="create" element={<CreatePostPage />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="likes" element={<LikesPage />} />
                <Route path="comments" element={<CommentsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App