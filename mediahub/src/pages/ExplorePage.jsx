import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiX, FiGrid, FiLayers, FiBell } from 'react-icons/fi'
import { usePostStore, useAuthStore } from '../store'
import { EmptyState, Avatar } from '../components/ui'
import { getImageUrls } from '../components/PostMedia'

export default function ExplorePage() {
  const { posts, isLoading, fetchPosts } = usePostStore()
  const { user } = useAuthStore()
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef()

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(posts)
      return
    }
    const q = query.toLowerCase()
    setFiltered(posts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      p.author?.name?.toLowerCase().includes(q)
    ))
  }, [query, posts])

  // Own avatar -> /profile, everyone else -> /users/:id
  const goToProfile = (e, author) => {
    e.stopPropagation()
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    if (String(authorId) === String(myId)) {
      navigate('/profile')
    } else {
      navigate(`/users/${authorId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"
        />
      </div>
    )
  }

  return (
    // min-h-full (not min-h-screen) — the page lives inside Layout's
    // <main> which already handles scrolling via overflow-y-auto + h-dvh.
    // min-h-screen used a raw 100vh, which on mobile Safari/Chrome can be
    // taller than the real visible viewport and was contributing to the
    // "page won't scroll properly / content gets cut" issue. min-h-full
    // just fills whatever space the scroll container actually gives it.
    <div className="min-h-full pb-10 fade-in" style={{ background: 'var(--bg-primary)' }}>
      {/* Sticky, blurred header — same treatment as FeedPage so both
          top-level pages feel consistent, and so the title/search never
          gets trapped scrolling under the app header on mobile. */}
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 sm:px-6 py-3"
        style={{ background: 'color-mix(in oklab, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 font-extrabold font-display text-lg" style={{ color: 'var(--text-primary)' }}>
            Explore
          </div>
          <button
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiBell size={19} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        {/* Search bar — bold Pinterest-style pill */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="relative max-w-6xl mb-8 sm:mb-10"
        >
          <FiSearch
            size={24}
            strokeWidth={2.5}
            className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)', zIndex: 10 }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts, tags, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full text-base font-medium outline-none border-2 focus:border-amber-500 transition-all shadow-sm focus:shadow-md"
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
              padding: '12px 60px',
            }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)', translateY: '-50%' }}
              >
                <FiX size={18} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="h-4 sm:h-6" />

        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <EmptyState
              icon={FiGrid}
              title={query ? "No results found" : "No posts yet"}
              description={query ? `Nothing found for "${query}"` : 'Be the first to share something amazing!'}
              action={
                !query && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/create')}
                    className="text-sm font-bold px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-white"
                  >
                    Create Post
                  </motion.button>
                )
              }
            />
          </motion.div>
        ) : (
          <motion.div
            layout
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } },
            }}
            className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4"
          >
            <AnimatePresence>
              {filtered.map((post) => {
                const urls = getImageUrls(post)
                const imageUrl = urls[0]
                const hasMultiple = urls.length > 1
                const displayText = post.title || post.content || post.caption || 'Untitled'

                return (
                  <motion.div
                    key={post._id || post.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.97 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    onClick={() => navigate(`/posts/${post._id || post.id}`)}
                    className="break-inside-avoid cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-xl group"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    {imageUrl ? (
                      <div className="relative overflow-hidden">
                        {/* Multiple images indicator */}
                        {hasMultiple && (
                          <div
                            className="absolute top-2.5 left-2.5 z-10 text-white bg-black/50 backdrop-blur-sm rounded-full p-1.5"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                            aria-label={`${urls.length} photos`}
                          >
                            <FiLayers size={14} strokeWidth={2.5} />
                          </div>
                        )}

                        <motion.img
                          src={imageUrl}
                          alt={displayText}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                          whileHover={{ scale: 1.06 }}
                          transition={{ duration: 0.3 }}
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl)
                            e.target.style.display = 'none'
                            const parent = e.target.parentElement
                            const fallback = document.createElement('div')
                            fallback.className = 'p-4 min-h-[150px] flex items-center justify-center'
                            fallback.style.cssText = 'background: var(--bg-secondary)'
                            fallback.innerHTML = `<p class="text-sm text-center line-clamp-4" style="color: var(--text-secondary)">${displayText}</p>`
                            parent.appendChild(fallback)
                          }}
                        />

                        {/* Avatar + likes overlaid on the image — no name text on the photo */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pt-8 pb-2.5 px-2.5 flex items-center">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer">
                            <Avatar src={post.author?.avatar} name={post.author?.name} size={26} ring />
                          </motion.div>
                          {post.likes && post.likes.length > 0 && (
                            <span className="text-white text-xs font-bold ml-auto drop-shadow-sm">
                              ❤️ {post.likes.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 min-h-[150px] flex flex-col justify-between">
                        <p className="text-sm text-center line-clamp-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {displayText}
                        </p>
                        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => goToProfile(e, post.author)} className="cursor-pointer flex-shrink-0">
                            <Avatar src={post.author?.avatar} name={post.author?.name} size={22} />
                          </motion.div>
                          <span
                            className="text-xs font-semibold truncate cursor-pointer hover:underline"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={(e) => goToProfile(e, post.author)}
                          >
                            {post.author?.name || 'Unknown'}
                          </span>
                          {post.likes && post.likes.length > 0 && (
                            <span className="text-xs font-bold ml-auto" style={{ color: 'var(--text-muted)' }}>
                              ❤️ {post.likes.length}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}