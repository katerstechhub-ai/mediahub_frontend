import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock, FiCheck } from 'react-icons/fi'
import { authAPI } from '../api'
import toast from 'react-hot-toast'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import africanMemoriesHero from '../assets/african-memories-login.jpg'

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

  const inputStyle = {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    border: '1px solid transparent',
    padding: '12px 18px 12px 44px',
  }
  const inputCls =
    'w-full rounded-full text-sm outline-none transition-all placeholder:text-white/45 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${africanMemoriesHero})` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(18,11,7,0.18), rgba(8,8,9,0.72))' }} />
      <ThemeOverlay className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-sm rounded-[30px] border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        style={{ background: 'rgba(20,16,14,0.66)', borderColor: 'rgba(255,255,255,0.14)', boxShadow: '0 24px 80px rgba(0,0,0,0.32)' }}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <FiCheck size={26} color="#f59e0b" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-extrabold mb-1" style={{ color: '#fff' }}>
              Password reset
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.68)' }}>
              Redirecting you to login…
            </p>
          </div>
        ) : !token ? (
          <div className="text-center py-4">
            <h1 className="text-lg font-extrabold mb-1" style={{ color: '#fff' }}>
              Invalid link
            </h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.68)' }}>
              This reset link is missing a token.
            </p>
            <Link to="/forgot-password" className="text-sm font-semibold text-amber-500">
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold mb-1.5" style={{ color: '#fff' }}>
              Set a new password
            </h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.68)' }}>
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="relative">
                <FiLock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.68)' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="relative">
                <FiLock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.68)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] rounded-full py-3 mt-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
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
