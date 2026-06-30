import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHeart, FiMessageCircle, FiTrash2, FiMoreHorizontal } from 'react-icons/fi'
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
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const lastTapRef = useRef(0)
  const commentInputRef = useRef()
  const commentsEndRef = useRef()

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

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

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
      toast.success('Comment added!')
      setTimeout(() => commentInputRef.current?.focus(), 100)
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return
    try {
      await commentsAPI.delete(commentId)
      toast.success('Comment deleted')
      await fetchComments()
    } catch (error) {
      toast.error('Failed to delete comment')
    }
    setShowCommentMenu(null)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await postsAPI.delete(id)
      toast.success('Post deleted successfully')
      navigate('/')
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const focusCommentInput = () => {
    commentInputRef.current?.focus()
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

  const HeartAnimation = () => {
    if (!showHeartAnimation) return null
    
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <FaHeart 
          size={100} 
          color="#ef4444"
          className="animate-like-heart"
          style={{
            animation: 'likeHeart 0.8s ease-out forwards'
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6" style={{ background: 'var(--bg-primary)' }}>
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
            {isOwner ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <FiMoreHorizontal size={18} style={{ color: 'var(--text-primary)' }} />
                </button>
                {showMenu && (
                  <div
                    className="absolute right-0 top-10 rounded-xl shadow-lg border py-1 w-36 z-30"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  >
                    <button
                      onClick={() => { setShowMenu(false); handleDelete() }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                    >
                      <FiTrash2 size={16} /> Delete Post
                    </button>
                  </div>
                )}
              </div>
            ) : <div className="w-8" />}
          </div>
        </div>

        {/* Image - with double tap support */}
        {mediaUrl && (
          <div 
            className="w-full relative cursor-pointer"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={handleImageDoubleTap}
          >
            <img
              src={mediaUrl}
              alt={post.title || 'Post image'}
              className="w-full h-auto"
              style={{ maxHeight: 500, objectFit: 'cover' }}
              onError={e => e.target.style.display = 'none'}
            />
            <HeartAnimation />
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar src={post.author?.avatar} name={post.author?.name} size={32} className="flex-shrink-0" />
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
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {post.content}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0 ml-2 self-center">
              <button 
                onClick={handleLike} 
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                {liked
                  ? <FaHeart size={16} color="#ef4444" />
                  : <FiHeart size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
                <span className="text-xs font-bold" style={{ color: liked ? '#ef4444' : 'var(--text-muted)' }}>
                  {likeCount}
                </span>
              </button>
              <button 
                onClick={focusCommentInput}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <FiMessageCircle size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {comments.length}
                </span>
              </button>
            </div>
          </div>

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
          </p>
        </div>

        {/* Comments section */}
        <div className="px-4 space-y-3 pb-6">
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Comments ({comments.length})
          </h4>
          
          {comments.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No comments yet — be the first!
            </p>
          ) : (
            comments.map(c => {
              const isCommentOwner = user?._id === c.author?._id || user?.id === c.author?._id
              return (
                <div key={c._id} className="flex gap-2 items-start">
                  <Avatar src={c.author?.avatar} name={c.author?.name} size={28} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div
                      className="rounded-2xl rounded-tl-none px-3 py-1.5"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {c.author?.name || 'Unknown'}
                        </p>
                        {isCommentOwner && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)}
                              className="p-1.5 hover:bg-[var(--bg-primary)] rounded-full transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <FiMoreHorizontal size={18} strokeWidth={2.5} />
                            </button>
                            {showCommentMenu === c._id && (
                              <div
                                className="absolute right-0 top-7 rounded-lg shadow-lg border py-1 w-36 z-30"
                                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                              >
                                <button
                                  onClick={() => handleDeleteComment(c._id)}
                                  className="w-full text-left px-3 py-2 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                                >
                                  <FiTrash2 size={14} /> Delete Comment
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {c.content || c.text || ''}
                      </p>
                    </div>
                    <p className="text-[11px] mt-0.5 ml-1" style={{ color: 'var(--text-muted)' }}>
                      {c.createdAt ? dayjs(c.createdAt).fromNow() : 'Just now'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment input */}
        <div
          className="sticky bottom-0 left-0 right-0 bg-[var(--bg-primary)] border-t px-4 py-3 z-10"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleComment} className="flex items-center gap-2">
              <Avatar src={user?.avatar} name={user?.name} size={32} className="flex-shrink-0" />
              <div className="flex-1 flex items-center bg-[var(--bg-input)] rounded-full border px-4 py-1.5 focus-within:border-amber-500 transition-all" style={{ borderColor: 'var(--border)' }}>
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm py-2"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || submitting}
                  className="flex-shrink-0 ml-2 text-sm font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes likeHeart {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-like-heart {
          animation: likeHeart 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}