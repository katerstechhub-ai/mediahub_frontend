import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHeart, FiMessageCircle, FiSend, FiTrash2, FiMoreHorizontal } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const commentRef = useRef()

  const fetchComments = async () => {
    try {
      const response = await commentsAPI.getByPost(id)
      setComments(response.data?.data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    }
  }

  const fetchPost = async () => {
    try {
      const response = await postsAPI.getOne(id)
      const p = response.data?.data || response.data?.post || response.data || response
      setPost(p)
      await fetchComments()
      const userId = user?._id || user?.id
      if (userId && p.likes) {
        setLiked(p.likes.includes(userId))
      }
      setLikeCount(p.likes?.length || 0)
    } catch (error) {
      toast.error('Post not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPost() }, [id])

  const handleLike = async () => {
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try {
      await postsAPI.like(id)
    } catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await commentsAPI.create(id, comment.trim())
      setComment('')
      await fetchComments()
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await postsAPI.delete(id)
      toast.success('Post deleted')
      navigate('/')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const getImageUrl = (post) => {
    if (!post) return null
    if (post.image?.url) return post.image.url
    if (post.image && typeof post.image === 'string') return post.image
    if (post.media?.[0]) return post.media[0].url || post.media[0]
    if (post.imageUrl) return post.imageUrl
    if (post.thumbnail) return post.thumbnail
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (!post) return null

  const mediaUrl = getImageUrl(post)
  const isOwner = user?._id === post.author?._id || user?.id === post.author?._id

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <FiArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
          </button>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Post</span>
          {isOwner ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <FiMoreHorizontal size={20} style={{ color: 'var(--text-primary)' }} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-11 rounded-xl shadow-lg border py-1 w-36 z-30"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                >
                  <button
                    onClick={() => { setShowMenu(false); handleDelete() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                  >
                    <FiTrash2 size={14} /> Delete post
                  </button>
                </div>
              )}
            </div>
          ) : <div className="w-9" />}
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={42} ring />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{post.author?.name || 'Unknown'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}</p>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <h1 className="px-4 pb-2 text-lg font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {post.title}
          </h1>
        )}

        {/* Content */}
        {post.content && post.content.trim() && post.content.trim() !== ' ' && (
          <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {post.content}
          </p>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Image — full width, natural ratio, no crop */}
        {mediaUrl && (
          <div className="w-full" style={{ background: 'var(--bg-secondary)' }}>
            <img
              src={mediaUrl}
              alt={post.title || 'Post image'}
              className="w-full h-auto block"
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
              onError={e => e.target.style.display = 'none'}
            />
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-5 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <button onClick={handleLike} className="flex items-center gap-1.5 group">
            {liked
              ? <FaHeart size={20} color="#ef4444" />
              : <FiHeart size={20} style={{ color: 'var(--text-muted)' }} className="group-hover:text-red-400 transition-colors" />
            }
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{likeCount}</span>
          </button>

          <button
            onClick={() => commentRef.current?.focus()}
            className="flex items-center gap-1.5"
          >
            <FiMessageCircle size={20} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{comments.length}</span>
          </button>
        </div>

        {/* Comments list */}
        <div className="px-4 py-4 flex flex-col gap-4 pb-28">
          {comments.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No comments yet — be the first!
            </p>
          ) : (
            comments.map(c => (
              <div key={c._id} className="flex gap-2.5">
                <Avatar src={c.author?.avatar} name={c.author?.name} size={32} />
                <div className="flex-1 min-w-0">
                  <div
                    className="rounded-2xl rounded-tl-none px-3 py-2"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {c.author?.name || 'Unknown'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.content || c.text || ''}
                    </p>
                  </div>
                  <p className="text-[11px] mt-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                    {c.createdAt ? dayjs(c.createdAt).fromNow() : 'Just now'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input — pinned above bottom nav */}
        <div
          className="fixed bottom-0 left-0 right-0 lg:sticky lg:bottom-0 border-t px-4 py-3 z-10"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleComment} className="flex gap-2 items-center">
              <Avatar src={user?.avatar} name={user?.name} size={32} />
              <div className="flex-1 relative">
                <input
                  ref={commentRef}
                  type="text"
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full rounded-2xl px-4 py-2.5 pr-10 text-sm outline-none border focus:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-30 transition-opacity"
                >
                  <FiSend size={15} color="#f59e0b" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}