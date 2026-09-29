import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { authAPI } from '../api'
import toast from 'react-hot-toast'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import africanMemoriesHero from '../assets/african-memories-login.jpg'

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
        <Link
          to="/login"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to login
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <FiCheck size={26} color="#f59e0b" strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-extrabold mb-1" style={{ color: '#fff' }}>
              Check your email
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.68)' }}>
              If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold mb-1.5" style={{ color: '#fff' }}>
              Forgot password
            </h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.68)' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="relative">
                <FiMail
                  size={16}
                  className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.68)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full min-h-[48px] rounded-full text-sm outline-none transition-all placeholder:text-white/45 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    border: '1px solid transparent',
                    padding: '12px 18px 12px 44px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] rounded-full py-3 mt-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
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
