import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'
import africanMemoriesHero from '../assets/african-memories-login.jpg'

export default function GuestEntryPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Please enter your name (at least 2 characters)')
      return
    }
    setLoading(true)
    try {
      const { data } = await authAPI.guest({ name: trimmed })
      setAuth(data.user, data.token)
      toast.success(`Welcome, ${data.user.name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not enter the site')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-end overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${africanMemoriesHero})` }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(18, 11, 7, 0.20), rgba(18, 11, 7, 0.58))' }} />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(28, 16, 9, 0.04) 0%, rgba(28, 16, 9, 0.20) 45%, rgba(8, 8, 9, 0.72) 100%)' }}
      />

      <div
        className="relative z-10 w-full md:w-[560px] min-h-screen flex items-center justify-center px-6 sm:px-10 md:px-14"
        style={{
          background: 'rgba(20, 16, 14, 0.42)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <style>{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus {
            -webkit-text-fill-color: #fff;
            caret-color: #fff;
            transition: background-color 9999s ease-in-out 0s;
          }
        `}</style>
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
                fill="#f59e0b"
              />
            </svg>
            <span className="text-sm font-extrabold font-display tracking-wide text-white/90">
              Memories
            </span>
          </div>

          <h1 className="text-4xl font-extrabold font-display mb-2 text-white">
            Welcome
          </h1>
          <p className="text-sm mb-8 text-white/60">
            Enter your name to join and share your photos.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-7 text-left">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-white/85">
                Your name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                autoFocus
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                className="w-full bg-transparent text-base outline-none border-b transition-colors text-white placeholder-white/40 focus:border-amber-400"
                style={{
                  borderColor: error ? '#f87171' : 'rgba(255,255,255,0.3)',
                  paddingBottom: '10px',
                }}
              />
              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 bg-black/80 hover:bg-black text-white"
              style={{ padding: '16px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Entering...
                </span>
              ) : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}