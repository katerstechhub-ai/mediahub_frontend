import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiHeart, FiMessageCircle, FiBookmark, FiMoreHorizontal } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI } from '../../api'
import { useAuthStore } from '../../store'
import { Avatar } from '../ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export default function PostCard({ post, onUpdate }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [liked, setLiked] = useState(post.likes?.includes(user?._id))
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const [animating, setAnimating] = useState(false)

  const handleLike = async (e) => {
    e.stopPropagation()
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => wasLiked ? c - 1 : c + 1)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)
    try {
      await postsAPI.like(post._id)
      onUpdate?.()
    } catch {
      setLiked(wasLiked)
      setLikeCount((c) => wasLiked ? c + 1 : c - 1)
    }
  }

  const mediaUrl = post.media?.[0]?.url || post.image || post.thumbnail

  return (
    <div
      className="rounded-2xl border overflow-hidden post-card cursor-pointer"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={38} ring />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {post.author?.name || 'Unknown'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {dayjs(post.createdAt).fromNow()}
            </p>
          </div>
        </div>
        <button className="p-1 rounded-lg hover:bg-[var(--bg-secondary)]" onClick={(e) => e.stopPropagation()}>
          <FiMoreHorizontal size={18} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {post.caption.length > 120 ? post.caption.slice(0, 120) + '…' : post.caption}
        </p>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Image */}
      {mediaUrl && (
        <div
          className="w-full overflow-hidden"
          style={{ aspectRatio: '1/1', maxHeight: 400 }}
          onClick={() => navigate(`/posts/${post._id}`)}
        >
          <img
            src={mediaUrl}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button onClick={handleLike} className="flex items-center gap-1.5">
            {liked
              ? <FaHeart size={20} color="#ef4444" className={animating ? 'heart-pop' : ''} />
              : <FiHeart size={20} style={{ color: 'var(--text-muted)' }} />
            }
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{likeCount}</span>
          </button>

          {/* Comment */}
          <button
            className="flex items-center gap-1.5"
            onClick={() => navigate(`/posts/${post._id}`)}
          >
            <FiMessageCircle size={20} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {post.comments?.length || 0}
            </span>
          </button>
        </div>

        <button className="p-1 rounded-lg hover:bg-[var(--bg-secondary)]">
          <FiBookmark size={20} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  )
}
