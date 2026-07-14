import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useThemeStore, useAuthStore } from './store'
import Layout from "./components/layout/Layout";
import Login from './pages/Login'
import Register from './pages/Register'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import CreatePostPage from './pages/CreatePostPage'
import Notifications from './pages/Notifications'
import ProfilePage from './pages/ProfilePage'
import PostDetailPage from './pages/PostDetailPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import UserProfilePage from './pages/Userprofilepage'
import LikesPage from './pages/LikesPage';
import CommentsPage from './pages/CommentsPage'
import ProtectedRoute from './components/layout/ProtectedRoute'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

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
      </div>
    </BrowserRouter>
  )
}

export default App