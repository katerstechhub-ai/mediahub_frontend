import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useThemeStore, useAuthStore } from './store'
import Layout from "./components/layout/Layout";
import ProtectedRoute from './components/layout/ProtectedRoute'

// Login/Register are on the critical path (unauthenticated users land here
// first), so they stay as normal eager imports. Everything else is
// lazy-loaded — each page becomes its own chunk that only downloads when
// the user actually navigates there, instead of all of them shipping in
// the initial bundle.
import Login from './pages/Login'
import Register from './pages/Register'

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

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
    </div>
  )
}

function App() {
  const { theme } = useThemeStore()
  const { user, isLoading, checkAuth } = useAuthStore()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    checkAuth().finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-dvh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
            <Route path="/" element={<Layout />}>
              {/* Public routes — viewable by guests */}
              <Route index element={<FeedPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="posts/:id" element={<PostDetailPage />} />
              <Route path="users/:userId" element={<UserProfilePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected routes — require auth */}
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