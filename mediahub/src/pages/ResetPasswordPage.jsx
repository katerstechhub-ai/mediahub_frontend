import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock, FiCheck } from 'react-icons/fi'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return toast.error('Invalid or missing reset token')
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords don’t match')

    setLoading(true)
    try {
      await authAPI.resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Reset link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <FiCheck size={26} color="#f59e0b" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-extrabold font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Password reset
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Redirecting you to login…
            </p>
          </div>
        ) : !token ? (
          <div className="text-center py-4">
            <h1 className="text-lg font-extrabold font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Invalid link
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              This reset link is missing a token.
            </p>
            <Link to="/forgot-password" className="text-sm font-semibold text-amber-500">
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-extrabold font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Set a new password
            </h1>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl text-sm outline-none border transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                    padding: '11px 14px 11px 38px',
                  }}
                />
              </div>
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl text-sm outline-none border transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                    padding: '11px 14px 11px 38px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}