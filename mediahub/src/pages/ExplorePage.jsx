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

  useEffect(() => { fetchPosts() }, [])

  useEffect(() => {
    if (!query.trim()) { setFiltered(posts); return }
    const q = query.toLowerCase()
    setFiltered(posts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      p.author?.name?.toLowerCase().includes(q)
    ))
  }, [query, posts])

  const goToProfile = (e, author) => {
    e.stopPropagation()
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    navigate(String(authorId) === String(myId) ? '/profile' : `/users/${authorId}`)
  }

  if (isLoading) {
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

  return (
    <div className="min-h-full pb-16 fade-in" style={{ background: 'var(--bg-primary)' }}>
      {/* Sticky header — thinner, quieter */}
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-xl px-4 sm:px-8 py-3"
        style={{
          background: 'color-mix(in oklab, var(--bg-primary) 82%, transparent)',
          borderColor: 'color-mix(in oklab, var(--border) 60%, transparent)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div
            className="min-w-0 font-display text-[15px] tracking-tight"
            style={{ color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            Explore
          </div>
          <button
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <FiBell size={17} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-4">
        {/* Search — slimmer, single hairline border */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="relative max-w-2xl mx-auto mb-10 sm:mb-14"
        >
          <FiSearch
            size={17}
            strokeWidth={1.75}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts, tags, people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full text-sm outline-none border transition-all focus:border-amber-500/70"
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
              padding: '10px 40px',
              fontWeight: 400,
            }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
                aria-label="Clear search"
              >
                <FiX size={13} strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <EmptyState
              icon={FiGrid}
              title={query ? 'No results' : 'Nothing here yet'}
              description={query ? `No matches for "${query}"` : 'Be the first to share something.'}
              action={
                !query && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/create')}
                    className="text-sm font-medium px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white"
                  >
                    Create post
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
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
            className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2.5 sm:gap-3 space-y-2.5 sm:space-y-3"
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
                      hidden: { opacity: 0, y: 12, scale: 0.98 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ y: -3 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    onClick={() => navigate(`/posts/${post._id || post.id}`)}
                    className="break-inside-avoid cursor-pointer rounded-xl overflow-hidden group ring-1 ring-black/[0.04] hover:ring-black/[0.08] transition-shadow"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    {imageUrl ? (
                      <div className="relative overflow-hidden">
                        {hasMultiple && (
                          <div
                            className="absolute top-2 left-2 z-10 text-white/95 bg-black/40 backdrop-blur-md rounded-full p-1"
                            aria-label={`${urls.length} photos`}
                          >
                            <FiLayers size={11} strokeWidth={2} />
                          </div>
                        )}

                        <motion.img
                          src={imageUrl}
                          alt={displayText}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                          whileHover={{ scale: 1.04 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const parent = e.target.parentElement
                            const fallback = document.createElement('div')
                            fallback.className = 'p-4 min-h-[140px] flex items-center justify-center'
                            fallback.style.cssText = 'background: var(--bg-secondary)'
                            fallback.innerHTML = `<p class="text-xs text-center line-clamp-4" style="color: var(--text-secondary)">${displayText}</p>`
                            parent.appendChild(fallback)
                          }}
                        />

                        {/* Overlay — softer gradient, quieter typography */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pt-10 pb-2 px-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <motion.div
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => goToProfile(e, post.author)}
                            className="cursor-pointer"
                          >
                            <Avatar src={post.author?.avatar} name={post.author?.name} size={22} ring />
                          </motion.div>
                          {post.likes && post.likes.length > 0 && (
                            <span className="text-white/95 text-[11px] font-medium ml-auto tracking-wide">
                              ♥ {post.likes.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 min-h-[140px] flex flex-col justify-between">
                        <p
                          className="text-[13px] leading-relaxed text-center line-clamp-5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {displayText}
                        </p>
                        <div
                          className="flex items-center gap-2 pt-3 mt-3 border-t"
                          style={{ borderColor: 'color-mix(in oklab, var(--border) 60%, transparent)' }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => goToProfile(e, post.author)}
                            className="cursor-pointer flex-shrink-0"
                          >
                            <Avatar src={post.author?.avatar} name={post.author?.name} size={18} />
                          </motion.div>
                          <span
                            className="text-[11px] font-medium truncate cursor-pointer hover:underline"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={(e) => goToProfile(e, post.author)}
                          >
                            {post.author?.name || 'Unknown'}
                          </span>
                          {post.likes && post.likes.length > 0 && (
                            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                              ♥ {post.likes.length}
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
