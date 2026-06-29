import { FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { Avatar } from '../ui'

export default function StoriesRow({ users = [] }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Fake stories for demo if no users passed
  const stories = [
    { _id: 'me', name: 'Your Story', avatar: user?.avatar, isMe: true },
    ...users.slice(0, 8),
  ]

  return (
    <div className="px-4 py-4">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {stories.map((s) => (
          <button
            key={s._id}
            onClick={() => !s.isMe ? null : navigate('/create')}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative">
              {s.isMe ? (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500 flex items-center justify-center"
                  style={{ background: 'var(--bg-secondary)' }}>
                  <FiPlus size={22} color="#f59e0b" />
                </div>
              ) : (
                <Avatar src={s.avatar} name={s.name} size={64} ring />
              )}
            </div>
            <span className="text-xs max-w-[64px] truncate" style={{ color: 'var(--text-muted)' }}>
              {s.isMe ? 'Add story' : s.name?.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
