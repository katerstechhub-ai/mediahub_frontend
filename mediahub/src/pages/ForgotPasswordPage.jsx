import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      setSent(true)
    } catch {
      toast.error('Something went wrong. Try again.')
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
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-5" style={{ color: 'var(--text-muted)' }}>
          <FiArrowLeft size={14} /> Back to login
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <FiCheck size={26} color="#f59e0b" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-extrabold font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Check your email
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-extrabold font-display mb-1" style={{ color: 'var(--text-primary)' }}>
              Forgot password
            </h1>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}