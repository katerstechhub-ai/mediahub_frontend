import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowLeft, FiUser, FiMoon, FiSun, FiLock, FiTrash2,
  FiLogOut, FiCheck, FiChevronRight, FiShield, FiSliders, FiX,
  FiEye, FiEyeOff
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

/**
 * FieldInput — Snapchat Settings style: a small uppercase caption sitting
 * above a plain pill-shaped field. Label lives outside the field, not
 * inside it, so there's no icon or floating text fighting for the same
 * space as what the person is typing.
 */
function FieldInput({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
  trailing,
  id,
}) {
  const reactId = useId()
  const inputId = id || reactId

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-[11px] font-bold tracking-wide uppercase px-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-full px-5"
        style={{ background: 'var(--bg-input)', minHeight: 50 }}
      >
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm py-3"
          style={{ color: 'var(--text-primary)' }}
        />
        {trailing}
      </div>
    </div>
  )
}

function PasswordInput(props) {
  const [show, setShow] = useState(false)
  return (
    <FieldInput
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      }
    />
  )
}

function Textarea({ label, value, onChange, rows = 3, placeholder }) {
  const reactId = useId()

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={reactId}
        className="text-[11px] font-bold tracking-wide uppercase px-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <textarea
        id={reactId}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm resize-none rounded-2xl px-5 py-3"
        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

function PrimaryButton({ children, loading, icon: Icon, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <form onSubmit={handleSaveProfile} className="px-5 pb-5 flex flex-col gap-3.5">
              <FieldInput
                label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Textarea
                label="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell people a bit about yourself"
              />
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
              className="mx-5 mb-5 flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
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
            <form onSubmit={handleChangePassword} className="px-5 pb-5 flex flex-col gap-3.5">
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="grid sm:grid-cols-2 gap-3.5">
                <PasswordInput
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
              >
                <FiTrash2 size={16} strokeWidth={2.5} />
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </Card>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            key="delete-account-overlay"
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              className="relative w-full max-w-sm rounded-3xl px-8 py-8 flex flex-col items-center justify-center"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
            >
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

              <h3 className="text-base font-extrabold text-center px-2" style={{ color: 'var(--text-primary)' }}>
                Delete your account?
              </h3>

              <p className="text-sm text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                This permanently removes your profile and all your posts. This action cannot be undone.
              </p>

              <div className="flex items-center justify-center gap-3 mt-6">
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
                  className="px-6 py-2.5 rounded-full font-bold text-sm text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}