import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi'
import { commentsAPI } from '../api'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export default function CommentsSheet({ postId, open, onClose, user, onGoToProfile }) {
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [showCommentMenu, setShowCommentMenu] = useState(null)
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null)
  const [deletingComment, setDeletingComment] = useState(false)
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
      setDeleteCommentTarget(null)
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
    if (!user) {
      toast.error('Log in to comment')
      onClose()
      navigate('/login')
      return
    }
    setSubmitting(true)
    try {
      await commentsAPI.create(postId, comment.trim())
      setComment('')
      await fetchComments()
      setTimeout(() => commentInputRef.current?.focus(), 100)
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
  }

  const requestDeleteComment = (commentId) => {
    setShowCommentMenu(null)
    setDeleteCommentTarget(commentId)
  }

  const confirmDeleteComment = async () => {
    if (!deleteCommentTarget) return
    setDeletingComment(true)
    try {
      await commentsAPI.delete(deleteCommentTarget)
      toast.success('Comment deleted')
      setComments(prev => prev.filter(c => c._id !== deleteCommentTarget))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment')
    } finally {
      setDeletingComment(false)
      setDeleteCommentTarget(null)
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 flex flex-col justify-end"
            style={{ zIndex: 9999, background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full flex flex-col rounded-t-3xl"
              style={{ background: 'var(--bg-primary)', maxHeight: '92vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Comments{comments.length > 0 && <span className="font-normal text-sm ml-1.5" style={{ color: 'var(--text-muted)' }}>({comments.length})</span>}
                </h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <FiX size={18} strokeWidth={2.5} />
                </button>
              </div>
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
                  <AnimatePresence initial={false}>
                    {comments.map(c => {
                      const isCommentOwner = isCurrentUser(c.author)
                      return (
                        <motion.div key={c._id} layout
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-3 items-start"
                        >
                          <div onClick={() => onGoToProfile(c.author)} className="cursor-pointer flex-shrink-0">
                            <Avatar src={c.author?.avatar} name={c.author?.name} size={32} className="mt-0.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm leading-snug flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-bold mr-1.5 cursor-pointer hover:underline" style={{ color: 'var(--text-primary)' }} onClick={() => onGoToProfile(c.author)}>
                                  {c.author?.name || 'Unknown'}
                                </span>
                                {c.content || c.text || ''}
                              </p>
                              {isCommentOwner && (
                                <div className="relative flex-shrink-0">
                                  <button onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)} className="p-1 rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <FiMoreHorizontal size={16} />
                                  </button>
                                  <AnimatePresence>
                                    {showCommentMenu === c._id && (
                                      <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }} className="absolute right-0 top-7 rounded-xl shadow-lg border py-1 w-36 z-10" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
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
              <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2.5 border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
                {['💙', '🙌', '🔥', '👏', '😢', '😍', '😭', '😂'].map(emoji => (
                  <motion.button key={emoji} type="button" onClick={() => setComment(c => c + emoji)} whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }} className="text-2xl flex-shrink-0">
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <div className="flex-shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <form onSubmit={handleComment} className="flex items-center gap-3">
                  <Avatar src={user?.avatar} name={user?.name} size={32} className="flex-shrink-0" />
                  <div className="flex-1 flex items-center rounded-full border px-4 py-3.5 focus-within:border-amber-500 transition-all" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <input ref={commentInputRef} type="text" placeholder="Add a comment…" value={comment} onChange={e => setComment(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text-primary)' }} />
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
      <AnimatePresence>
        {deleteCommentTarget && (
          <motion.div className="fixed inset-0 flex items-center justify-center px-4" style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => !deletingComment && setDeleteCommentTarget(null)}>
            <motion.div className="relative h-40 w-full max-w-sm rounded-3xl px-8 flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.18 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => !deletingComment && setDeleteCommentTarget(null)} disabled={deletingComment} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50" style={{ color: 'var(--text-muted)' }}>
                <FiX size={18} strokeWidth={2.5} />
              </button>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <FiTrash2 size={28} color="#ef4444" strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-extrabold text-center font-display px-2" style={{ color: 'var(--text-primary)' }}>
                Are you sure you want to delete this comment?
              </h3>
              <div className="flex items-center justify-center gap-6 mt-6">
                <button onClick={() => setDeleteCommentTarget(null)} disabled={deletingComment} className="px-6 py-2.5 rounded-full font-bold text-sm border transition-colors disabled:opacity-50" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  No, cancel
                </button>
                <button onClick={confirmDeleteComment} disabled={deletingComment} className="font-bold text-sm transition-colors disabled:opacity-60" style={{ color: '#ef4444' }}>
                  {deletingComment ? 'Deleting…' : "Yes, I'm sure"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}