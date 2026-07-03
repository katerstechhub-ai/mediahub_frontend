import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowLeft, FiUser, FiMoon, FiSun, FiLock, FiTrash2,
  FiLogOut, FiCheck, FiChevronRight, FiShield, FiSliders, FiX
} from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../store'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

/* ---------- Primitives ---------- */

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description, tone = 'default' }) {
  const tones = {
    default: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    danger:  { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
  }
  const t = tones[tone]
  return (
    <div className="flex items-start gap-3 px-5 pt-5 pb-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: t.bg }}
      >
        <Icon size={18} strokeWidth={2.25} color={t.fg} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span
        className="text-xs font-semibold block mb-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle = {
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border)',
}
const inputClass =
  'w-full rounded-xl text-sm outline-none border transition-all px-4 py-2.5 ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

function PrimaryButton({ children, loading, icon: Icon, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {loading ? 'Please wait…' : children}
    </button>
  )
}

/* ---------- Page ---------- */

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await authAPI.updateProfile({ name, bio })
      updateUser(res.data.data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) return toast.error('Fill in both password fields')
    if (newPassword !== confirmPassword) return toast.error('New passwords don’t match')
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters')

    setSavingPassword(true)
    try {
      await authAPI.changePassword({ currentPassword, newPassword })
      toast.success('Password updated')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await authAPI.deleteAccount()
      toast.success('Account deleted')
      setShowDeleteModal(false)
      logout()
      navigate('/login')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete account')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <div className="min-h-screen pb-16" style={{ background: 'var(--bg-secondary)' }}>
        {/* Header */}
        <header
          className="sticky top-0 z-10 backdrop-blur-md"
          style={{
            background: 'color-mix(in oklab, var(--bg-primary) 85%, transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Go back"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Settings
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.name ? `Signed in as ${user.name}` : 'Manage your account'}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 mt-6 flex flex-col gap-4">

          {/* Profile */}
          <Card>
            <SectionHeader icon={FiUser} title="Profile" description="How others see you on MediaHub" />
            <form onSubmit={handleSaveProfile} className="px-5 pb-5 flex flex-col gap-4">
              <Field label="Display name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={inputClass + ' resize-none'}
                  style={inputStyle}
                  placeholder="Tell people a bit about yourself"
                />
              </Field>
              <div className="flex justify-end">
                <PrimaryButton icon={FiCheck} loading={savingProfile}>
                  Save changes
                </PrimaryButton>
              </div>
            </form>
          </Card>

          {/* Appearance */}
          <Card>
            <SectionHeader icon={FiSliders} title="Appearance" description="Customize how the app looks" />
            <div
              className="mx-5 mb-5 flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-input)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isDark
                  ? <FiMoon size={18} color="#f59e0b" />
                  : <FiSun size={18} color="#f59e0b" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {isDark ? 'Dark mode' : 'Light mode'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Applied on this device
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle theme"
                className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
                style={{ background: isDark ? '#f59e0b' : 'var(--border)' }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: isDark ? '24px' : '4px' }}
                />
              </button>
            </div>
          </Card>

          {/* Password */}
          <Card>
            <SectionHeader icon={FiLock} title="Password" description="Use at least 6 characters" />
            <form onSubmit={handleChangePassword} className="px-5 pb-5 flex flex-col gap-4">
              <Field label="Current password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <PrimaryButton icon={FiShield} loading={savingPassword}>
                  Update password
                </PrimaryButton>
              </div>
            </form>
          </Card>

          {/* Account actions */}
          <Card>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                >
                  <FiLogOut size={18} color="#f59e0b" strokeWidth={2.25} />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Log out
                </span>
              </span>
              <FiChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </Card>

          {/* Danger */}
          <Card className="!border-red-500/30">
            <SectionHeader
              icon={FiTrash2}
              title="Delete account"
              description="This permanently removes your profile and posts"
              tone="danger"
            />
            <div className="px-5 pb-5 flex justify-end">
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors disabled:opacity-50"
              >
                <FiTrash2 size={16} strokeWidth={2.5} />
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </Card>
        </main>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            key="delete-account-overlay"
            className="fixed inset-0 flex items-center justify-center  px-4"
            style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              className="relative w-full max-w-sm rounded-3xl px-8 py-8 flex flex-col items-center justify-center h-[200px]"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-muted)' }}
              >
                <FiX size={18} strokeWidth={2.5} />
              </button>

              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(239,68,68,0.12)' }}
              >
                <FiTrash2 size={28} color="#ef4444" strokeWidth={2.5} />
              </div>

              <h3 className="text-base font-extrabold text-center font-display px-2" style={{ color: 'var(--text-primary)' }}>
                Delete your account?
              </h3>
              
              <p className="text-sm text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                This permanently removes your profile and all your posts. This action cannot be undone.
              </p>

              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-6 py-2.5 rounded-full font-bold text-sm border transition-colors disabled:opacity-50"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-6 py-2.5 rounded-full font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting…' : "Yes, delete my account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}