import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSearch, FiX, FiBell, FiPlus, FiHeart, FiMessageCircle,
  FiSmile, FiTrash2, FiShare2, FiFeather,
} from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import api, { postsAPI, notificationsAPI } from '../api'
import { useAuthStore } from '../store'
import { onNotificationsChanged } from '../lib/notificationSocket'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import { EmptyState, Avatar } from '../components/ui'
import { getImageUrls } from '../components/PostMedia'
import TiltedMediaReel from '../components/ui/TiltedMediaReel'
dayjs.extend(relativeTime)

/* ─────────── Config ─────────── */

const MAX_LEN = 280
const PAGE_SIZE = 20
// Optional. Add VITE_GIPHY_KEY to your .env to unlock the animated sticker tab.
// Without it the built-in emoji packs still work.
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || ''

/* ─────────── Liquid-glass presets (inline, same family as FeedPage) ─────────── */

const glassSurface = {
  background: 'var(--bg-secondary)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid var(--border)',
  boxShadow: 'none',
}

const glassCard = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  boxShadow: 'none',
}

const glassChip = {
  background: 'var(--bg-secondary)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid var(--border)',
  boxShadow: 'none',
}

const glassAmber = {
  background: 'linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.85))',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid #f59e0b',
  boxShadow: 'none',
}

const AMBIENT_BG = 'var(--bg-primary)'

/* ─────────── Stickers ─────────── */

const STICKER_PACKS = [
  { id: 'party', label: 'Party', items: ['🥂', '🎉', '🎊', '🍾', '🎂', '🎶', '💃', '🕺', '🎈', '🥳', '🎁', '🍰'] },
  { id: 'love', label: 'Love', items: ['💍', '💐', '💖', '😍', '😊', '💌', '👰', '🤵', '💞', '🤗', '😘', '🌹'] },
  { id: 'vibes', label: 'Vibes', items: ['🔥', '😂', '🙌', '👏', '😭', '🤝', '✨', '💯', '😎', '🤩', '🙏', '👀'] },
]

// White die-cut outline + soft shadow, so an emoji or transparent GIF reads as a sticker.
const STICKER_OUTLINE =
  'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 6px 10px rgba(0,0,0,0.28))'

function Sticker({ sticker, size = 96 }) {
  if (!sticker || !sticker.value) return null
  if (sticker.kind === 'url') {
    return (
      <img
        src={sticker.value}
        alt="Sticker"
        draggable={false}
        loading="lazy"
        style={{ width: size * 1.5, maxWidth: '100%', height: 'auto', display: 'block', filter: STICKER_OUTLINE }}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label="Sticker"
      style={{ fontSize: size, lineHeight: 1, display: 'inline-block', filter: STICKER_OUTLINE }}
    >
      {sticker.value}
    </span>
  )
}

function StickerPicker({ onPick }) {
  const [tab, setTab] = useState(STICKER_PACKS[0].id)
  const [gifQuery, setGifQuery] = useState('')
  const [gifItems, setGifItems] = useState([])
  const [gifLoading, setGifLoading] = useState(false)
  const [gifError, setGifError] = useState(false)

  useEffect(() => {
    if (tab !== 'giphy' || !GIPHY_KEY) return
    let cancelled = false
    const q = gifQuery.trim()
    const timer = setTimeout(async () => {
      setGifLoading(true)
      try {
        const base = q
          ? 'https://api.giphy.com/v1/stickers/search'
          : 'https://api.giphy.com/v1/stickers/trending'
        const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: '24', rating: 'g' })
        if (q) params.set('q', q.slice(0, 50))
        const res = await fetch(`${base}?${params.toString()}`)
        const json = await res.json()
        const rows = Array.isArray(json && json.data) ? json.data : []
        const list = []
        for (let i = 0; i < rows.length; i++) {
          const imgs = rows[i] && rows[i].images
          const url = imgs && ((imgs.fixed_width && imgs.fixed_width.url) || (imgs.original && imgs.original.url))
          const thumb = imgs && ((imgs.fixed_width_small && imgs.fixed_width_small.url) || url)
          if (url) list.push({ id: rows[i].id, url, thumb })
        }
        if (!cancelled) { setGifItems(list); setGifError(false) }
      } catch (err) {
        console.error('GIPHY failed:', err)
        if (!cancelled) setGifError(true)
      } finally {
        if (!cancelled) setGifLoading(false)
      }
    }, q ? 350 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [tab, gifQuery])

  const tabs = []
  for (let i = 0; i < STICKER_PACKS.length; i++) {
    tabs.push({ id: STICKER_PACKS[i].id, label: STICKER_PACKS[i].label })
  }
  if (GIPHY_KEY) tabs.push({ id: 'giphy', label: 'Animated' })

  let pack = null
  for (let i = 0; i < STICKER_PACKS.length; i++) {
    if (STICKER_PACKS[i].id === tab) pack = STICKER_PACKS[i]
  }

  return (
    <div style={{ ...glassSurface, borderRadius: 24, padding: 18, marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...(tab === t.id ? glassAmber : glassChip),
              height: 34,
              padding: '0 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: tab === t.id ? '#fff' : 'var(--text-primary)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pack && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 10 }}>
          {pack.items.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPick({ kind: 'emoji', value: emoji })}
              aria-label={`Sticker ${emoji}`}
              style={{ height: 64, fontSize: 38, lineHeight: 1, borderRadius: 18, background: 'transparent' }}
            >
              <span style={{ filter: STICKER_OUTLINE, display: 'inline-block' }}>{emoji}</span>
            </motion.button>
          ))}
        </div>
      )}

      {tab === 'giphy' && (
        <div>
          <input
            type="text"
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Search stickers"
            style={{
              ...glassChip,
              width: '100%',
              borderRadius: 999,
              outline: 'none',
              padding: '11px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: 14,
            }}
          />
          {gifError && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 4px' }}>
              Couldn&apos;t load stickers right now.
            </p>
          )}
          {gifLoading && gifItems.length === 0 && !gifError && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 4px' }}>Loading…</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
            {gifItems.map((g) => (
              <motion.button
                key={g.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onPick({ kind: 'url', value: g.url })}
                style={{ borderRadius: 16, background: 'transparent', padding: 6 }}
              >
                <img src={g.thumb} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </motion.button>
            ))}
          </div>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginTop: 14, textAlign: 'right' }}>
            Powered by GIPHY
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────── API + helpers ─────────── */

const thoughtsAPI = {
  getAll: (params) => api.get('/api/thoughts', { params }),
  getOne: (id) => api.get(`/api/thoughts/${id}`),
  create: (payload) => api.post('/api/thoughts', payload),
  like: (id) => api.post(`/api/thoughts/${id}/like`),
  replies: (id) => api.get(`/api/thoughts/${id}/replies`),
  remove: (id) => api.delete(`/api/thoughts/${id}`),
}

function pickList(data) {
  if (data && data.data && Array.isArray(data.data.thoughts)) return data.data.thoughts
  if (data && Array.isArray(data.thoughts)) return data.thoughts
  if (data && Array.isArray(data.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

function pickOne(data) {
  if (data && data.data && data.data.thought) return data.data.thought
  if (data && data.thought) return data.thought
  if (data && data.data && data.data._id) return data.data
  if (data && data._id) return data
  return null
}

function normalizeAuthor(u) {
  if (!u) return null
  return {
    _id: u._id || u.id,
    name: u.name || u.username || u.fullName || u.displayName || 'Unknown',
    avatar: u.avatar || u.avatarUrl || u.profileImage || u.photo || null,
  }
}

function timeAgo(d) {
  return d ? dayjs(d).fromNow() : 'Just now'
}

function hasLiked(likes, myId) {
  if (!myId || !Array.isArray(likes)) return false
  for (let i = 0; i < likes.length; i++) {
    if (String(likes[i]) === String(myId)) return true
  }
  return false
}

function patchThought(list, id, patchFn) {
  const next = []
  for (let i = 0; i < list.length; i++) {
    next.push(list[i]._id === id ? patchFn(list[i]) : list[i])
  }
  return next
}

function toggleLikeIn(thought, myId) {
  const likes = Array.isArray(thought.likes) ? thought.likes : []
  const next = []
  let found = false
  for (let i = 0; i < likes.length; i++) {
    if (String(likes[i]) === String(myId)) found = true
    else next.push(likes[i])
  }
  if (!found) next.push(myId)
  return { ...thought, likes: next }
}

async function shareThought(thought) {
  const body = thought.text || ''
  const url = `${window.location.origin}/explore?thought=${thought._id}`
  try {
    if (navigator.share) {
      await navigator.share({ text: body, url })
    } else {
      await navigator.clipboard.writeText(body ? `${body}\n${url}` : url)
      toast.success('Copied')
    }
  } catch (err) {
    // share sheet dismissed — nothing to do
  }
}

// Readable text for the activity dropdown
function notificationText(n) {
  switch (n.type) {
    case 'like_thought':
      return n.isSelf ? 'liked your own thought' : 'liked your thought'
    case 'reply_thought':
      return n.isSelf ? 'replied to your own thought' : 'replied to your thought'
    case 'like_post':
      return 'liked your post'
    case 'dislike_post':
      return 'disliked your post'
    case 'comment':
      return 'commented on your post'
    case 'reply':
      return 'replied to your comment'
    case 'like_comment':
      return 'liked your comment'
    case 'follow':
      return 'started following you'
    default:
      return 'sent you an update'
  }
}

// One-line preview shown under the activity text
function notificationPreview(n) {
  let raw = ''
  if (n.type === 'like_thought') raw = n.thought && n.thought.text
  else if (n.type === 'reply_thought') raw = n.thoughtReply && n.thoughtReply.text
  else if (n.type === 'comment' || n.type === 'reply') raw = n.comment && n.comment.content
  else if (n.post) raw = n.post.title
  if (!raw || typeof raw !== 'string') return ''
  return raw.length > 70 ? `${raw.slice(0, 70)}…` : raw
}

// Small icon badge on the activity avatar
function notificationBadge(type) {
  if (type === 'like_thought' || type === 'like_post' || type === 'like_comment') {
    return { Icon: FiHeart, color: '#ef4444' }
  }
  if (type === 'reply_thought' || type === 'comment' || type === 'reply') {
    return { Icon: FiMessageCircle, color: '#3b82f6' }
  }
  return { Icon: FiBell, color: '#f59e0b' }
}

/* ─────────── Character ring ─────────── */

function CharRing({ value, max }) {
  const pct = Math.min(1, value / max)
  const r = 9
  const c = 2 * Math.PI * r
  const color = pct > 0.95 ? '#ef4444' : pct > 0.8 ? '#f59e0b' : 'var(--text-muted)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" />
      <circle
        cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 12 12)"
      />
    </svg>
  )
}

/* ─────────── Composer (main post + replies) ─────────── */

function Composer({ user, parentId = null, compact = false, placeholder, autoFocus = false, onPosted }) {
  const [text, setText] = useState('')
  const [sticker, setSticker] = useState(null)
  const [showTray, setShowTray] = useState(false)
  const [posting, setPosting] = useState(false)
  const taRef = useRef(null)

  useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus()
  }, [autoFocus])

  const trimmed = text.trim()
  const canPost = (trimmed.length > 0 || Boolean(sticker)) && !posting

  const resize = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 260) + 'px'
  }

  const submit = async () => {
    if (!canPost) return
    setPosting(true)
    try {
      const payload = { text: trimmed }
      if (sticker) payload.sticker = sticker
      if (parentId) payload.parentId = parentId
      const res = await thoughtsAPI.create(payload)
      const created = pickOne(res.data)
      if (created) {
        const hasAuthorObject = created.author && typeof created.author === 'object'
        onPosted({
          ...created,
          author: hasAuthorObject ? created.author : normalizeAuthor(user),
          likes: Array.isArray(created.likes) ? created.likes : [],
          replyCount: created.replyCount || 0,
        })
      }
      setText('')
      setSticker(null)
      setShowTray(false)
      if (taRef.current) taRef.current.style.height = 'auto'
    } catch (err) {
      console.error('Post failed:', err)
      toast.error((err.response && err.response.data && err.response.data.message) || 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  const avatarSize = compact ? 34 : 46

  return (
    <div style={compact ? {} : { borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
      <div style={{ display: 'flex', gap: compact ? 12 : 16, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <Avatar src={user && user.avatar} name={user && user.name} size={avatarSize} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            ref={taRef}
            value={text}
            rows={compact ? 1 : 2}
            maxLength={MAX_LEN}
            placeholder={placeholder || "What's on your mind?"}
            onChange={(e) => { setText(e.target.value); resize(e.target) }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit() }
            }}
            className="placeholder:opacity-70"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: compact ? '6px 0' : '10px 0',
              minHeight: compact ? 40 : 64,
              fontSize: compact ? 14 : 16,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
          />

          {sticker && (
            <div style={{ position: 'relative', display: 'inline-block', margin: '10px 0 6px' }}>
              <Sticker sticker={sticker} size={compact ? 56 : 88} />
              <button
                type="button"
                onClick={() => setSticker(null)}
                aria-label="Remove sticker"
                style={{
                  ...glassChip,
                  position: 'absolute', top: -8, right: -10, width: 26, height: 26, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)',
                }}
              >
                <FiX size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <AnimatePresence>
            {showTray && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <StickerPicker onPick={(s) => { setSticker(s); setShowTray(false) }} />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowTray((v) => !v)}
              aria-label="Add a sticker"
              style={{
                ...glassChip,
                width: 42, height: 42, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: showTray ? '#f59e0b' : 'var(--text-primary)',
              }}
            >
              <FiSmile size={19} strokeWidth={2.5} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {text.length > 0 && <CharRing value={text.length} max={MAX_LEN} />}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={submit}
                disabled={!canPost}
                style={{
                  ...glassAmber,
                  height: compact ? 38 : 42,
                  padding: '0 24px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fff',
                  opacity: canPost ? 1 : 0.45,
                  cursor: canPost ? 'pointer' : 'not-allowed',
                }}
              >
                {posting ? 'Posting…' : compact ? 'Reply' : 'Post'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Shared bits ─────────── */

function ActionPill({ onClick, label, active, activeColor, children }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      // stopPropagation so pressing a pill inside a card doesn't also open the modal
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e) }}
      aria-label={label}
      style={{
        ...glassChip,
        height: 38,
        padding: '0 15px',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12,
        fontWeight: 700,
        color: active ? activeColor : 'var(--text-primary)',
        background: active ? 'rgba(239,68,68,0.16)' : glassChip.background,
      }}
    >
      {children}
    </motion.button>
  )
}

function ConfirmDelete({ id, deleting, onCancel, onConfirm }) {
  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) onCancel() }}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex: 2147483000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.46)' }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`delete-thought-title-${id}`}
        aria-describedby={`delete-thought-copy-${id}`}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ width: 'min(100%, 390px)', padding: 24, borderRadius: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }}
      >
        <h2 id={`delete-thought-title-${id}`} style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Delete this thought?</h2>
        <p id={`delete-thought-copy-${id}`} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: 'var(--text-muted)' }}>
          This cannot be undone. The thought and its replies will be removed.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button type="button" disabled={deleting} onClick={onCancel} style={{ height: 42, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent', fontWeight: 700 }}>Cancel</button>
          <button type="button" disabled={deleting} onClick={onConfirm} style={{ height: 42, padding: '0 18px', borderRadius: 999, border: '1px solid #ef4444', color: '#fff', background: '#ef4444', fontWeight: 800, opacity: deleting ? 0.65 : 1 }}>{deleting ? 'Deleting…' : 'Delete thought'}</button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

/* ─────────── Thought card (tap to open modal) ─────────── */

function ThoughtCard({ thought, user, onOpen, onLike, onDelete, onOpenProfile }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const myId = user && (user._id || user.id)
  const author = thought.author || {}
  const authorId = author._id || author.id
  const isMine = Boolean(myId) && String(authorId) === String(myId)
  const likes = Array.isArray(thought.likes) ? thought.likes : []
  const liked = hasLiked(likes, myId)

  const confirmRemove = async () => {
    setDeleting(true)
    try {
      await onDelete(thought._id)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.article
        id={`thought-${thought._id}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => onOpen(thought._id)}
        style={{
          ...glassCard,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          padding: '22px 4px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={(e) => onOpenProfile(e, author)}>
            <Avatar src={author.avatar} name={author.name} size={46} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  onClick={(e) => onOpenProfile(e, author)}
                  style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {author.name || 'Unknown'}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(thought.createdAt)}</p>
              </div>
              {isMine && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  aria-label="Delete thought"
                  style={{ width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                >
                  <FiTrash2 size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {thought.text && (
              <p
                style={{
                  marginTop: 12, fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}
              >
                {thought.text}
              </p>
            )}

            {thought.sticker && (
              <div style={{ marginTop: 18 }}>
                <Sticker sticker={thought.sticker} size={104} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
              <ActionPill onClick={() => onOpen(thought._id)} label="Replies">
                <FiMessageCircle size={16} strokeWidth={2.5} />
                <span>{thought.replyCount || 0}</span>
              </ActionPill>
              <ActionPill onClick={() => onLike(thought._id)} label={liked ? 'Unlike' : 'Like'} active={liked} activeColor="#ef4444">
                {liked ? <FaHeart size={15} color="#ef4444" /> : <FiHeart size={16} strokeWidth={2.5} />}
                <span>{likes.length}</span>
              </ActionPill>
              <ActionPill onClick={() => shareThought(thought)} label="Share">
                <FiShare2 size={15} strokeWidth={2.5} />
              </ActionPill>
            </div>
          </div>
        </div>
      </motion.article>

      {confirmDelete && (
        <ConfirmDelete
          id={thought._id}
          deleting={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={confirmRemove}
        />
      )}
    </>
  )
}

/* ─────────── Thought modal (Twitter-style detail view) ─────────── */

function ThoughtModal({ thought, user, onClose, onLike, onDelete, onOpenProfile, onReplyAdded }) {
  const [replies, setReplies] = useState([])
  const [loadingReplies, setLoadingReplies] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const myId = user && (user._id || user.id)
  const author = thought.author || {}
  const isMine = Boolean(myId) && String(author._id || author.id) === String(myId)
  const likes = Array.isArray(thought.likes) ? thought.likes : []
  const liked = hasLiked(likes, myId)

  useEffect(() => {
    let cancelled = false
    setLoadingReplies(true)
    setReplies([])
    thoughtsAPI.replies(thought._id)
      .then((res) => { if (!cancelled) setReplies(pickList(res.data)) })
      .catch((err) => { console.error('Load replies failed:', err); toast.error('Could not load replies') })
      .finally(() => { if (!cancelled) setLoadingReplies(false) })
    return () => { cancelled = true }
  }, [thought._id])

  // Esc closes, and the page behind stops scrolling
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !confirmDelete) onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, confirmDelete])

  const handleReplyPosted = (created) => {
    setReplies((prev) => [...prev, created])
    onReplyAdded(thought._id)
  }

  const confirmRemove = async () => {
    setDeleting(true)
    const ok = await onDelete(thought._id)
    setDeleting(false)
    setConfirmDelete(false)
    if (ok) onClose()
  }

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Thought"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, zIndex: 2147482990, overflowY: 'auto', background: 'var(--bg-primary)' }}
    >
      <div className="mx-auto min-h-full w-full max-w-2xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        <div
          className="sticky top-0 z-10 flex items-center justify-between border-b py-4"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-primary)' }}>
            <FiX size={20} />
          </button>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Thought</span>
          {isMine ? (
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete thought" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
              <FiTrash2 size={17} strokeWidth={2.5} />
            </button>
          ) : (
            <span className="h-10 w-10" aria-hidden="true" />
          )}
        </div>

        {/* The thought */}
        <div style={{ padding: '22px 0' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ cursor: 'pointer' }} onClick={(e) => { onOpenProfile(e, author) }}>
              <Avatar src={author.avatar} name={author.name} size={48} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                onClick={(e) => { onOpenProfile(e, author) }}
                style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {author.name || 'Unknown'}
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(thought.createdAt)}</p>
            </div>
          </div>

          {thought.text && (
            <p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {thought.text}
            </p>
          )}
          {thought.sticker && (
            <div style={{ marginTop: 18 }}>
              <Sticker sticker={thought.sticker} size={120} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
            <ActionPill label="Replies">
              <FiMessageCircle size={16} strokeWidth={2.5} />
              <span>{thought.replyCount || replies.length || 0}</span>
            </ActionPill>
            <ActionPill onClick={() => onLike(thought._id)} label={liked ? 'Unlike' : 'Like'} active={liked} activeColor="#ef4444">
              {liked ? <FaHeart size={15} color="#ef4444" /> : <FiHeart size={16} strokeWidth={2.5} />}
              <span>{likes.length}</span>
            </ActionPill>
            <ActionPill onClick={() => shareThought(thought)} label="Share">
              <FiShare2 size={15} strokeWidth={2.5} />
            </ActionPill>
          </div>
        </div>

        {/* Reply box */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          {user ? (
            <Composer user={user} parentId={thought._id} compact placeholder="Post your reply" onPosted={handleReplyPosted} />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Log in to reply.</p>
          )}
        </div>

        {/* Replies */}
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 22 }}>
          {loadingReplies && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading replies…</p>}
          {!loadingReplies && replies.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No replies yet. Be the first to reply.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {replies.map((r) => {
              const ra = r.author || {}
              return (
                <div key={r._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={(e) => onOpenProfile(e, ra)}>
                    <Avatar src={ra.avatar} name={ra.name} size={38} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: 8 }}>{ra.name || 'Unknown'}</span>
                      {timeAgo(r.createdAt)}
                    </p>
                    {r.text && (
                      <p style={{ marginTop: 5, fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {r.text}
                      </p>
                    )}
                    {r.sticker && (
                      <div style={{ marginTop: 10 }}>
                        <Sticker sticker={r.sticker} size={64} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDelete
          id={thought._id}
          deleting={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={confirmRemove}
        />
      )}
    </motion.div>,
    document.body,
  )
}

/* ─────────── ExplorePage ─────────── */

export default function ExplorePage() {
  const [thoughts, setThoughts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [reelItems, setReelItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  // A thought opened by link/notification that isn't in the loaded feed yet
  const [extraThought, setExtraThought] = useState(null)
  const sentinelRef = useRef(null)
  const inputRef = useRef(null)
  const thoughtsRef = useRef([])
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const thoughtParam = searchParams.get('thought')
  const { user } = useAuthStore()
  const userId = user && (user._id || user.id)

  thoughtsRef.current = thoughts

  // reset=true: first load (replaces list). reset=false: next page (appends).
  const fetchThoughts = async (reset) => {
    if (!reset && (!hasMore || loadingMore)) return
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const params = { limit: PAGE_SIZE }
      if (!reset && nextCursor) params.before = nextCursor
      const res = await thoughtsAPI.getAll(params)
      const list = pickList(res.data)
      setThoughts((prev) => (reset ? list : [...prev, ...list]))
      setNextCursor((res.data && res.data.nextCursor) || null)
      setHasMore(Boolean(res.data && res.data.hasMore))
    } catch (err) {
      console.error('Failed to fetch thoughts:', err)
      if (reset) setThoughts([])
    } finally {
      if (reset) setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchThoughts(true) }, [])

  // The modal is driven by ?thought=ID. If that thought isn't in the loaded feed
  // (e.g. opened from a notification), fetch it on its own.
  useEffect(() => {
    if (!thoughtParam) { setExtraThought(null); return undefined }
    if (loading) return undefined
    const inList = thoughtsRef.current.some((t) => t._id === thoughtParam)
    if (inList) { setExtraThought(null); return undefined }
    let cancelled = false
    ;(async () => {
      try {
        const res = await thoughtsAPI.getOne(thoughtParam)
        const found = pickOne(res.data)
        if (!found || cancelled) return
        setExtraThought({
          ...found,
          author: found.author && typeof found.author === 'object' ? found.author : null,
          likes: Array.isArray(found.likes) ? found.likes : [],
        })
      } catch (err) {
        console.error('Open thought failed:', err)
        toast.error('That thought is no longer available')
        navigate('/explore', { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [thoughtParam, loading])

  // Which thought the modal should show
  let activeThought = null
  if (thoughtParam) {
    for (let i = 0; i < thoughts.length; i++) {
      if (thoughts[i]._id === thoughtParam) { activeThought = thoughts[i]; break }
    }
    if (!activeThought && extraThought && extraThought._id === thoughtParam) activeThought = extraThought
  }

  const openThought = (id) => {
    navigate(`/explore?thought=${id}`, { state: { fromCard: true } })
  }

  // If the modal was opened from a card, going back returns to the feed exactly as it was.
  // If it was opened from a notification/link, just swap the URL back to /explore.
  const closeThought = () => {
    if (location.state && location.state.fromCard) navigate(-1)
    else navigate('/explore', { replace: true })
  }

  // Top reel keeps using photo/video posts — it's the one place media stays on this page.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await postsAPI.getAll()
        const d = res.data
        let arr = []
        if (d && d.data && d.data.posts) arr = d.data.posts
        else if (d && d.posts) arr = d.posts
        else if (d && Array.isArray(d.data)) arr = d.data
        else if (Array.isArray(d)) arr = d
        const items = []
        for (let i = 0; i < arr.length && items.length < 24; i++) {
          const post = arr[i]
          const urls = getImageUrls(post) || []
          for (let j = 0; j < urls.length && items.length < 24; j++) {
            if (urls[j]) items.push({ type: 'image', src: urls[j] })
          }
          const vids = Array.isArray(post.videos) ? post.videos : []
          for (let k = 0; k < vids.length && items.length < 24; k++) {
            if (vids[k] && vids[k].url) {
              items.push({ type: 'video', src: vids[k].url, poster: vids[k].thumbnail || vids[k].url })
            }
          }
        }
        if (!cancelled) setReelItems(items)
      } catch (err) {
        console.error('Reel load failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Bell badge + activity list. Updates instantly over the socket; polling is a slow fallback.
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      setNotifications([])
      return undefined
    }
    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getAll(1, 8)
        const payload = res.data || {}
        setUnreadCount(payload.unreadCount || 0)
        const rows = Array.isArray(payload.data)
          ? payload.data
          : payload.notifications || (payload.data && payload.data.notifications) || []
        if (Array.isArray(rows)) setNotifications(rows)
      } catch (err) { /* badge is best-effort */ }
    }
    fetchUnread()
    const unsubscribe = onNotificationsChanged(fetchUnread)
    const interval = setInterval(fetchUnread, 60000)
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [userId])

  // Esc closes the activity popover
  useEffect(() => {
    if (!showNotifications) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setShowNotifications(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNotifications])

  // Infinite scroll — skipped while searching (search filters what's already loaded).
  useEffect(() => {
    if (query.trim()) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchThoughts(false)
    }, { rootMargin: '600px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [query, hasMore, loadingMore, nextCursor])

  const goToProfile = (e, author) => {
    if (e) e.stopPropagation()
    const authorId = author && (author._id || author.id || author)
    if (!authorId || typeof authorId === 'object') return
    const myId = user && (user._id || user.id)
    navigate(String(authorId) === String(myId) ? '/profile' : `/users/${authorId}`)
  }

  // Patch a thought in both the feed list and the standalone (notification-opened) copy
  const applyPatch = (id, patchFn) => {
    setThoughts((prev) => patchThought(prev, id, patchFn))
    setExtraThought((prev) => (prev && prev._id === id ? patchFn(prev) : prev))
  }

  const handleLike = async (id) => {
    if (!user) { toast.error('Log in to like'); navigate('/login'); return }
    const myId = user._id || user.id
    applyPatch(id, (t) => toggleLikeIn(t, myId))
    try {
      await thoughtsAPI.like(id)
    } catch (err) {
      console.error('Like failed:', err)
      applyPatch(id, (t) => toggleLikeIn(t, myId))
      toast.error('Could not update like')
    }
  }

  // Returns true when the delete succeeded
  const handleDelete = async (id) => {
    try {
      await thoughtsAPI.remove(id)
      setThoughts((prev) => {
        const next = []
        for (let i = 0; i < prev.length; i++) {
          if (prev[i]._id !== id) next.push(prev[i])
        }
        return next
      })
      setExtraThought((prev) => (prev && prev._id === id ? null : prev))
      toast.success('Deleted')
      return true
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Could not delete')
      return false
    }
  }

  const handleReplyAdded = (id) => {
    applyPatch(id, (t) => ({ ...t, replyCount: (t.replyCount || 0) + 1 }))
  }

  const handlePosted = (created) => {
    setThoughts((prev) => [created, ...prev])
  }

  // Tap an item in the activity dropdown
  const openNotification = (n) => {
    setShowNotifications(false)
    if (!n.read && n._id) {
      notificationsAPI.markAsRead(n._id).catch(() => {})
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    const isThoughtNotification = n.type === 'like_thought' || n.type === 'reply_thought'
    if (isThoughtNotification && n.thought && n.thought._id) {
      navigate(`/explore?thought=${n.thought._id}`)
    } else if (n.post && n.post._id) {
      navigate(`/posts/${n.post._id}`)
    } else {
      navigate('/notifications')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"
        />
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const visible = []
  for (let i = 0; i < thoughts.length; i++) {
    const t = thoughts[i]
    const authorName = ((t.author && t.author.name) || '').toLowerCase()
    if (!q || (t.text || '').toLowerCase().includes(q) || authorName.includes(q)) visible.push(t)
  }

  return (
    <div
      className="relative min-h-full pb-[calc(6rem+env(safe-area-inset-bottom))]"
      style={{ background: 'var(--bg-primary)', position: 'relative' }}
    >
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', background: AMBIENT_BG }} />

      {/* Floating "write a thought" button — fixed to the viewport, so it stays visible however long the feed is */}
      {createPortal(
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowComposer((value) => !value)}
          aria-label={showComposer ? 'Close thought composer' : 'Write a thought'}
          className="bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 sm:bottom-6"
          style={{
            position: 'fixed',
            right: 20,
            zIndex: 50,
          }}
        >
          <FiPlus size={25} strokeWidth={2.5} style={{ transform: showComposer ? 'rotate(45deg)' : 'none', transition: 'transform 180ms ease' }} />
        </motion.button>,
        document.body,
      )}

      {/* New thought modal */}
      {showComposer && user && createPortal(
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowComposer(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 2147482990, overflowY: 'auto', background: 'var(--bg-primary)' }}
        >
          <div className="mx-auto min-h-full w-full max-w-2xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex items-center justify-between border-b py-4" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setShowComposer(false)} aria-label="Close thought composer" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-primary)' }}>
                <FiX size={20} />
              </button>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New thought</span>
              <span className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="pt-6">
              <Composer user={user} onPosted={(created) => { handlePosted(created); setShowComposer(false) }} />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Single thought modal — opened by tapping a thought or from a notification */}
      {activeThought && (
        <ThoughtModal
          key={activeThought._id}
          thought={activeThought}
          user={user}
          onClose={closeThought}
          onLike={handleLike}
          onDelete={handleDelete}
          onOpenProfile={goToProfile}
          onReplyAdded={handleReplyAdded}
        />
      )}

      {/* Sticky header */}
      <div
        className="sticky top-0 z-40 pointer-events-auto border-b px-3 py-3 sm:px-6"
        style={{
          background: 'var(--bg-primary)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'none',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="relative flex-1 max-w-xl mx-auto">
            <FiSearch
              size={16}
              strokeWidth={2.25}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search thoughts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[44px] rounded-full text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/40"
              style={{
                ...glassChip,
                color: 'var(--text-primary)',
                padding: '11px 40px 11px 42px',
                fontWeight: 500,
              }}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}
                  aria-label="Clear search"
                >
                  <FiX size={13} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              onClick={(event) => { event.preventDefault(); navigate('/create') }}
              whileTap={{ scale: 0.9 }}
              aria-label="Create photo or video post"
              className="flex items-center justify-center h-11 w-11 rounded-full"
              style={{ ...glassChip, color: 'var(--text-primary)' }}
            >
              <FiPlus size={22} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              onClick={(event) => { event.preventDefault(); setShowNotifications((value) => !value) }}
              whileTap={{ scale: 0.9 }}
              aria-label="Thought notifications"
              className="relative flex items-center justify-center h-11 w-11 rounded-full"
              style={{ ...glassChip, color: 'var(--text-primary)' }}
            >
              <FiBell size={20} strokeWidth={2.5} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: '#ef4444' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Light / dark switch now lives with the other header actions (it used to float bottom-right) */}
            <ThemeOverlay className="relative flex h-11 w-11 items-center justify-center rounded-full" />
          </div>
        </div>
      </div>

      {/* Activity popover — tap anywhere outside (or press Esc) to close */}
      {createPortal(
        <AnimatePresence>
          {showNotifications && (
            <>
              <motion.div
                key="activity-backdrop"
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setShowNotifications(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 2147482000, background: 'rgba(0,0,0,0.3)' }}
              />
              <div
                key="activity-wrap"
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  top: 'calc(env(safe-area-inset-top, 0px) + 76px)',
                  zIndex: 2147482001,
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '0 12px',
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  role="dialog"
                  aria-label="Activity"
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  style={{
                    pointerEvents: 'auto',
                    width: 'min(100%, 440px)',
                    maxHeight: 'min(70vh, 540px)',
                    overflowY: 'auto',
                    padding: 10,
                    borderRadius: 28,
                    background: 'var(--bg-secondary)',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px 12px' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Activity</p>
                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); navigate('/notifications') }}
                      style={{
                        height: 32,
                        padding: '0 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#d97706',
                        background: 'rgba(245,158,11,0.14)',
                      }}
                    >
                      View all
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px 34px' }}>
                      <span style={{ width: 52, height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.14)' }}>
                        <FiBell size={22} color="#d97706" />
                      </span>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No activity yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {notifications.slice(0, 8).map((notification, index) => {
                        const actor = notification.sender || {}
                        const name = notification.isSelf ? 'You' : actor.name || 'Someone'
                        const preview = notificationPreview(notification)
                        const { Icon, color } = notificationBadge(notification.type)
                        const unread = !notification.read
                        return (
                          <button
                            key={notification._id || index}
                            type="button"
                            className={unread ? '' : 'hover:bg-[var(--bg-primary)]'}
                            onClick={() => openNotification(notification)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              width: '100%',
                              padding: '12px 12px',
                              borderRadius: 20,
                              textAlign: 'left',
                              background: unread ? 'rgba(245,158,11,0.1)' : 'transparent',
                              transition: 'background 150ms ease',
                            }}
                          >
                            <span style={{ position: 'relative', flexShrink: 0 }}>
                              <Avatar src={actor.avatar} name={actor.name || name} size={44} />
                              <span
                                style={{
                                  position: 'absolute',
                                  right: -3,
                                  bottom: -3,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 999,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'var(--bg-secondary)',
                                }}
                              >
                                <Icon size={12} color={color} strokeWidth={2.75} />
                              </span>
                            </span>

                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ display: 'block', fontSize: 14, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                                <strong style={{ fontWeight: 800 }}>{name}</strong>{' '}{notificationText(notification)}
                              </span>
                              {preview && (
                                <span
                                  style={{
                                    display: 'block',
                                    marginTop: 2,
                                    fontSize: 13,
                                    color: 'var(--text-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {preview}
                                </span>
                              )}
                              <span style={{ display: 'block', marginTop: 3, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                                {timeAgo(notification.createdAt)}
                              </span>
                            </span>

                            {unread && (
                              <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: 999, background: '#f59e0b' }} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 28 }}>
        {/* Top scrolling reel stays */}
        {reelItems.length > 0 && !query.trim() && (
          <section style={{ overflow: 'hidden', padding: '12px 0', marginBottom: 56 }}>
            <TiltedMediaReel items={reelItems} rows={2} tilt={3.5} className="touch-pan-y" />
          </section>
        )}

        <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Guest prompt */}
          {!user ? (
            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '18px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Join the conversation</p>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/login')} style={{ marginTop: 12, height: 40, padding: '0 22px', borderRadius: 999, fontSize: 14, fontWeight: 800, color: '#fff', background: '#f59e0b' }}>Log in</motion.button>
            </div>
          ) : null}

          {/* Label + hairline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#d97706' }}>
              Latest thoughts
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {visible.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="pt-10">
              <EmptyState
                icon={FiFeather}
                title={query ? 'No results' : 'No thoughts yet'}
                description={query ? `No matches for "${query}"` : 'Start the conversation — say something or drop a sticker.'}
              />
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {visible.map((t) => (
                <ThoughtCard
                  key={t._id}
                  thought={t}
                  user={user}
                  onOpen={openThought}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onOpenProfile={goToProfile}
                />
              ))}
            </div>
          )}

          {!query.trim() && hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-amber-500 border-t-transparent" />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}