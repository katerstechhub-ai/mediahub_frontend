import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiHeart, FiMessageCircle, FiTrash2, FiMoreHorizontal, FiX } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import { getImageUrls, ImageSlider } from '../components/PostMedia'
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
  const [postVisible, setPostVisible] = useState(true) // drives the post's exit animation before navigating away
  // deleteTarget: { type: 'post' } | { type: 'comment', id: string } | null
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingComment, setDeletingComment] = useState(false)
  const lastTapRef = useRef(0)
  const commentInputRef = useRef()
  const commentsEndRef = useRef()

  const isCurrentUser = (author) => {
    if (!user || !author) return false
    const currentUserId = user._id || user.id
    const authorId = author._id || author.id || author
    return String(currentUserId) === String(authorId)
  }

  // Own avatar -> /profile, everyone else -> /users/:id
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

  const fetchComments = async () => {
    try {
      const response = await commentsAPI.getByPost(id)
      setComments(response.data?.data || [])
    } catch { setComments([]) }
  }

  const fetchPost = async () => {
    try {
      const response = await postsAPI.getOne(id)
      const p = response.data?.data || response.data?.post || response.data || response
      setPost(p)
      await fetchComments()
      const userId = user?._id || user?.id
      if (userId && p.likes) setLiked(p.likes.includes(userId))
      setLikeCount(p.likes?.length || 0)
    } catch {
      toast.error('Post not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPost() }, [id])

  useEffect(() => {
    if (showComments && commentsEndRef.current) {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [comments, showComments])

  useEffect(() => {
    if (showComments) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => commentInputRef.current?.focus(), 350)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showComments])

  const handleLike = async () => {
    if (!user) {
      toast.error('Log in to like posts')
      navigate('/login')
      return
    }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try { await postsAPI.like(id) } catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  const handleImageDoubleTap = (e) => {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      handleLike()
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 700) // matches the exit animation duration below
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    if (!user) {
      toast.error('Log in to comment')
      navigate('/login')
      return
    }
    setSubmitting(true)
    try {
      await commentsAPI.create(id, comment.trim())
      setComment('')
      await fetchComments()
      setTimeout(() => commentInputRef.current?.focus(), 100)
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
  }

  // Opens the modal instead of window.confirm — used for both post + comment
  const requestDeleteComment = (commentId) => {
    setShowCommentMenu(null)
    setDeleteTarget({ type: 'comment', id: commentId })
  }

  const requestDeletePost = () => {
    setShowMenu(false)
    setDeleteTarget({ type: 'post' })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'comment') {
      setDeletingComment(true)
      try {
        await commentsAPI.delete(deleteTarget.id)
        toast.success('Comment deleted')
        setComments(prev => prev.filter(c => c._id !== deleteTarget.id))
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete comment')
      } finally {
        setDeletingComment(false)
        setDeleteTarget(null)
      }
      return
    }

    // post
    setIsDeleting(true)
    try {
      await postsAPI.delete(id)
      toast.success('Post deleted')
      setDeleteTarget(null)
      setPostVisible(false) // plays the exit animation; navigation happens once it finishes
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post')
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (!post) return null

  const mediaUrls = getImageUrls(post)
  const hasMedia = mediaUrls.length > 0
  const isOwner = isCurrentUser(post.author)
  const isDeletingActive = deleteTarget?.type === 'post' ? isDeleting : deletingComment

  return (
    <>
      {/* ── Post page itself — fades/scales out on delete, then navigates away ── */}
      <AnimatePresence onExitComplete={() => { if (!postVisible) navigate('/') }}>
        {postVisible && (
          <motion.div
            key="post-detail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-screen"
            style={{ background: 'var(--bg-primary)' }}
          >
            <div className="max-w-2xl mx-auto">

              {/* Header */}
              <div className="sticky top-0 z-20 border-b backdrop-blur-lg px-4 py-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] active:scale-90 transition-all"
                  >
                    <FiArrowLeft size={20} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
                  </button>
                  {isOwner && (
                    <div className="relative">
                      <button onClick={() => setShowMenu(v => !v)} disabled={isDeleting} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors">
                        <FiMoreHorizontal size={18} style={{ color: 'var(--text-primary)' }} />
                      </button>
                      <AnimatePresence>
                        {showMenu && !isDeleting && (
                          <motion.div
                            key="post-menu"
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-10 rounded-xl shadow-lg border py-1 w-40 z-30"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                          >
                            <button onClick={requestDeletePost} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2">
                              <FiTrash2 size={16} /> Delete Post
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  {!isOwner && <div className="w-8" />}
                </div>
              </div>

              {/* Image(s) */}
              {hasMedia && (
                <div
                  className="w-full relative select-none"
                  style={{ background: 'var(--bg-secondary)', height: mediaUrls.length === 1 ? 'auto' : 420 }}
                >
                  {mediaUrls.length === 1 ? (
                    <div className="cursor-pointer" onClick={handleImageDoubleTap}>
                      <img
                        src={mediaUrls[0]}
                        alt={post.title || 'Post image'}
                        className="w-full h-auto"
                        style={{ maxHeight: 520, objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'}
                      />
                    </div>
                  ) : (
                    <ImageSlider
                      urls={mediaUrls}
                      title={post.title}
                      postId={post._id}
                      onDoubleTap={handleImageDoubleTap}
                      rounded=""
                      className="w-full h-full"
                    />
                  )}
                  {/* Author avatar badge overlaid top-left on the image — same treatment as feed */}
                  <div
                    onClick={(e) => goToProfile(e, post.author)}
                    className="absolute top-2.5 left-2.5 cursor-pointer z-10"
                  >
                    <Avatar
                      src={post.author?.avatar}
                      name={post.author?.name}
                      size={36}
                      className="ring-2 ring-white/70 shadow-md"
                    />
                  </div>
                  <AnimatePresence>
                    {showHeartAnimation && (
                      <motion.div
                        key="like-heart"
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: 1.4, opacity: 1 }}
                        exit={{ scale: 1.8, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        <FaHeart size={100} color="#ef4444" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Post content */}
              <div className="px-4 pt-3 pb-8">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      {!hasMedia && (
                        <div onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer flex-shrink-0">
                          <Avatar src={post.author?.avatar} name={post.author?.name} size={36} />
                        </div>
                      )}
                      <p
                        className="font-bold text-sm cursor-pointer hover:underline inline-block"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={(e) => goToProfile(e, post.author)}
                      >
                        {post.author?.name || 'Unknown'}
                      </p>
                    </div>
                    {post.title && <h3 className="font-extrabold font-display text-base leading-snug" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>}
                    {post.content && post.content.trim() && post.content.trim() !== ' ' && post.content !== post.title && (
                      <p
                        className="post-content-scroll text-sm mt-0.5 whitespace-pre-wrap overflow-y-auto pr-3"
                        style={{ color: 'var(--text-secondary)', maxHeight: '9rem' }}
                      >
                        {post.content}
                      </p>
                    )}
                  </div>

                  {/* Like / comment */}
                  <div className="flex items-center gap-1 flex-shrink-0 self-start -mt-1 mr-2">
                    <motion.button
                      onClick={handleLike}
                      whileTap={{ scale: 0.85 }}
                      className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {liked ? (
                          <motion.span
                            key="liked"
                            initial={{ scale: 0.6 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          >
                            <FaHeart size={22} color="#ef4444" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="unliked"
                            initial={{ scale: 0.6 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <FiHeart size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <span className="text-[11px] font-bold" style={{ color: liked ? '#ef4444' : 'var(--text-muted)' }}>{likeCount}</span>
                    </motion.button>
                    <motion.button
                      onClick={() => setShowComments(true)}
                      whileTap={{ scale: 0.85 }}
                      className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <FiMessageCircle size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>{comments.length}</span>
                    </motion.button>
                  </div>
                </div>

                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>#{tag}</span>
                    ))}
                  </div>
                )}

                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
                </p>

                <button onClick={() => setShowComments(true)} className="mt-3 text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {comments.length === 0 ? 'Be the first to comment…' : `View all ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Comments Bottom Sheet ── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            key="comments-overlay"
            className="fixed inset-0 flex flex-col justify-end"
            style={{ zIndex: 9999, background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setShowComments(false)}
          >
            <motion.div
              className="w-full flex flex-col rounded-t-3xl"
              style={{ background: 'var(--bg-primary)', maxHeight: '92vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Comments{comments.length > 0 && <span className="font-normal text-sm ml-1.5" style={{ color: 'var(--text-muted)' }}>({comments.length})</span>}
                </h3>
                <button onClick={() => setShowComments(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <FiX size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 overscroll-contain">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2">
                    <FiMessageCircle size={36} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No comments yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Be the first to comment!</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {comments.map(c => {
                      const isCommentOwner = isCurrentUser(c.author)
                      const canDelete = isCommentOwner || isOwner
                      return (
                        <motion.div
                          key={c._id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-3 items-start"
                        >
                          <div onClick={(e) => goToProfile(e, c.author)} className="cursor-pointer flex-shrink-0">
                            <Avatar src={c.author?.avatar} name={c.author?.name} size={32} className="mt-0.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm leading-snug flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                                <span
                                  className="font-bold mr-1.5 cursor-pointer hover:underline"
                                  style={{ color: 'var(--text-primary)' }}
                                  onClick={(e) => goToProfile(e, c.author)}
                                >
                                  {c.author?.name || 'Unknown'}
                                </span>
                                {c.content || c.text || ''}
                              </p>
                              {canDelete && (
                                <div className="relative flex-shrink-0">
                                  <button onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)} className="p-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <FiMoreHorizontal size={16} />
                                  </button>
                                  <AnimatePresence>
                                    {showCommentMenu === c._id && (
                                      <motion.div
                                        key="comment-menu"
                                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-7 rounded-xl shadow-lg border py-1 w-36 z-10"
                                        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                                      >
                                        <button onClick={() => requestDeleteComment(c._id)} className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2">
                                          <FiTrash2 size={14} /> Delete
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                              {c.createdAt ? dayjs(c.createdAt).fromNow() : 'Just now'}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Quick reactions */}
              <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2.5 border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
                {['💙', '🙌', '🔥', '👏', '😢', '😍', '😭', '😂'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setComment(c => c + emoji)}
                    className="text-2xl flex-shrink-0 hover:scale-125 active:scale-95 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Comment input */}
              <div className="flex-shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <form onSubmit={handleComment} className="flex items-center gap-3">
                  <Avatar src={user?.avatar} name={user?.name} size={32} className="flex-shrink-0" />
                  <div className="flex-1 flex items-center rounded-full border px-4 py-3.5 focus-within:border-amber-500 transition-all" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            key="delete-overlay"
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isDeletingActive && setDeleteTarget(null)}
          >
            <motion.div
              className="relative h-40 w-full max-w-sm rounded-3xl px-8 flex flex-col items-center justify-center"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => !isDeletingActive && setDeleteTarget(null)}
                disabled={isDeletingActive}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-muted)' }}
              >
                <FiX size={18} strokeWidth={2.5} />
              </button>

              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(239,68,68,0.12)' }}
              >
                <FiTrash2 size={28} color="#ef4444" strokeWidth={2.5} />
              </div>

              <h3 className="text-base font-extrabold text-center font-display px-2" style={{ color: 'var(--text-primary)' }}>
                Are you sure you want to delete this {deleteTarget?.type === 'post' ? 'post' : 'comment'}?
              </h3>

              <div className="flex items-center justify-center gap-6 mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeletingActive}
                  className="px-6 py-2.5 rounded-full font-bold text-sm border transition-colors disabled:opacity-50"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  No, cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeletingActive}
                  className="font-bold text-sm transition-colors disabled:opacity-60"
                  style={{ color: '#ef4444' }}
                >
                  {isDeletingActive ? 'Deleting…' : "Yes, I'm sure"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .post-content-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .post-content-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .post-content-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .post-content-scroll::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 999px;
        }
        .post-content-scroll::-webkit-scrollbar-thumb:hover {
          background-color: var(--text-muted);
        }
      `}</style>
    </>
  )
}