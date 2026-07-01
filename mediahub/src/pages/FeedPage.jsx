import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList, FiX, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

// ── Shared Comments Bottom Sheet ──────────────────────────────────────────────
function CommentsSheet({ postId, open, onClose, user, onGoToProfile }) {
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [showCommentMenu, setShowCommentMenu] = useState(null)
  const commentInputRef = useRef()
  const commentsEndRef = useRef()

  const isCurrentUser = (author) => {
    if (!user || !author) return false
    const currentUserId = user._id || user.id
    const authorId = author._id || author.id || author
    return String(currentUserId) === String(authorId)
  }

  const fetchComments = async () => {
    if (!postId) return
    setLoadingComments(true)
    try {
      const response = await commentsAPI.getByPost(postId)
      setComments(response.data?.data || [])
    } catch { setComments([]) }
    finally { setLoadingComments(false) }
  }

  useEffect(() => {
    if (open && postId) {
      fetchComments()
      document.body.style.overflow = 'hidden'
      setTimeout(() => commentInputRef.current?.focus(), 350)
    } else {
      document.body.style.overflow = ''
      setComments([])
      setComment('')
      setShowCommentMenu(null)
    }
    return () => { document.body.style.overflow = '' }
  }, [open, postId])

  useEffect(() => {
    if (open && commentsEndRef.current) {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [comments, open])

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await commentsAPI.create(postId, comment.trim())
      setComment('')
      await fetchComments()
      setTimeout(() => commentInputRef.current?.focus(), 100)
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
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

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end transition-opacity duration-300"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none' }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col rounded-t-3xl transition-transform duration-300"
        style={{
          background: 'var(--bg-primary)',
          maxHeight: '80vh',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Comments{comments.length > 0 && <span className="font-normal text-sm ml-1.5" style={{ color: 'var(--text-muted)' }}>({comments.length})</span>}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 overscroll-contain">
          {loadingComments ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <FiMessageCircle size={36} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No comments yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Be the first to comment!</p>
            </div>
          ) : (
            comments.map(c => {
              const isCommentOwner = isCurrentUser(c.author)
              return (
                <div key={c._id} className="flex gap-3 items-start">
                  <div onClick={() => onGoToProfile(c.author)} className="cursor-pointer flex-shrink-0">
                    <Avatar src={c.author?.avatar} name={c.author?.name} size={32} className="mt-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                        <span
                          className="font-bold mr-1.5 cursor-pointer hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => onGoToProfile(c.author)}
                        >
                          {c.author?.name || 'Unknown'}
                        </span>
                        {c.content || c.text || ''}
                      </p>
                      {isCommentOwner && (
                        <div className="relative flex-shrink-0">
                          <button onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)} className="p-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <FiMoreHorizontal size={16} />
                          </button>
                          {showCommentMenu === c._id && (
                            <div className="absolute right-0 top-7 rounded-xl shadow-lg border py-1 w-36 z-10" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                              <button onClick={() => handleDeleteComment(c._id)} className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2">
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

        {/* Input */}
        <div className="flex-shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <form onSubmit={handleComment} className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.name} size={32} className="flex-shrink-0" />
            <div className="flex-1 flex items-center rounded-full border px-4 py-2 focus-within:border-amber-500 transition-all" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Add a comment…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              <button type="submit" disabled={!comment.trim() || submitting} className="flex-shrink-0 ml-2 text-sm font-bold text-amber-500 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── FeedPage ──────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [commentCounts, setCommentCounts] = useState({})
  const [activeCommentPostId, setActiveCommentPostId] = useState(null)
  const [showHeartAnimation, setShowHeartAnimation] = useState(null)
  const lastTapRef = useRef({})
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => { fetchPosts() }, [])

  const fetchPosts = async () => {
    try {
      const response = await postsAPI.getAll()
      const data = response.data
      let arr = []
      if (data?.data?.posts) arr = data.data.posts
      else if (data?.posts) arr = data.posts
      else if (Array.isArray(data?.data)) arr = data.data
      else if (Array.isArray(data)) arr = data
      setPosts(arr)

      const counts = {}
      await Promise.all(arr.map(async (post) => {
        try {
          const r = await commentsAPI.getByPost(post._id)
          counts[post._id] = (r.data?.data || []).length
        } catch {
          counts[post._id] = post.comments?.length || 0
        }
      }))
      setCommentCounts(counts)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (e, postId) => {
    e?.stopPropagation()
    try {
      await postsAPI.like(postId)
      fetchPosts()
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  const handleDoubleTap = (e, postId, navigateOnSingle = false) => {
    e.stopPropagation()
    const now = Date.now()
    const lastTap = lastTapRef.current[postId] || 0
    if (now - lastTap < 300) {
      handleLike(e, postId)
      setShowHeartAnimation(postId)
      setTimeout(() => setShowHeartAnimation(null), 800)
      lastTapRef.current[postId] = 0
    } else {
      lastTapRef.current[postId] = now
      if (navigateOnSingle) {
        setTimeout(() => {
          if (lastTapRef.current[postId] === now) navigate(`/posts/${postId}`)
        }, 300)
      }
    }
  }

  const openComments = (e, postId) => {
    e.stopPropagation()
    setActiveCommentPostId(postId)
  }

  // Navigate to a user's profile — own avatar goes to /profile, others go to /users/:id
  const goToProfile = (e, author) => {
    e?.stopPropagation()
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    if (String(authorId) === String(myId)) {
      navigate('/profile')
    } else {
      navigate(`/users/${authorId}`)
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

  const HeartAnimation = ({ postId }) => {
    if (showHeartAnimation !== postId) return null
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <FaHeart size={80} color="#ef4444" style={{ animation: 'likeHeart 0.8s ease-out forwards' }} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <FiImage size={40} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-2xl font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-muted)' }}>Share something with the world</p>
        <button onClick={() => navigate('/create')} className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full transition-colors text-sm shadow-lg shadow-amber-500/30">
          <FiPlusSquare size={20} strokeWidth={2.5} /> Create Post
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 sm:px-6 py-4" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <svg viewBox="330 300 590 590" width="44" height="44" xmlns="http://www.w3.org/2000/svg" className="rounded-full shadow-sm flex-shrink-0">
                <defs>
                  <linearGradient id="epFeedRibbonE" x1="300" y1="380" x2="620" y2="820" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f3e6d8" />
                    <stop offset="55%" stopColor="#f3e6d8" />
                    <stop offset="100%" stopColor="#8a6a4f" />
                  </linearGradient>
                  <linearGradient id="epFeedRibbonP" x1="900" y1="380" x2="580" y2="820" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f3e6d8" />
                    <stop offset="55%" stopColor="#f3e6d8" />
                    <stop offset="100%" stopColor="#8a6a4f" />
                  </linearGradient>
                </defs>

                <rect x="330" y="300" width="590" height="590" fill="#3c2f27" />

                <path
                  d="M600 320
                     C 470 320, 355 400, 355 500
                     C 355 545, 385 575, 430 590
                     C 385 605, 355 635, 355 680
                     C 355 780, 470 860, 600 860
                     L 600 790
                     C 500 790, 425 740, 425 685
                     C 425 655, 460 630, 520 615
                     L 520 565
                     C 460 550, 425 525, 425 495
                     C 425 440, 500 390, 600 390
                     Z"
                  fill="url(#epFeedRibbonE)"
                />

                <path
                  d="M600 320
                     C 600 320, 600 460, 600 490
                     C 600 545, 645 585, 715 590
                     C 645 595, 600 620, 600 665
                     C 600 700, 600 860, 600 860
                     L 670 860
                     C 670 860, 670 710, 670 680
                     C 670 650, 700 630, 760 625
                     C 830 620, 890 585, 890 530
                     C 890 470, 820 425, 730 415
                     C 700 411, 670 405, 670 380
                     C 670 350, 670 320, 670 320
                     Z"
                  fill="url(#epFeedRibbonP)"
                />

                <path
                  d="M520 605 L555 605 L568 585 L582 625 L596 605 L640 605"
                  fill="none"
                  stroke="#3c2f27"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.55"
                />
              </svg>
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>{posts.length} posts</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center rounded-full p-1 flex-shrink-0 shadow-sm" style={{ background: 'var(--bg-secondary)' }}>
                <button onClick={() => setViewMode('grid')} aria-label="Grid view" className="w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0" style={{ background: viewMode === 'grid' ? '#f59e0b' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)' }}>
                  <FiGrid size={19} strokeWidth={2.5} />
                </button>
                <button onClick={() => setViewMode('list')} aria-label="List view" className="w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0" style={{ background: viewMode === 'list' ? '#f59e0b' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)' }}>
                  <FiList size={19} strokeWidth={2.5} />
                </button>
              </div>
              <button onClick={() => navigate('/create')} aria-label="Create post" className="flex-shrink-0 flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg transition-colors font-bold text-sm whitespace-nowrap hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text-primary)' }}>
                <FiPlusSquare size={19} strokeWidth={2.5} className="flex-shrink-0" />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-5 pb-3">
          <div className="h-6" />

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {posts.map((post) => {
                const imageUrl = getImageUrl(post)
                const isLiked = post.likes?.includes(user?._id)
                const commentCount = commentCounts[post._id] ?? post.comments?.length ?? 0
                return (
                  <div
                    key={post._id}
                    onClick={(e) => handleDoubleTap(e, post._id, true)}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-lg transition-shadow"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={post.title || 'Post'} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiImage size={26} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}

                    {/* Author avatar badge (top-left) — click goes to their profile */}
                    <div
                      onClick={(e) => goToProfile(e, post.author)}
                      className="absolute top-2.5 left-2.5 cursor-pointer"
                    >
                      <Avatar
                        src={post.author?.avatar}
                        name={post.author?.name}
                        size={28}
                        className="ring-2 ring-white/70 shadow-md"
                      />
                    </div>

                    <HeartAnimation postId={post._id} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />

                    {/* Like / comment — padded, rounded hit-areas so they're easy to tap over the image */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); handleLike(e, post._id) }}
                        className="flex items-center gap-1 text-white rounded-full px-2.5 py-1.5 hover:bg-black/30 active:scale-95 transition-all"
                      >
                        {isLiked ? <FaHeart size={15} color="#ef4444" /> : <FiHeart size={15} strokeWidth={2.5} className="drop-shadow-lg" />}
                        <span className="text-xs font-semibold drop-shadow-lg">{post.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={e => openComments(e, post._id)}
                        className="flex items-center gap-1 text-white rounded-full px-2.5 py-1.5 hover:bg-black/30 active:scale-95 transition-all"
                      >
                        <FiMessageCircle size={15} strokeWidth={2.5} className="drop-shadow-lg" />
                        <span className="text-xs font-semibold drop-shadow-lg">{commentCount}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // List view
            <>
              {/* Mobile single column */}
              <div className="block md:hidden space-y-6">
                {posts.map((post) => {
                  const imageUrl = getImageUrl(post)
                  const isLiked = post.likes?.includes(user?._id)
                  const commentCount = commentCounts[post._id] ?? post.comments?.length ?? 0
                  return (
                    <div key={post._id} className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                      {imageUrl && (
                        <div className="w-full mb-3 relative cursor-pointer" style={{ background: 'var(--bg-secondary)' }} onClick={e => handleDoubleTap(e, post._id)}>
                          <img src={imageUrl} alt={post.title || 'Post'} className="w-full h-auto" style={{ maxHeight: 400, objectFit: 'cover' }} loading="lazy" onError={e => e.target.style.display = 'none'} />
                          <HeartAnimation postId={post._id} />
                        </div>
                      )}
                      <div className="px-1">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer flex-shrink-0">
                              <Avatar src={post.author?.avatar} name={post.author?.name} size={32} />
                            </div>
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/posts/${post._id}`)}>
                              <p
                                className="font-bold text-sm hover:underline inline-block"
                                style={{ color: 'var(--text-primary)' }}
                                onClick={(e) => goToProfile(e, post.author)}
                              >
                                {post.author?.name || 'Unknown'}
                              </p>
                              {post.title && <h3 className="font-extrabold font-display text-base leading-snug" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>}
                              {post.content && post.content.trim() !== ' ' && post.content !== post.title && (
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 self-center -mr-1.5">
                            <button
                              onClick={e => handleLike(e, post._id)}
                              className="flex items-center gap-1 rounded-full px-2.5 py-2 hover:bg-[var(--bg-secondary)] active:scale-95 transition-all"
                            >
                              {isLiked ? <FaHeart size={16} color="#ef4444" /> : <FiHeart size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
                              <span className="text-xs font-bold" style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>{post.likes?.length || 0}</span>
                            </button>
                            <button
                              onClick={e => openComments(e, post._id)}
                              className="flex items-center gap-1 rounded-full px-2.5 py-2 hover:bg-[var(--bg-secondary)] active:scale-95 transition-all"
                            >
                              <FiMessageCircle size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{commentCount}</span>
                            </button>
                          </div>
                        </div>
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {post.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                          {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop 3-column */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => {
                  const imageUrl = getImageUrl(post)
                  const isLiked = post.likes?.includes(user?._id)
                  const commentCount = commentCounts[post._id] ?? post.comments?.length ?? 0
                  return (
                    <div key={post._id} className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                      {imageUrl && (
                        <div className="w-full relative cursor-pointer" onClick={e => handleDoubleTap(e, post._id)}>
                          <img src={imageUrl} alt={post.title || 'Post'} className="w-full aspect-square object-cover" loading="lazy" onError={e => e.target.style.display = 'none'} />
                          <HeartAnimation postId={post._id} />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer flex-shrink-0">
                              <Avatar src={post.author?.avatar} name={post.author?.name} size={28} />
                            </div>
                            <p
                              className="font-semibold text-sm truncate cursor-pointer hover:underline"
                              style={{ color: 'var(--text-primary)' }}
                              onClick={(e) => goToProfile(e, post.author)}
                            >
                              {post.author?.name || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1">
                            <button
                              onClick={e => handleLike(e, post._id)}
                              className="flex items-center gap-0.5 rounded-full px-2 py-1.5 hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
                            >
                              {isLiked ? <FaHeart size={14} color="#ef4444" /> : <FiHeart size={14} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
                              <span className="text-xs font-semibold" style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>{post.likes?.length || 0}</span>
                            </button>
                            <button
                              onClick={e => openComments(e, post._id)}
                              className="flex items-center gap-0.5 rounded-full px-2 py-1.5 hover:bg-[var(--bg-primary)] active:scale-95 transition-all"
                            >
                              <FiMessageCircle size={14} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{commentCount}</span>
                            </button>
                          </div>
                        </div>
                        {post.title && <h3 className="font-extrabold font-display text-sm mt-1 leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>}
                        {post.content && post.content.trim() !== ' ' && post.content !== post.title && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
                        )}
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {post.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                          {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comments sheet — renders above everything including the nav bar */}
      <CommentsSheet
        postId={activeCommentPostId}
        open={!!activeCommentPostId}
        onClose={() => setActiveCommentPostId(null)}
        user={user}
        onGoToProfile={(author) => goToProfile(null, author)}
      />

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