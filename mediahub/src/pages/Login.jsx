import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { authAPI } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }
    if (!form.password) {
      e.password = 'Password is required'
    } else if (form.password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await authAPI.login(form)
      setAuth(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{ background: '#3a1d0e' }}
    >
      <div
        className="w-full max-w-4xl rounded-[2rem] shadow-2xl p-3 flex flex-col md:flex-row gap-3"
        style={{ background: '#ffffff' }}
      >
        {/* Inset dark visual panel */}
        <div className="relative w-full md:w-[42%] h-56 md:h-auto rounded-[1.5rem] overflow-hidden shrink-0 bg-black">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 30% 90%, #f97316 0%, #ea580c 18%, rgba(234,88,18,0.4) 38%, transparent 60%), radial-gradient(ellipse at 55% 100%, #fb923c 0%, transparent 45%), #0a0a0a',
            }}
          />
          {/* vertical light streaks */}
          <div className="absolute bottom-0 left-0 right-0 h-3/5 flex items-end gap-1 px-8">
            {[85, 60, 95, 40, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-full"
                style={{
                  height: `${h}%`,
                  background: 'linear-gradient(180deg, transparent 0%, #fb923c 55%, #fed7aa 100%)',
                  filter: 'blur(2px)',
                  opacity: 0.85,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 p-7 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold leading-snug text-white">
              Your moments,<br />on display.
            </h2>
          </div>
        </div>

        {/* Form panel */}
        <div className="w-full md:w-[58%] flex items-center justify-center px-4 py-6 md:p-10">
          <div className="w-full max-w-sm">
            {/* Logo mark */}
            <div className="flex items-center gap-2 mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
                  fill="#f59e0b"
                />
              </svg>
              <span className="text-sm font-semibold tracking-wide" style={{ color: '#111' }}>
                MediaHub
              </span>
            </div>

            <h1 className="text-3xl font-bold mb-1.5" style={{ color: '#111' }}>
              Welcome back
            </h1>
            <p className="text-sm mb-6" style={{ color: '#8a8a8a' }}>
              Sign in to continue to your feed
            </p>

            <div className="border-t mb-6" style={{ borderColor: '#ececec' }} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: '#6b6b6b' }}>
                  Your email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                  className="w-full rounded-xl text-base outline-none border transition-all focus:border-amber-500"
                  style={{
                    padding: '16px 18px',
                    background: '#fff',
                    color: '#111',
                    borderColor: errors.email ? '#ef4444' : '#e3e3e3',
                  }}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: '#6b6b6b' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      if (errors.password) setErrors({ ...errors, password: '' })
                    }}
                    className="w-full rounded-xl text-base outline-none border transition-all focus:border-amber-500"
                    style={{
                      padding: '16px 46px 16px 18px',
                      background: '#fff',
                      color: '#111',
                      borderColor: errors.password ? '#ef4444' : '#e3e3e3',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                    style={{ color: '#9a9a9a' }}
                  >
                    {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                style={{ padding: '16px', background: '#f59e0b', color: '#fff' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#8a8a8a' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold underline" style={{ color: '#111' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}