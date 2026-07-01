import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiUser, FiMoon, FiSun, FiLock, FiTrash2, FiLogOut, FiCheck
} from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../store'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

// Small reusable section wrapper — keeps every settings block visually consistent
function SettingsSection({ icon: Icon, title, children, danger = false }) {
  return (
    <div
      className="rounded-3xl px-5 py-5 sm:px-6 sm:py-6"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.14)' }}
        >
          <Icon size={16} strokeWidth={2.5} color={danger ? '#ef4444' : '#f59e0b'} />
        </div>
        <h2 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: danger ? '#ef4444' : 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  // Profile
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Delete account
  const [deleting, setDeleting] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const response = await authAPI.updateProfile({ name, bio })
      updateUser(response.data.data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      toast.error('Fill in both password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords don\u2019t match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSavingPassword(true)
    try {
      // Backend endpoint pending — see authAPI.changePassword
      await authAPI.changePassword({ currentPassword, newPassword })
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account? This will permanently remove your profile and posts. This cannot be undone.'
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      // Backend endpoint pending — see authAPI.deleteAccount
      await authAPI.deleteAccount()
      toast.success('Account deleted')
      logout()
      navigate('/login')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen pb-16 fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header with soft gradient backdrop — matches ProfilePage */}
        <div
          className="relative px-4 pt-5 pb-10"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 55%, transparent 100%)',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-extrabold font-display mt-5" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your profile, appearance, and account
          </p>
        </div>

        <div className="px-4 flex flex-col gap-4">

          {/* ── Profile ── */}
          <SettingsSection icon={FiUser} title="Profile">
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-full text-sm font-medium outline-none border-2 focus:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)', padding: '12px 20px' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl text-sm font-medium outline-none border-2 focus:border-amber-500 transition-all resize-none"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)', padding: '12px 20px' }}
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="self-start flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30 disabled:opacity-50"
              >
                <FiCheck size={16} strokeWidth={2.5} />
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </SettingsSection>

          {/* ── Appearance ── */}
          <SettingsSection icon={theme === 'dark' ? FiMoon : FiSun} title="Appearance">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Switch how MediaHub looks on this device
                </p>
              </div>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="relative w-14 h-8 rounded-full transition-colors flex-shrink-0"
                style={{ background: theme === 'dark' ? '#f59e0b' : 'var(--bg-secondary)' }}
              >
                <span
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all flex items-center justify-center"
                  style={{ left: theme === 'dark' ? '26px' : '4px' }}
                >
                  {theme === 'dark'
                    ? <FiMoon size={12} strokeWidth={2.5} color="#f59e0b" />
                    : <FiSun size={12} strokeWidth={2.5} color="var(--text-muted)" />}
                </span>
              </button>
            </div>
          </SettingsSection>

          {/* ── Change password ── */}
          <SettingsSection icon={FiLock} title="Change Password">
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-full text-sm font-medium outline-none border-2 focus:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)', padding: '12px 20px' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-full text-sm font-medium outline-none border-2 focus:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)', padding: '12px 20px' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-full text-sm font-medium outline-none border-2 focus:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)', padding: '12px 20px' }}
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="self-start flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30 disabled:opacity-50"
              >
                <FiLock size={16} strokeWidth={2.5} />
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </SettingsSection>

          {/* Hard spacer before danger zone, matches the app's sticky-header spacer convention */}
          <div className="h-2" />

          {/* ── Danger zone ── */}
          <SettingsSection icon={FiTrash2} title="Danger Zone" danger>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Delete account</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Permanently remove your profile and posts
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm text-red-500 border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <FiTrash2 size={14} strokeWidth={2.5} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </SettingsSection>

          {/* ── Logout ── */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiLogOut size={18} strokeWidth={2.5} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}