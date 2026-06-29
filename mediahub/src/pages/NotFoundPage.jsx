import { useNavigate } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center text-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <p className="text-8xl font-bold mb-4" style={{ color: '#f59e0b' }}>404</p>
      <p className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Page not found</p>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist.</p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-400 transition-colors"
      >
        <FiHome size={18} /> Back to Feed
      </button>
    </div>
  )
}
