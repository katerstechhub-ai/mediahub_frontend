import { useState, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowLeft, FiUser, FiSun, FiMoon, FiMonitor, FiLock, FiTrash2,
  FiLogOut, FiChevronRight, FiX, FiEye, FiEyeOff, FiCheck, FiShield,
} from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../store'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import { Avatar } from '../components/ui'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

/* ---------- Style presets (same family as ExplorePage) ---------- */

const glassChip = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  boxShadow: 'none',
}

const glassAmber = {
  background: 'linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.85))',
  border: '1px solid #f59e0b',
  boxShadow: 'none',
}

const Z_MODAL = 2147482990
const Z_CONFIRM = 2147483000

/* ---------- Primitives ---------- */

// Label + hairline, like "Latest thoughts" on Explore
function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 6px', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d97706' }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// Flat row with a hairline under it
function Row({ icon: Icon, label, onClick, danger = false, last = false }) {
  const color = danger ? '#ef4444' : 'var(--text-primary)'
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-1.5 py-5 text-left transition-opacity hover:opacity-70"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <Icon size={20} strokeWidth={2} style={{ color }} />
      <span className="flex-1 text-[15px] font-semibold" style={{ color }}>{label}</span>
      <FiChevronRight size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}

/* ---------- Appearance segmented control ---------- */

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light', icon: FiSun },
  { value: 'dark', label: 'Dark', icon: FiMoon },
  { value: 'system', label: 'System', icon: FiMonitor },
]

function AppearanceControl({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="flex items-center gap-1 rounded-full p-1 flex-shrink-0"
      style={glassChip}
    >
      {APPEARANCE_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(optionValue)}
            className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-full text-xs font-extrabold transition-colors"
            style={{
              background: selected ? '#f59e0b' : 'transparent',
              color: selected ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Icon size={15} strokeWidth={2.25} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Field primitives (used inside modals) ---------- */

function FieldInput({ label, type = 'text', value, onChange, autoComplete, placeholder, trailing, id }) {
  const reactId = useId()
  const inputId = id || reactId
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-[11px] font-extrabold tracking-[0.18em] uppercase px-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-full px-5" style={{ ...glassChip, minHeight: 50 }}>
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm py-3 placeholder:opacity-70"
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
          className="flex-shrink-0 rounded-full p-1.5"
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
        className="text-[11px] font-extrabold tracking-[0.18em] uppercase px-1"
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
        className="w-full outline-none text-sm resize-none rounded-3xl px-5 py-3 placeholder:opacity-70"
        style={{ ...glassChip, color: 'var(--text-primary)', lineHeight: 1.6 }}
      />
    </div>
  )
}

function PrimaryButton({ children, loading, icon: Icon, ...rest }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      {...rest}
      disabled={loading || rest.disabled}
      className="inline-flex items-center gap-2 font-extrabold text-sm text-white disabled:cursor-not-allowed"
      style={{
        ...glassAmber,
        height: 42,
        padding: '0 24px',
        borderRadius: 999,
        opacity: loading || rest.disabled ? 0.45 : 1,
      }}
    >
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {loading ? 'Please wait…' : children}
    </motion.button>
  )
}

/* ---------- Full-screen modal (same as Explore's "New thought" / thought modal) ---------- */

function FullModal({ open, onClose, title, children }) {
  // Esc closes, and the page behind stops scrolling
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, overflowY: 'auto', background: 'var(--bg-primary)' }}
        >
          <div className="mx-auto min-h-full w-full max-w-2xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
            <div
              className="sticky top-0 z-10 flex items-center justify-between border-b py-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ color: 'var(--text-primary)' }}
              >
                <FiX size={20} />
              </button>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
              <span className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="pt-6">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Centered confirm dialog (same as Explore's delete dialog) ---------- */

function ConfirmDialog({ open, title, body, confirmLabel, busyLabel, busy, onCancel, onConfirm }) {
  if (!open) return null
  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: Z_CONFIRM, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.46)' }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ width: 'min(100%, 390px)', padding: 24, borderRadius: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: 'var(--text-muted)' }}>{body}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{ height: 42, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent', fontWeight: 700 }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{ height: 42, padding: '0 18px', borderRadius: 999, border: '1px solid #ef4444', color: '#fff', background: '#ef4444', fontWeight: 800, opacity: busy ? 0.65 : 1 }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

/* ---------- Page ---------- */

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  // `theme` is 'light' | 'dark' | 'system'. setTheme sets it directly.
  const { theme, setTheme } = useThemeStore()

  const [openSheet, setOpenSheet] = useState(null) // 'account' | 'password' | 'delete'

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const closeSheet = () => setOpenSheet(null)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await authAPI.updateProfile({ name, bio })
      updateUser(res.data.data)
      toast.success('Profile updated')
      setOpenSheet(null)
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
      setOpenSheet(null)
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
      setOpenSheet(null)
      logout()
      navigate('/login')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete account')
      setDeleting(false)
      setOpenSheet(null)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <ThemeOverlay className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6" />
      <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] fade-in" style={{ background: 'var(--bg-primary)' }}>
        {/* Sticky flat header, like Explore */}
        <header
          className="sticky top-0 z-40 border-b px-3 py-3 sm:px-6"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ ...glassChip, color: 'var(--text-primary)' }}
            >
              <FiArrowLeft size={20} strokeWidth={2.5} />
            </motion.button>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 sm:px-6" style={{ paddingTop: 36, display: 'flex', flexDirection: 'column', gap: 44 }}>
          {/* Signed-in summary */}
          <section
            style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '24px 0' }}
          >
            <div className="flex items-center gap-4">
              <Avatar src={user?.avatar} name={user?.name} size={46} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Signed in as</p>
                <h2 className="mt-1 truncate text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {user?.name || 'Your account'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenSheet('account')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ ...glassChip, color: 'var(--text-primary)' }}
                aria-label="Edit account"
              >
                <FiUser size={18} strokeWidth={2.5} />
              </button>
            </div>
          </section>

          <section>
            <SectionLabel>Appearance</SectionLabel>
            <div style={{ padding: '22px 6px 0' }}>
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Interface theme</h2>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Choose how the app looks across every page.
              </p>
              <div className="mt-5">
                <AppearanceControl value={theme} onChange={setTheme} />
              </div>
              <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                Current mode: <span className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{theme}</span>
              </p>
            </div>
          </section>

          <section>
            <SectionLabel>Account &amp; security</SectionLabel>
            <div>
              <Row icon={FiUser} label="Account details" onClick={() => setOpenSheet('account')} />
              <Row icon={FiLock} label="Change password" onClick={() => setOpenSheet('password')} last />
            </div>
          </section>

          <section>
            <SectionLabel>Session &amp; account</SectionLabel>
            <div>
              <Row icon={FiLogOut} label="Log out" onClick={handleLogout} />
              <Row icon={FiTrash2} label="Delete account" danger onClick={() => setOpenSheet('delete')} last />
            </div>
          </section>

          <p className="pb-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Your memories, your rhythm.</p>
        </main>
      </div>

      {/* Account modal */}
      <FullModal open={openSheet === 'account'} onClose={closeSheet} title="Account">
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
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
            rows={4}
            placeholder="Tell people a bit about yourself"
          />
          <div
            className="flex justify-end"
            style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}
          >
            <PrimaryButton type="submit" icon={FiCheck} loading={savingProfile}>Save changes</PrimaryButton>
          </div>
        </form>
      </FullModal>

      {/* Password modal */}
      <FullModal open={openSheet === 'password'} onClose={closeSheet} title="Change password">
        <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
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
          <div
            className="flex justify-end"
            style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}
          >
            <PrimaryButton type="submit" icon={FiShield} loading={savingPassword}>Update password</PrimaryButton>
          </div>
        </form>
      </FullModal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={openSheet === 'delete'}
        title="Delete your account?"
        body="This permanently removes your profile and all your posts. This action cannot be undone."
        confirmLabel="Delete account"
        busyLabel="Deleting…"
        busy={deleting}
        onCancel={closeSheet}
        onConfirm={handleDeleteAccount}
      />
    </>
  )
}