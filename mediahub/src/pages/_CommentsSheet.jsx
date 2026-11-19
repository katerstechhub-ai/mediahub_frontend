import { useEffect, useRef, useState } from 'react'
import { motion, animate, useMotionValue, useTransform, useDragControls } from 'framer-motion'
import { FiMessageCircle, FiSend, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { commentsAPI } from '../api'
import { Avatar } from '../components/ui'

const SPRING = { type: 'spring', stiffness: 420, damping: 40 }

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

// Tracks the visible area (shrinks when the on-screen keyboard opens)
function useVisualViewport(active) {
  const read = () => ({
    height: typeof window === 'undefined' ? 800 : (window.visualViewport?.height ?? window.innerHeight),
    top: typeof window === 'undefined' ? 0 : (window.visualViewport?.offsetTop ?? 0),
  })
  const [vp, setVp] = useState(read)

  useEffect(() => {
    if (!active) return undefined
    const vv = window.visualViewport
    const update = () => setVp(read())
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [active])

  return vp
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
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)

  // ── Sheet geometry ──────────────────────────────────────────────
  const vp = useVisualViewport(visible || open)
  const keyboardOpen = typeof window !== 'undefined' && window.innerHeight - vp.height > 120
  const sheetH = Math.round(vp.height * 0.94)
  const halfY = sheetH - Math.round(vp.height * 0.5) // detents: half (0.5) and full (1)
  const y = useMotionValue(sheetH)
  const backdropOpacity = useTransform(y, [0, sheetH], [1, 0])
  const halfYRef = useRef(halfY)
  halfYRef.current = halfY
  // The sheet is pushed down by y, so lift its content by the same amount (up to the half detent)
  // to keep the comment box on screen.
  const contentLift = useTransform(y, (v) => Math.min(Math.max(v, 0), halfYRef.current))
  const dragControls = useDragControls()
  const snapRef = useRef('half')
  const sheetHRef = useRef(sheetH)
  sheetHRef.current = sheetH

  const snapTo = (name) => {
    snapRef.current = name
    animate(y, name === 'full' ? 0 : halfY, SPRING)
  }

  const requestClose = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    onClose?.()
  }

  // Mount: park the sheet off-screen first, then animate in
  useEffect(() => {
    if (!open) return
    snapRef.current = 'half'
    y.set(sheetHRef.current)
    setVisible(true)
  }, [open])

  // Animate to the right detent (or out when closing); also re-snaps on keyboard / viewport changes
  useEffect(() => {
    if (!visible) return undefined
    if (open) {
      const target = snapRef.current === 'full' || keyboardOpen ? 0 : halfY
      const controls = animate(y, target, SPRING)
      return () => controls.stop()
    }
    const controls = animate(y, sheetH, { ...SPRING, onComplete: () => setVisible(false) })
    return () => controls.stop()
  }, [open, visible, halfY, sheetH, keyboardOpen])

  const handleDragEnd = (_event, info) => {
    const current = y.get()
    const velocity = info.velocity.y
    const closeThreshold = halfY + (sheetH - halfY) * 0.5

    if (velocity > 800 || current > closeThreshold) {
      requestClose()
    } else if (velocity < -500) {
      snapTo('full')
    } else if (velocity > 500) {
      if (current < halfY) snapTo('half')
      else requestClose()
    } else {
      snapTo(current < halfY / 2 ? 'full' : 'half')
    }
  }

  // ── Comments logic (unchanged) ──────────────────────────────────
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

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: vp.top,
        height: vp.height,
        zIndex: 10000,
        overflow: 'hidden',
      }}
    >
      {/* Backdrop — fades as the sheet is dragged down */}
      <motion.div
        onPointerDown={requestClose}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: backdropOpacity,
          background: 'rgba(15,23,42,0.22)',
        }}
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-sheet-title"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: sheetH }}
        dragElastic={{ top: 0.04, bottom: 0.1 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px]"
        style={{
          y,
          height: sheetH,
          paddingBottom: contentLift,
          background: 'color-mix(in srgb, var(--bg-primary) 68%, transparent)',
          backdropFilter: 'blur(28px) saturate(170%)',
          WebkitBackdropFilter: 'blur(28px) saturate(170%)',
          borderTop: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
          boxShadow: '0 -18px 70px rgba(15,23,42,0.18)',
        }}
      >
        {/* Drag zone: grabber + header. Drag from here to resize or dismiss. */}
        <div
          onPointerDown={(event) => dragControls.start(event)}
          style={{ touchAction: 'none', cursor: 'grab' }}
        >
          <div className="flex w-full items-center justify-center pb-4 pt-3">
            <span className="block h-1.5 w-10 flex-none rounded-full" style={{ background: 'var(--text-muted)', opacity: 0.45 }} aria-hidden="true" />
          </div>
          <div className="flex items-center justify-between px-5 pb-5 sm:px-7">
            <div>
              <h2 id="comments-sheet-title" className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Comments</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{comments.length} {comments.length === 1 ? 'conversation' : 'conversations'}</p>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={requestClose}
              aria-label="Close comments"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <FiX size={19} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
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

        <form
          onSubmit={submit}
          className="flex items-end gap-3 px-5 pt-4 sm:px-7"
          style={{
            background: 'transparent',
            paddingBottom: keyboardOpen ? '0.75rem' : 'calc(1rem + env(safe-area-inset-bottom))',
          }}
        >
          <Avatar src={user?.avatar} name={user?.name} size={38} />
          <textarea
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => snapTo('full')}
            rows={1}
            maxLength={500}
            placeholder={user ? 'Add a thoughtful comment…' : 'Log in to comment'}
            className="min-h-11 max-h-28 flex-1 resize-none rounded-2xl px-4 py-3 outline-none"
            style={{ background: 'color-mix(in srgb, var(--bg-secondary) 75%, transparent)', color: 'var(--text-primary)', fontSize: 16 }}
          />
          <button type="submit" disabled={!text.trim() || posting || !user} aria-label="Post comment" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white transition disabled:opacity-40">
            <FiSend size={17} />
          </button>
        </form>
      </motion.section>
    </div>
  )
}