import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHeart, FiMessageCircle, FiTrash2, FiMoreHorizontal, FiX } from 'react-icons/fi'
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
  const [showCommentMenu, setShowCommentMenu] = useState(null)
  const [showComments, setShowComments] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const lastTapRef = useRef(0)
  const commentInputRef = useRef()
  const commentsEndRef = useRef()
  const sheetRef = useRef()

  const isCurrentUser = (author) => {
    if (!user || !author) return false
    const currentUserId = user._id || user.id
    const authorId = author._id || author.id || author
    return String(currentUserId) === String(authorId)
  }

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

  // Scroll to bottom of comments when sheet opens or new comment added
  useEffect(() => {
    if (showComments && commentsEndRef.current) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [comments, showComments])

  // Focus input when sheet opens
  useEffect(() => {
    if (showComments) {
      setTimeout(() => commentInputRef.current?.focus(), 300)
    }
  }, [showComments])

  // Close sheet on backdrop click
  const handleBackdropClick = (e) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target)) {
      setShowComments(false)
    }
  }

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

  const handleImageDoubleTap = (e) => {
    e.stopPropagation()
    const now = Date.now()
    const lastTap = lastTapRef.current
    if (now - lastTap < 300) {
      handleLike()
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 800)
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
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
      setTimeout(() => commentInputRef.current?.focus(), 100)
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await commentsAPI.delete(commentId)
      toast.success('Comment deleted')
      setComments(prev => prev.filter(c => c._id !== commentId))
      setShowCommentMenu(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return
    setIsDeleting(true)
    setShowMenu(false)
    try {
      await postsAPI.delete(id)
      toast.success('Post deleted')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post')
      setIsDeleting(false)
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
  const isOwner = isCurrentUser(post.author)

  return (
    <>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div
            className="sticky top-0 z-20 border-b backdrop-blur-lg px-4 py-3"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <FiArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Back</span>
              </button>
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    disabled={isDeleting}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <FiMoreHorizontal size={18} style={{ color: 'var(--text-primary)' }} />
                  </button>
                  {showMenu && !isDeleting && (
                    <div
                      className="absolute right-0 top-10 rounded-xl shadow-lg border py-1 w-40 z-30"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                    >
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                      >
                        <FiTrash2 size={16} /> Delete Post
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isOwner && <div className="w-8" />}
            </div>
          </div>

          {/* Image with double-tap to like */}
          {mediaUrl && (
            <div
              className="w-full relative cursor-pointer select-none"
              style={{ background: 'var(--bg-secondary)' }}
              onClick={handleImageDoubleTap}
            >
              <img
                src={mediaUrl}
                alt={post.title || 'Post image'}
                className="w-full h-auto"
                style={{ maxHeight: 520, objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'}
              />
              {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <FaHeart
                    size={100}
                    color="#ef4444"
                    style={{ animation: 'likeHeart 0.8s ease-out forwards' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Post content */}
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar src={post.author?.avatar} name={post.author?.name} size={36} className="flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {post.author?.name || 'Unknown'}
                  </p>
                  {post.title && (
                    <h3 className="font-extrabold font-display text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {post.title}
                    </h3>
                  )}
                  {post.content && post.content.trim() && post.content.trim() !== ' ' && post.content !== post.title && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {post.content}
                    </p>
                  )}
                </div>
              </div>

              {/* Like + Comment actions */}
              <div className="flex items-center gap-4 flex-shrink-0 ml-3 self-center">
                <button
                  onClick={handleLike}
                  className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
                >
                  {liked
                    ? <FaHeart size={22} color="#ef4444" />
                    : <FiHeart size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />}
                  <span className="text-[11px] font-bold" style={{ color: liked ? '#ef4444' : 'var(--text-muted)' }}>
                    {likeCount}
                  </span>
                </button>
                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
                >
                  <FiMessageCircle size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    {comments.length}
                  </span>
                </button>
              </div>
            </div>

            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
            </p>

            {/* Tap to open comments hint */}
            <button
              onClick={() => setShowComments(true)}
              className="mt-3 text-sm font-semibold hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              {comments.length === 0
                ? 'Be the first to comment…'
                : `View all ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
            </button>
          </div>

        </div>
      </div>

      {/* ── Comments Bottom Sheet ── */}
      {showComments && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={handleBackdropClick}
        >
          <div
            ref={sheetRef}
            className="w-full rounded-t-3xl flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              maxHeight: '82vh',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
            }}
          >
            {/* Sheet handle + header */}
            <div
              className="flex-shrink-0 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Comments
                </h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FiX size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Comments list — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <FiMessageCircle size={36} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No comments yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Be the first to comment!</p>
                </div>
              ) : (
                comments.map(c => {
                  const isCommentOwner = isCurrentUser(c.author)
                  return (
                    <div key={c._id} className="flex gap-3 items-start">
                      <Avatar src={c.author?.avatar} name={c.author?.name} size={32} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold mr-2" style={{ color: 'var(--text-primary)' }}>
                              {c.author?.name || 'Unknown'}
                            </span>
                            <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                              {c.content || c.text || ''}
                            </span>
                          </div>
                          {isCommentOwner && (
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)}
                                className="p-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                <FiMoreHorizontal size={16} />
                              </button>
                              {showCommentMenu === c._id && (
                                <div
                                  className="absolute right-0 top-7 rounded-xl shadow-lg border py-1 w-40 z-30"
                                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                                >
                                  <button
                                    onClick={() => handleDeleteComment(c._id)}
                                    className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                                  >
                                    <FiTrash2 size={14} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {c.createdAt ? dayjs(c.createdAt).fromNow() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input — pinned to bottom of sheet */}
            <div
              className="flex-shrink-0 border-t px-4 py-3"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-primary)',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              }}
            >
              <form onSubmit={handleComment} className="flex items-center gap-3">
                <Avatar src={user?.avatar} name={user?.name} size={32} className="flex-shrink-0" />
                <div
                  className="flex-1 flex items-center rounded-full border px-4 py-2 focus-within:border-amber-500 transition-all"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                >
                  <input
                    ref={commentInputRef}
                    type="text"
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim() || submitting}
                    className="flex-shrink-0 ml-2 text-sm font-bold text-amber-500 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes likeHeart {
          0%   { transform: scale(0.5); opacity: 1; }
          50%  { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
    </>
  )
}