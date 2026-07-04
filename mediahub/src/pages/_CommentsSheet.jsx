import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiMoreHorizontal, FiTrash2, FiSend } from 'react-icons/fi'
import { commentsAPI } from '../api'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const SHEET_Z = 2147483000
const MODAL_Z = 2147483600

/**
 * Bottom-sheet comments UI. Portals to <body> so nothing (bottom nav, FABs,
 * transformed ancestors) can cover it.
 *
 * Props:
 *  - postId
 *  - open, onClose
 *  - user
 *  - onGoToProfile(author)
 *  - postOwnerId?         // if provided, post owner can also delete any comment
 *  - onCountChange?(n)    // notify parent when comment count changes
 */
export default function CommentsSheet({
  postId,
  open,
  onClose,
  user,
  onGoToProfile,
  postOwnerId,
  onCountChange,
}) {
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

  const currentUserId = user?._id || user?.id
  const isCurrentUser = (author) => {
    if (!currentUserId || !author) return false
    const authorId = author._id || author.id || author
    return String(currentUserId) === String(authorId)
  }
  const isPostOwner = postOwnerId && String(postOwnerId) === String(currentUserId)

  const fetchComments = async () => {
    if (!postId) return
    setLoadingComments(true)
    try {
      const response = await commentsAPI.getByPost(postId)
      const list = response.data?.data || []
      setComments(list)
      onCountChange?.(list.length)
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
      setComment('')
      setShowCommentMenu(null)
      setDeleteCommentTarget(null)
    }
    return () => { document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setComments(prev => {
        const next = prev.filter(c => c._id !== deleteCommentTarget)
        onCountChange?.(next.length)
        return next
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment')
    } finally {
      setDeletingComment(false)
      setDeleteCommentTarget(null)
    }
  }

  const sheet = (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 flex flex-col justify-end"
            style={{ zIndex: SHEET_Z, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full flex flex-col rounded-t-[28px] mx-auto"
              style={{
                background: 'var(--bg-primary)',
                maxHeight: '90vh',
                maxWidth: 640,
                boxShadow: '0 -12px 48px rgba(0,0,0,0.35)',
              }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Grabber */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-12 h-[5px] rounded-full" style={{ background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Comments
                  </h3>
                  {comments.length > 0 && (
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {comments.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close comments"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] active:scale-90 transition"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FiX size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="h-px w-full" style={{ background: 'var(--border)', opacity: 0.6 }} />

              {/* List */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain">
                {loadingComments ? (
                  <div className="flex justify-center py-14">
                    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-amber-500 border-t-transparent" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <FiMessageCircle size={28} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No comments yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start the conversation</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {comments.map(c => {
                      const canDelete = isCurrentUser(c.author) || isPostOwner
                      return (
                        <motion.div
                          key={c._id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.18 }}
                          className="flex gap-3 items-start px-2 py-2.5 rounded-2xl hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          <div onClick={() => onGoToProfile?.(c.author)} className="cursor-pointer flex-shrink-0">
                            <Avatar src={c.author?.avatar} name={c.author?.name} size={36} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-bold text-sm cursor-pointer hover:underline truncate"
                                    style={{ color: 'var(--text-primary)' }}
                                    onClick={() => onGoToProfile?.(c.author)}
                                  >
                                    {c.author?.name || 'Unknown'}
                                  </span>
                                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    {c.createdAt ? dayjs(c.createdAt).fromNow() : 'now'}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed mt-0.5 break-words" style={{ color: 'var(--text-secondary)' }}>
                                  {c.content || c.text || ''}
                                </p>
                              </div>

                              {canDelete && (
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={() => setShowCommentMenu(showCommentMenu === c._id ? null : c._id)}
                                    aria-label="Comment options"
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-primary)] active:scale-90 transition"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <FiMoreHorizontal size={16} />
                                  </button>
                                  <AnimatePresence>
                                    {showCommentMenu === c._id && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-9 rounded-xl shadow-xl border py-1 w-36 z-10"
                                        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                                      >
                                        <button
                                          onClick={() => requestDeleteComment(c._id)}
                                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                                        >
                                          <FiTrash2 size={14} /> Delete
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Quick reactions */}
              <div
                className="flex-shrink-0 flex items-center gap-1 px-3 py-2 overflow-x-auto"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {['❤️', '🙌', '🔥', '👏', '😍', '😂', '😢', '🎉'].map(emoji => (
                  <motion.button
                    key={emoji}
                    type="button"
                    onClick={() => setComment(c => c + emoji)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.85 }}
                    className="w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-[var(--bg-secondary)] flex-shrink-0"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Input */}
              <div
                className="flex-shrink-0 px-4 pt-3"
                style={{
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
                }}
              >
                <form onSubmit={handleComment} className="flex items-center gap-2.5">
                  <Avatar src={user?.avatar} name={user?.name} size={36} className="flex-shrink-0" />
                  <div
                    className="flex-1 flex items-center rounded-full pl-4 pr-1.5 py-1.5 border transition-all focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <input
                      ref={commentInputRef}
                      type="text"
                      placeholder="Add a comment…"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm py-2 min-w-0"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <motion.button
                      type="submit"
                      disabled={!comment.trim() || submitting}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Post comment"
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] transition-colors"
                    >
                      <FiSend size={16} strokeWidth={2.5} className="-ml-0.5" />
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteCommentTarget && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ zIndex: MODAL_Z, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !deletingComment && setDeleteCommentTarget(null)}
          >
            <motion.div
              className="relative w-full max-w-sm rounded-3xl px-6 py-7 flex flex-col items-center"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
              }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => !deletingComment && setDeleteCommentTarget(null)}
                disabled={deletingComment}
                aria-label="Close"
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition disabled:opacity-50"
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

              <h3 className="text-base font-extrabold text-center px-2" style={{ color: 'var(--text-primary)' }}>
                Delete this comment?
              </h3>
              <p className="text-sm text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
                This action can't be undone.
              </p>

              <div className="flex items-center justify-center gap-3 mt-6 w-full">
                <button
                  onClick={() => setDeleteCommentTarget(null)}
                  disabled={deletingComment}
                  className="flex-1 h-11 rounded-full font-bold text-sm border transition-colors disabled:opacity-50"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteComment}
                  disabled={deletingComment}
                  className="flex-1 h-11 rounded-full font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {deletingComment ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(sheet, document.body)
}
