import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

// ── Helper: normalize a post's images into an array of URLs ──────────────────
// Handles the current backend shape (post.images: [{ url, public_id }])
// plus a few legacy/fallback shapes so old posts don't break.
export function getImageUrls(post) {
  if (!post) return []
  const urls = []
  // New multi-image field (preferred)
  if (Array.isArray(post.images)) {
    post.images.forEach(img => {
      if (typeof img === 'string') urls.push(img)
      else if (img?.url) urls.push(img.url)
    })
  }
  // Media array
  if (Array.isArray(post.media)) {
    post.media.forEach(m => {
      const u = typeof m === 'string' ? m : m?.url
      if (u && !urls.includes(u)) urls.push(u)
    })
  }
  // Single image fallbacks (older posts created before the multi-image change)
  if (urls.length === 0) {
    if (post.image?.url) urls.push(post.image.url)
    else if (typeof post.image === 'string') urls.push(post.image)
    else if (post.imageUrl) urls.push(post.imageUrl)
    else if (post.thumbnail) urls.push(post.thumbnail)
  }
  return urls.filter(Boolean)
}

// ── MultiImage — animated bento collage for 1 or up to 4 images ──────────────
// Kept for any place that still wants the collage layout. FeedPage's grid view
// now uses ImageSlider instead (see below), but this stays available/unused
// elsewhere without breaking anything.
// 1 image  → full frame
// 2 images → 2 columns
// 3 images → 1 large left, 2 stacked right
// 4+       → 2×2 grid (extra images collapsed under a "+N" chip on the last tile)
export function MultiImage({ urls, title, postId, onDoubleTap, tileRadius = 'rounded-xl', gapClass = 'gap-1.5', children }) {
  const count = Math.min(urls.length, 4)
  const extra = urls.length - 4
  const tileVariants = {
    initial: { opacity: 0, scale: 0.92 },
    animate: (i) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i * 0.06, type: 'spring', stiffness: 320, damping: 26 }
    }),
  }
  const renderTile = (url, i, className = '', showExtra = false) => (
    <motion.div
      key={`${postId}-${i}`}
      custom={i}
      variants={tileVariants}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.015 }}
      className={`relative overflow-hidden ${tileRadius} ${className}`}
      style={{ background: 'var(--bg-secondary)' }}
    >
      <img
        src={url}
        alt={`${title || 'Post'} ${i + 1}`}
        className="w-full h-full object-cover transition-transform duration-200"
        loading="lazy"
        onError={(e) => (e.target.style.display = 'none')}
      />
      {showExtra && extra > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className={`absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] ${tileRadius}`}
        >
          <span className="text-white text-lg sm:text-2xl font-extrabold drop-shadow-lg">+{extra}</span>
        </motion.div>
      )}
    </motion.div>
  )
  return (
    <div
      onClick={onDoubleTap}
      className={`relative w-full h-full grid ${gapClass} cursor-pointer`}
      style={{
        gridTemplateColumns:
          count === 1 ? '1fr' :
          count === 2 ? '1fr 1fr' :
          count === 3 ? '2fr 1fr' :
          '1fr 1fr',
        gridTemplateRows:
          count === 1 ? '1fr' :
          count === 2 ? '1fr' :
          count === 3 ? '1fr 1fr' :
          '1fr 1fr',
      }}
    >
      {count === 1 && renderTile(urls[0], 0, 'w-full h-full')}
      {count === 2 && urls.slice(0, 2).map((u, i) => renderTile(u, i, 'w-full h-full'))}
      {count === 3 && (
        <>
          {renderTile(urls[0], 0, 'row-span-2 w-full h-full')}
          {renderTile(urls[1], 1, 'w-full h-full')}
          {renderTile(urls[2], 2, 'w-full h-full')}
        </>
      )}
      {count === 4 && urls.slice(0, 4).map((u, i) =>
        renderTile(u, i, 'w-full h-full', i === 3)
      )}
      {children}
    </div>
  )
}

// ── ImageSlider — Instagram-style swipeable carousel ──────────────────────────
// Shows one image at a time, swipe/drag to move between them. Uses native
// scroll-snap so it naturally stops at the first/last image (no looping).
// Falls back to a plain image when there's only one, so it's safe to use
// unconditionally anywhere a post's photos render.
//
// hideDots: pass true to suppress the bottom dot-indicator row (e.g. for
// small grid thumbnails where dots don't have room / aren't wanted).
// showCounter still controls the top-right "1/4" badge independently.
export function ImageSlider({ urls, title, postId, onDoubleTap, rounded = 'rounded-2xl', className = '', showCounter = true, hideDots = false }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)

  if (!urls || urls.length === 0) return null

  if (urls.length === 1) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${rounded} ${className}`} onClick={onDoubleTap}>
        <img
          src={urls[0]}
          alt={title || 'Post'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => (e.target.style.display = 'none')}
        />
      </div>
    )
  }

  const handleScroll = () => {
    const el = trackRef.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(Math.max(0, Math.min(urls.length - 1, i)))
  }

  const goTo = (i, e) => {
    e?.stopPropagation()
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${rounded} ${className}`}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onClick={onDoubleTap}
        className="flex w-full h-full overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {urls.map((url, i) => (
          <div
            key={`${postId}-${i}`}
            className="w-full h-full flex-shrink-0"
            style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
          >
            <img
              src={url}
              alt={`${title || 'Post'} ${i + 1}`}
              className="w-full h-full object-cover pointer-events-none"
              loading="lazy"
              draggable={false}
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>
        ))}
      </div>
      {showCounter && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white z-10 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          {index + 1}/{urls.length}
        </div>
      )}
      {!hideDots && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={(e) => goTo(i, e)}
              aria-label={`Go to image ${i + 1}`}
              className="h-1.5 rounded-full transition-all pointer-events-auto"
              style={{ width: i === index ? 14 : 6, background: i === index ? '#fff' : 'rgba(255,255,255,0.55)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}