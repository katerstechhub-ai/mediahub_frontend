import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList,
  FiX, FiMoreHorizontal, FiTrash2, FiCopy
} from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import { getImageUrls, ImageSlider } from '../components/PostMedia'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

import CommentsSheet from './_CommentsSheet'

/* ─────────── Small helper: multi-image badge ─────────── */
function MultiImageBadge({ count }) {
  if (!count || count < 2) return null
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold leading-none shadow">
      <FiCopy size={11} strokeWidth={2.8} />
      {count}
    </div>
  )
}

/* ─────────── Group posts into "July 2026", "June 2026", etc. ─────────── */
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

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
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

  const openComments = (e, postId) => { e.stopPropagation(); setActiveCommentPostId(postId) }

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

  const gridContainer = { animate: { transition: { staggerChildren: 0.03 } } }
  const gridItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22 } } }
  const monthGroups = groupPostsByMonth(posts)

  const renderGridTile = (post) => {
    const urls = getImageUrls(post)
    const isLiked = post.likes?.includes(user?._id)
    const commentCount = post.commentCount ?? 0
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
        {urls.length > 0 ? (
          urls.length > 1 ? (
            <ImageSlider
              urls={urls}
              title={post.title}
              postId={post._id}
              onDoubleTap={(e) => handleDoubleTap(e, post._id, true)}
              rounded=""
              className="w-full h-full"
              hideDots
              peek
            />
          ) : (
            <img
              src={urls[0]}
              alt={post.title || 'Post'}
              className="w-full h-full object-cover"
              loading="lazy"
              onClick={(e) => handleDoubleTap(e, post._id, true)}
              onError={e => e.target.style.display = 'none'}
            />
          )
        ) : (
          <div onClick={(e) => handleDoubleTap(e, post._id, true)} className="w-full h-full flex items-center justify-center">
            <FiImage size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        <MultiImageBadge count={urls.length} />

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
          <motion.button onClick={e => openComments(e, post._id)} whileTap={{ scale: 0.9 }}
            className="flex items-center gap-0.5 h-6 px-1.5 text-white rounded-full leading-none">
            <FiMessageCircle size={11} strokeWidth={2.8} className="drop-shadow" />
            <span className="text-[10px] font-bold drop-shadow leading-none">{commentCount}</span>
          </motion.button>
        </div>
      </motion.div>
    )
  }

  const renderListItem = (post) => {
    const urls = getImageUrls(post)
    const isLiked = post.likes?.includes(user?._id)
    const commentCount = post.commentCount ?? 0
    return (
      <motion.article key={post._id} layoutId={`post-${post._id}`} variants={gridItem}
        className="border-b pb-5 md:border md:rounded-2xl md:p-4 md:pb-4 md:shadow-sm"
        style={{ borderColor: 'var(--border)' }}>

        <header className="flex items-center gap-3 px-1 md:px-0 mb-2">
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

        {urls.length > 0 && (
          <div className="relative w-full mb-3 rounded-xl overflow-hidden cursor-pointer aspect-square"
               style={{ background: 'var(--bg-secondary)' }}>
            {urls.length === 1 ? (
              <div onClick={e => handleDoubleTap(e, post._id, true)} className="w-full h-full">
                <img src={urls[0]} alt={post.title || 'Post'}
                     className="w-full h-full object-cover"
                     loading="lazy" onError={e => e.target.style.display = 'none'} />
              </div>
            ) : (
              <ImageSlider urls={urls} title={post.title} postId={post._id}
                onDoubleTap={(e) => handleDoubleTap(e, post._id, true)} rounded="" className="w-full h-full" hideDots />
            )}
            <MultiImageBadge count={urls.length} />
            <HeartAnimation postId={post._id} />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 px-1 md:px-0">
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

          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button onClick={e => handleLike(e, post._id)} whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1 h-8 px-2.5 rounded-full hover:bg-[var(--bg-secondary)] leading-none">
              {isLiked
                ? <FaHeart size={16} color="#ef4444" />
                : <FiHeart size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
              <span className="text-xs font-bold leading-none"
                    style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>
                {post.likes?.length || 0}
              </span>
            </motion.button>
            <motion.button onClick={e => openComments(e, post._id)} whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1 h-8 px-2.5 rounded-full hover:bg-[var(--bg-secondary)] leading-none">
              <FiMessageCircle size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-bold leading-none" style={{ color: 'var(--text-muted)' }}>
                {commentCount}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.article>
    )
  }

  return (
    <>
      <div className="min-h-screen pb-24" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 sm:px-6 py-3"
             style={{ background: 'color-mix(in oklab, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0 font-extrabold font-display text-lg" style={{ color: 'var(--text-primary)' }}>
              Feed
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative grid grid-cols-2 rounded-full p-1 shadow-sm w-[84px]" style={{ background: 'var(--bg-secondary)' }}>
                <motion.div className="absolute top-1 bottom-1 rounded-full bg-amber-500"
                  style={{ left: 4, width: 'calc(50% - 4px)' }}
                  animate={{ x: viewMode === 'grid' ? 0 : '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
                <button onClick={() => setViewMode('grid')} aria-label="Grid view"
                  className="relative z-10 h-9 flex items-center justify-center rounded-full"
                  style={{ color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)' }}>
                  <FiGrid size={18} strokeWidth={2.5} />
                </button>
                <button onClick={() => setViewMode('list')} aria-label="List view"
                  className="relative z-10 h-9 flex items-center justify-center rounded-full"
                  style={{ color: viewMode === 'list' ? '#fff' : 'var(--text-muted)' }}>
                  <FiList size={18} strokeWidth={2.5} />
                </button>
              </div>
              <button onClick={() => navigate('/create')} aria-label="Create post"
                className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg font-bold text-sm hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-primary)' }}>
                <FiPlusSquare size={18} strokeWidth={2.5} />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-3">
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
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8"
                    variants={gridContainer} initial="initial" animate="animate"
                  >
                    {group.posts.map((post) => renderListItem(post))}
                  </motion.div>
                )}
              </div>
            ))}
          </LayoutGroup>
        </div>
      </div>

      <CommentsSheet
        postId={activeCommentPostId}
        open={!!activeCommentPostId}
        onClose={() => setActiveCommentPostId(null)}
        user={user}
        onGoToProfile={(author) => goToProfile(null, author)}
      />
    </>
  )
}