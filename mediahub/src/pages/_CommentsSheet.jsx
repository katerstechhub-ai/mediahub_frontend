import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiSend, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { commentsAPI } from '../api'
import { Avatar } from '../components/ui'

function unwrapComments(payload) {
  const data = payload?.data
  const rows = data?.comments || payload?.comments || data || payload
  return Array.isArray(rows) ? rows : []
}

function normalizeAuthor(user) {
  if (!user) return { name: 'You', avatar: null }
  return {
    _id: user._id || user.id,
    name: user.name || user.username || user.fullName || 'You',
    avatar: user.avatar || user.avatarUrl || user.profileImage || null,
  }
}

function relativeTime(value) {
  if (!value) return 'Just now'
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function CommentsSheet({
  postId,
  open,
  onClose,
  user,
  onGoToProfile,
  postOwnerId,
  onCountChange,
}) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open || !postId) return undefined
    let cancelled = false
    setLoading(true)
    commentsAPI.getByPost(postId)
      .then((response) => {
        if (!cancelled) setComments(unwrapComments(response.data))
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load comments')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, postId])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const submit = async (event) => {
    event.preventDefault()
    const content = text.trim()
    if (!content || posting) return
    if (!user) {
      toast.error('Log in to comment')
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimistic = { _id: tempId, content, author: normalizeAuthor(user), createdAt: new Date().toISOString() }
    setComments((current) => [...current, optimistic])
    setText('')
    setPosting(true)
    onCountChange?.(1)
    try {
      const response = await commentsAPI.create(postId, content)
      const created = response.data?.data?.comment || response.data?.comment || response.data?.data || response.data
      if (created) {
        setComments((current) => current.map((comment) => comment._id === tempId ? {
          ...created,
          author: created.author && typeof created.author === 'object' ? created.author : optimistic.author,
        } : comment))
      }
    } catch (error) {
      console.error('Comment failed:', error)
      setComments((current) => current.filter((comment) => comment._id !== tempId))
      onCountChange?.(-1)
      toast.error('Could not post comment')
    } finally {
      setPosting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', background: 'rgba(15,23,42,0.34)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="comments-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px]"
            style={{ background: 'var(--bg-primary)', boxShadow: '0 -18px 70px rgba(15,23,42,0.22)' }}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-3 sm:px-7">
              <span className="mx-auto h-1.5 w-10 rounded-full" style={{ background: 'var(--border)' }} aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between px-5 pb-5 sm:px-7">
              <div>
                <h2 id="comments-sheet-title" className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Comments</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{comments.length} {comments.length === 1 ? 'conversation' : 'conversations'}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close comments" className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text-primary)' }}>
                <FiX size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
              {loading ? (
                <div className="flex min-h-40 items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading comments…</div>
              ) : comments.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--bg-secondary)', color: '#d97706' }}><FiMessageCircle size={23} /></div>
                  <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Start the conversation</p>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>Share a kind thought about this memory.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {comments.map((comment) => {
                    const author = comment.author || comment.user || {}
                    const isOwner = postOwnerId && String(author._id || author.id) === String(postOwnerId)
                    return (
                      <article key={comment._id || comment.id} className="flex gap-3">
                        <button type="button" className="mt-0.5 flex-shrink-0" onClick={(event) => onGoToProfile?.(event, author)} aria-label={`Open ${author.name || 'user'} profile`}>
                          <Avatar src={author.avatar} name={author.name} size={38} />
                        </button>
                        <div className="min-w-0 flex-1 overflow-visible">
                          <div className="flex items-center gap-2">
                            <button type="button" className="truncate text-left text-sm font-bold" style={{ color: 'var(--text-primary)' }} onClick={(event) => onGoToProfile?.(event, author)}>{author.name || 'Unknown'}</button>
                            {isOwner && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.13)', color: '#b45309' }}>Author</span>}
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{relativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-6" style={{ color: 'var(--text-secondary)', overflowWrap: 'anywhere', maxWidth: 'none' }}>{comment.content || comment.text}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            <form onSubmit={submit} className="flex items-end gap-3 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-7" style={{ background: 'var(--bg-primary)' }}>
              <Avatar src={user?.avatar} name={user?.name} size={38} />
              <textarea ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} rows={1} maxLength={500} placeholder={user ? 'Add a thoughtful comment…' : 'Log in to comment'} className="min-h-11 max-h-28 flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <button type="submit" disabled={!text.trim() || posting || !user} aria-label="Post comment" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white transition disabled:opacity-40">
                <FiSend size={17} />
              </button>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
