import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList,
  FiCopy, FiSend, FiSearch, FiX, FiDownload, FiLoader,
  FiCalendar, FiMapPin
} from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import api, { postsAPI, commentsAPI, getDownloadUrl } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import { getMediaItems, MediaSlider, useMediaAspect } from '../components/PostMedia'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

import CommentsSheet from './_CommentsSheet'

/* ─────────── Wedding Hero Slider ─────────── */

const WEDDING_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80', caption: 'Two hearts, one journey' },
  { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&q=80', caption: 'Where forever begins' },
  { url: 'https://i.pinimg.com/1200x/05/45/04/054504e4faceeb61c885dcb08e15e317.jpg', caption: 'Golden hour, golden vows' },
  { url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80', caption: 'Dancing into forever' },
]

function WeddingHero() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % WEDDING_SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const slide = WEDDING_SLIDES[index]

  return (
    <section className="relative w-full">
      <div className="relative overflow-hidden aspect-[16/9] sm:aspect-[21/9]">
        <AnimatePresence mode="sync">
          <motion.img
            key={slide.url}
            src={slide.url}
            alt={slide.caption}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10 md:p-14 pb-16 sm:pb-24 pt-24 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <span className="inline-block text-[10px] sm:text-xs tracking-[0.3em] uppercase text-amber-300 font-semibold mb-2 sm:mb-3">
              You're invited
            </span>
            <h1
              className="font-display text-white font-extrabold leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }}
            >
              Paloma <span className="italic font-light text-amber-300">&</span> Kenneth
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={slide.caption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5 }}
                className="mt-2 sm:mt-3 text-white/85 text-sm sm:text-lg italic max-w-lg"
              >
                “{slide.caption}”
              </motion.p>
            </AnimatePresence>

            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5 text-white text-xs sm:text-sm">
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <FiCalendar size={14} /> November 14, 2026
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <FiMapPin size={14} /> Amalfi Coast, Abuja
              </span>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 sm:bottom-12 right-4 sm:right-8 flex gap-1.5 z-10">
          {WEDDING_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === index ? 28 : 8,
                background: i === index ? '#fbbf24' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none z-[5]"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%)' }}
        />
      </div>
    </section>
  )
}

/* ─────────── Normalize a user object ─────────── */

function normalizeAuthor(u) {
  if (!u) return null
  return {
    _id: u._id || u.id,
    name: u.name || u.username || u.fullName || u.displayName || 'Unknown',
    avatar: u.avatar || u.avatarUrl || u.profileImage || u.photo || null,
  }
}

/* ─────────── Small helper: multi-media badge ─────────── */
function MultiImageBadge({ count }) {
  if (!count || count < 2) return null
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold leading-none shadow">
      <FiCopy size={11} strokeWidth={2.8} />
      {count}
    </div>
  )
}

/* ─────────── Boomerang video (grid + list preview) ─────────── */

function BoomerangVideo({ src, poster, className, style, onClick }) {
  const videoRef = useRef(null)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    let cancelled = false

    const stepReverse = (timestamp) => {
      if (cancelled || !videoRef.current) return
      const v = videoRef.current
      if (lastTimeRef.current == null) lastTimeRef.current = timestamp
      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const next = v.currentTime - delta
      if (next <= 0) {
        v.currentTime = 0
        lastTimeRef.current = null
        v.play().catch(() => {})
      } else {
        v.currentTime = next
        rafRef.current = requestAnimationFrame(stepReverse)
      }
    }

    const handleEnded = () => {
      if (cancelled) return
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(stepReverse)
    }

    video.addEventListener('ended', handleEnded)
    video.play().catch(() => {})

    return () => {
      cancelled = true
      video.removeEventListener('ended', handleEnded)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      className={className}
      style={style}
      muted
      playsInline
      autoPlay
      onClick={onClick}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

/* ─────────── Inline comments ─────────── */

function InlineComments({ postId, user, onGoToProfile, onCountChange, onOpenAll }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await commentsAPI.getByPost(postId)
        const data = res.data
        const arr = data?.data?.comments || data?.comments || data?.data || data || []
        if (!cancelled) setComments(Array.isArray(arr) ? arr : [])
      } catch (err) {
        console.error('Load comments failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [postId])

  const submit = async (e) => {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    if (!user) { toast.error('Log in to comment'); navigate('/login'); return }

    const optimisticAuthor = normalizeAuthor(user)
    const tempId = `temp-${Date.now()}`
    setComments((prev) => [...prev, { _id: tempId, content, author: optimisticAuthor }])
    setText('')
    onCountChange?.(1)
    setPosting(true)
    try {
      const res = await commentsAPI.create(postId, content)
      const newC = res.data?.data?.comment || res.data?.comment || res.data?.data || res.data
      if (newC && (newC._id || newC.id)) {
        setComments((prev) => prev.map((c) => (
          c._id === tempId
            ? { ...newC, author: (newC.author && typeof newC.author === 'object' ? newC.author : optimisticAuthor) }
            : c
        )))
      }
    } catch (err) {
      console.error('Comment failed:', err)
      toast.error('Could not post comment')
      setComments((prev) => prev.filter((c) => c._id !== tempId))
      onCountChange?.(-1)
    } finally {
      setPosting(false)
    }
  }

  const visible = comments.slice(-2)

  return (
    <div className="mt-2 px-3 md:px-0">
      {loading ? (
        <div className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading comments…</div>
      ) : (
        <>
          {comments.length > 2 && (
            <button onClick={() => onOpenAll?.(postId)}
              className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              View all {comments.length} comments
            </button>
          )}
          <ul className="space-y-1.5">
            {visible.map((c) => (
              <li key={c._id || c.id} className="flex items-start gap-2">
                <div className="cursor-pointer flex-shrink-0 mt-0.5"
                     onClick={(e) => onGoToProfile?.(e, c.author)}>
                  <Avatar src={c.author?.avatar} name={c.author?.name} size={22} />
                </div>
                <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-bold mr-1.5 cursor-pointer hover:underline"
                      onClick={(e) => onGoToProfile?.(e, c.author)}>
                    {c.author?.name || 'Unknown'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.content}</span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 mt-2.5 pt-2.5 border-t"
            style={{ borderColor: 'var(--border)' }}>
        <Avatar src={user?.avatar} name={user?.name} size={24} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-60"
          style={{ color: 'var(--text-primary)' }}
        />
        <button type="submit" disabled={!text.trim() || posting}
          className="flex items-center justify-center h-8 w-8 rounded-full text-amber-500 disabled:opacity-40">
          <FiSend size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}

/* ─────────── Group posts by month ─────────── */

function groupPostsByMonth(posts) {
  const groups = new Map()
  posts.forEach((post) => {
    const d = post.createdAt ? new Date(post.createdAt) : new Date()
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        sortKey: d.getFullYear() * 12 + d.getMonth(),
        posts: [],
      })
    }
    groups.get(key).posts.push(post)
  })
  return Array.from(groups.values()).sort((a, b) => b.sortKey - a.sortKey)
}

/* ─────────── List-view post (needs its own hook scope) ─────────── */

function PostListItem({
  post, user, gridItem, navigate,
  handleLike, handleDoubleTap, goToProfile, HeartAnimation,
  downloadingMap, handleDownload,
  commentDeltas, setCommentDeltas, setActiveCommentPostId,
}) {
  const mediaItems = getMediaItems(post)
  const mediaRatio = useMediaAspect(mediaItems)
  const isLiked = post.likes?.includes(user?._id)
  const baseCount = post.commentCount ?? 0
  const commentCount = baseCount + (commentDeltas[post._id] || 0)
  const isDownloading = downloadingMap[post._id] || false
  const downloadTarget = mediaItems[0]?.url

  return (
    <motion.article layoutId={`post-${post._id}`} variants={gridItem}
      className="rounded-2xl p-4 sm:p-5 transition-shadow hover:shadow-md"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>

      <header className="flex items-center gap-3 mb-2">
        <div onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer flex-shrink-0">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm hover:underline truncate"
             style={{ color: 'var(--text-primary)' }}
             onClick={(e) => goToProfile(e, post.author)}>
            {post.author?.name || 'Unknown'}
          </p>
          <p className="text-[11px] leading-none" style={{ color: 'var(--text-muted)' }}>
            {post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}
          </p>
        </div>
      </header>

      {mediaItems.length > 0 && (
        <div className="relative w-full mb-3 rounded-xl overflow-hidden cursor-pointer"
             style={{ background: 'var(--bg-secondary)', aspectRatio: mediaRatio, maxHeight: 520 }}>
          <MediaSlider
            items={mediaItems}
            title={post.title}
            postId={post._id}
            onDoubleTap={(e) => handleDoubleTap(e, post._id, true)}
            rounded=""
            className="w-full h-full"
            hideDots
            tapToNavigate={false}
            fit="contain"
            renderVideo={(item) => (
              <BoomerangVideo src={item.url} poster={item.thumbnail} className="w-full h-full object-contain" />
            )}
          />
          <MultiImageBadge count={mediaItems.length} />
          <HeartAnimation postId={post._id} />

          {/* ── Download button — moved to top-right, clear of the mute toggle at bottom-right ── */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!downloadTarget) return;
              const ext = downloadTarget.split('.').pop() || 'jpg';
              const filename = post.title ? `${post.title}.${ext}` : `download.${ext}`;
              handleDownload(post._id, downloadTarget, filename);
            }}
            disabled={isDownloading}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-800 hover:bg-white shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Download media"
          >
            {isDownloading ? (
              <FiLoader size={18} className="animate-spin" strokeWidth={2.5} />
            ) : (
              <FiDownload size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/posts/${post._id}`)}>
          {post.title && (
            <h3 className="font-extrabold font-display text-base leading-snug"
                style={{ color: 'var(--text-primary)' }}>
              {post.title}
            </h3>
          )}
          {post.content && post.content.trim() !== '' && post.content !== post.title && (
            <p className="text-sm mt-0.5 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
              {post.content}
            </p>
          )}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <motion.button onClick={e => handleLike(e, post._id)} whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-full hover:bg-[var(--bg-primary)] leading-none">
            {isLiked
              ? <FaHeart size={18} color="#ef4444" />
              : <FiHeart size={18} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
            <span className="text-sm font-bold leading-none"
                  style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>
              {post.likes?.length || 0}
            </span>
          </motion.button>
          <div className="flex items-center gap-1.5 h-10 px-4 leading-none">
            <FiMessageCircle size={18} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-bold leading-none" style={{ color: 'var(--text-muted)' }}>
              {commentCount}
            </span>
          </div>
        </div>
      </div>

      <InlineComments
        postId={post._id}
        user={user}
        onGoToProfile={(e, author) => goToProfile(e, author)}
        onOpenAll={(id) => setActiveCommentPostId(id)}
        onCountChange={(delta) =>
          setCommentDeltas((s) => ({ ...s, [post._id]: (s[post._id] || 0) + delta }))
        }
      />
    </motion.article>
  )
}

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [query, setQuery] = useState('')
  const [activeCommentPostId, setActiveCommentPostId] = useState(null)
  const [commentDeltas, setCommentDeltas] = useState({})
  const [gridCommentCounts, setGridCommentCounts] = useState({})
  const [showHeartAnimation, setShowHeartAnimation] = useState(null)
  const [downloadingMap, setDownloadingMap] = useState({})
  const [scrolled, setScrolled] = useState(false)
  const lastTapRef = useRef({})
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => { fetchPosts() }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setPosts([])
    } finally { setLoading(false) }
  }

  const handleLike = async (e, postId) => {
    e?.stopPropagation()
    if (!user) { toast.error('Log in to like posts'); navigate('/login'); return }
    try { await postsAPI.like(postId); fetchPosts() }
    catch (err) { console.error('Like failed:', err) }
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

  const openCommentsGrid = (e, postId) => { e.stopPropagation(); setActiveCommentPostId(postId) }

  const goToProfile = (e, author) => {
    e?.stopPropagation()
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    if (String(authorId) === String(myId)) navigate('/profile')
    else navigate(`/users/${authorId}`)
  }

  const HeartAnimation = ({ postId }) => (
    <AnimatePresence>
      {showHeartAnimation === postId && (
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 1.4, opacity: 1 }}
          exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <FaHeart size={80} color="#ef4444" />
        </motion.div>
      )}
    </AnimatePresence>
  )

  const handleDownload = async (postId, url, filename) => {
    if (!url) return
    setDownloadingMap(prev => ({ ...prev, [postId]: true }))
    const toastId = toast.loading('Downloading…')
    try {
      const proxyUrl = getDownloadUrl(url, filename)
      const response = await api.get(proxyUrl, { responseType: 'blob' })
      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
      toast.success('Download complete', { id: toastId })
    } catch (err) {
      console.error('Download failed:', err)
      toast.error('Download failed', { id: toastId })
    } finally {
      setDownloadingMap(prev => ({ ...prev, [postId]: false }))
    }
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
      <motion.div className="flex flex-col items-center justify-center h-screen text-center px-4"
        style={{ background: 'var(--bg-primary)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <FiImage size={40} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-2xl font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-muted)' }}>Share something with the world</p>
        <motion.button onClick={() => navigate('/create')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full text-sm shadow-lg shadow-amber-500/30">
          <FiPlusSquare size={20} strokeWidth={2.5} /> Create Post
        </motion.button>
      </motion.div>
    )
  }

  const q = query.trim().toLowerCase()
  const visiblePosts = q
    ? posts.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.caption?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q)) ||
        p.author?.name?.toLowerCase().includes(q)
      )
    : posts

  const gridContainer = { animate: { transition: { staggerChildren: 0.03 } } }
  const gridItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22 } } }
  const monthGroups = groupPostsByMonth(visiblePosts)

  const renderGridTile = (post) => {
    const mediaItems = getMediaItems(post)
    const isLiked = post.likes?.includes(user?._id)
    const commentCount = gridCommentCounts[post._id] ?? (post.commentCount ?? 0)
    return (
      <motion.div
        key={post._id}
        layoutId={`post-${post._id}`}
        variants={gridItem}
        whileHover={{ scale: 1.02 }}
        transition={{ layout: { type: 'spring', stiffness: 350, damping: 32 } }}
        className="relative group cursor-pointer rounded-[20%] overflow-hidden aspect-[4/5] shadow-sm"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {mediaItems.length > 0 ? (
          <MediaSlider
            items={mediaItems}
            title={post.title}
            postId={post._id}
            onDoubleTap={(e) => handleDoubleTap(e, post._id, true)}
            rounded=""
            className="w-full h-full"
            hideDots
            peek
            renderVideo={(item) => (
              <BoomerangVideo src={item.url} poster={item.thumbnail} className="w-full h-full object-cover" />
            )}
          />
        ) : (
          <div onClick={(e) => handleDoubleTap(e, post._id, true)} className="w-full h-full flex items-center justify-center">
            <FiImage size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        <MultiImageBadge count={mediaItems.length} />

        <div onClick={(e) => goToProfile(e, post.author)} className="absolute top-1.5 left-1.5 cursor-pointer z-10">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={22} className="ring-2 ring-white/70 shadow" />
        </div>

        <HeartAnimation postId={post._id} />

        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
        <div className="absolute bottom-1 right-1 flex items-center gap-0.5 z-10">
          <motion.button onClick={e => { e.stopPropagation(); handleLike(e, post._id) }} whileTap={{ scale: 0.9 }}
            className="flex items-center gap-0.5 h-6 px-1.5 text-white rounded-full leading-none">
            {isLiked ? <FaHeart size={11} color="#ef4444" /> : <FiHeart size={11} strokeWidth={2.8} className="drop-shadow" />}
            <span className="text-[10px] font-bold drop-shadow leading-none">{post.likes?.length || 0}</span>
          </motion.button>
          <motion.button onClick={e => openCommentsGrid(e, post._id)} whileTap={{ scale: 0.9 }}
            className="flex items-center gap-0.5 h-6 px-1.5 text-white rounded-full leading-none">
            <FiMessageCircle size={11} strokeWidth={2.8} className="drop-shadow" />
            <span className="text-[10px] font-bold drop-shadow leading-none">{commentCount}</span>
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <div className="min-h-screen pb-10" style={{ background: 'var(--bg-primary)' }}>

        {/* Floating header — over hero, solid on scroll */}
        <div
          className="fixed top-0 inset-x-0 z-30 px-3 sm:px-6 py-3 transition-all duration-300"
          style={{
            background: scrolled ? 'var(--bg-primary)' : 'transparent',
            boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
            backdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
            <div
              className="relative grid grid-cols-2 rounded-full p-1 w-[84px] flex-shrink-0"
              style={{
                background: scrolled ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <motion.div className="absolute top-1 bottom-1 rounded-full bg-amber-500"
                style={{ left: 4, width: 'calc(50% - 4px)' }}
                animate={{ x: viewMode === 'grid' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
              <button onClick={() => setViewMode('grid')} aria-label="Grid view"
                className="relative z-10 h-9 flex items-center justify-center rounded-full"
                style={{ color: viewMode === 'grid' ? '#fff' : (scrolled ? 'var(--text-muted)' : 'rgba(255,255,255,0.9)') }}>
                <FiGrid size={18} strokeWidth={2.5} />
              </button>
              <button onClick={() => setViewMode('list')} aria-label="List view"
                className="relative z-10 h-9 flex items-center justify-center rounded-full"
                style={{ color: viewMode === 'list' ? '#fff' : (scrolled ? 'var(--text-muted)' : 'rgba(255,255,255,0.9)') }}>
                <FiList size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative flex-1 min-w-0 max-w-xl mx-auto">
              <FiSearch
                size={16}
                strokeWidth={2.25}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: scrolled ? 'var(--text-muted)' : 'rgba(255,255,255,0.9)' }}
              />
              <input
                type="text"
                placeholder="Search posts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full text-sm outline-none border-0 transition-all focus:ring-2 focus:ring-amber-500/40 placeholder:opacity-80"
                style={{
                  background: scrolled ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.18)',
                  color: scrolled ? 'var(--text-primary)' : '#fff',
                  padding: '11px 40px 11px 42px',
                  fontWeight: 500,
                  backdropFilter: 'blur(8px)',
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
                    style={{
                      color: scrolled ? 'var(--text-primary)' : '#fff',
                      background: scrolled ? 'var(--bg-input)' : 'rgba(255,255,255,0.25)',
                    }}
                    aria-label="Clear search"
                  >
                    <FiX size={13} strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => navigate('/create')} aria-label="Create post"
              className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30 transition-colors flex-shrink-0">
              <FiPlusSquare size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Hero */}
        <WeddingHero />

        <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-3">
          {monthGroups.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center px-4 pt-20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-secondary)' }}>
                <FiSearch size={28} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No results</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No posts match "{query}"</p>
            </motion.div>
          ) : (
            <LayoutGroup>
              {monthGroups.map((group) => (
                <div key={group.key} className="mb-8">
                  <h2 className="text-lg font-extrabold font-display mb-3 px-1" style={{ color: 'var(--text-primary)' }}>
                    {group.label}
                  </h2>
                  {viewMode === 'grid' ? (
                    <motion.div
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3"
                      variants={gridContainer} initial="initial" animate="animate"
                    >
                      {group.posts.map((post) => renderGridTile(post))}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5"
                      variants={gridContainer} initial="initial" animate="animate"
                    >
                      {group.posts.map((post) => (
                        <PostListItem
                          key={post._id}
                          post={post}
                          user={user}
                          gridItem={gridItem}
                          navigate={navigate}
                          handleLike={handleLike}
                          handleDoubleTap={handleDoubleTap}
                          goToProfile={goToProfile}
                          HeartAnimation={HeartAnimation}
                          downloadingMap={downloadingMap}
                          handleDownload={handleDownload}
                          commentDeltas={commentDeltas}
                          setCommentDeltas={setCommentDeltas}
                          setActiveCommentPostId={setActiveCommentPostId}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </LayoutGroup>
          )}
        </div>
      </div>

      <CommentsSheet
        postId={activeCommentPostId}
        open={!!activeCommentPostId}
        onClose={() => setActiveCommentPostId(null)}
        user={user}
        onGoToProfile={(author) => goToProfile(null, author)}
        onCountChange={(count) =>
          setGridCommentCounts((s) => ({ ...s, [activeCommentPostId]: count }))
        }
      />
    </>
  )
}