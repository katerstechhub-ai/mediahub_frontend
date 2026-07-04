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
// uses ImageSlider instead (see below), but this stays available/unused
// elsewhere without breaking anything.
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

// ── ImageSlider — tap/swipe carousel with an optional tilted photo-stack look ─
// Position is driven by React state (`index`), not native scroll — this is
// what keeps the last image reachable, since browser scroll-snap can round
// awkwardly on the final slide at certain container widths.
//
// Tap zones:
//   - Left ~25% of the frame  → previous image (no-op at the first image)
//   - Right ~25% of the frame → next image (no-op at the last image)
//   - Center ~50%             → passed straight through to onDoubleTap
//                                (single tap → open post, double tap → like)
// Swiping still works via drag too.
//
// peek: when true (used on grid tiles), the current photo renders as a
// tilted card with up to two more photos fanned out behind it (each more
// rotated, offset, and dimmed than the last) — a visible pile of photos
// rather than one flat image. Purely decorative; navigation logic above is
// unaffected.
//
// hideDots / showCounter control the bottom dot row and the "1/4" badge.
export function ImageSlider({ urls, title, postId, onDoubleTap, rounded = 'rounded-2xl', className = '', showCounter = true, hideDots = false, peek = false }) {
  const [index, setIndex] = useState(0)
  const containerRef = useRef(null)
  const dragInfo = useRef({ dragged: false })

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

  const hasNext = index < urls.length - 1
  const hasNextNext = index < urls.length - 2
  const clampIndex = (i) => Math.max(0, Math.min(urls.length - 1, i))

  const goTo = (i, e) => {
    e?.stopPropagation()
    setIndex(clampIndex(i))
  }

  const handleTap = (e) => {
    // Ignore the click that fires right after a drag gesture.
    if (dragInfo.current.dragged) {
      dragInfo.current.dragged = false
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width

    if (ratio < 0.25) {
      if (index > 0) goTo(index - 1, e)
      else e.stopPropagation()
      return
    }
    if (ratio > 0.75) {
      if (index < urls.length - 1) goTo(index + 1, e)
      else e.stopPropagation()
      return
    }
    onDoubleTap?.(e)
  }

  const handleDragEnd = (e, info) => {
    const threshold = 40
    if (Math.abs(info.offset.x) > threshold) {
      dragInfo.current.dragged = true
      if (info.offset.x < 0) setIndex((i) => clampIndex(i + 1))
      else setIndex((i) => clampIndex(i - 1))
    }
  }

  const showStack = peek && hasNext
  const showStack2 = peek && hasNextNext

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${rounded} ${className}`} onClick={handleTap}>
      {/* Furthest back card: photo two ahead — rotated further and dimmed
          more than the first back card. Only renders when at least 3 images
          remain in the stack from here, so it doesn't flash in/out oddly
          near the end of a set. */}
      {showStack2 && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[20%] pointer-events-none"
          style={{ transform: 'rotate(22deg) scale(0.86) translate(9%, -7%)', filter: 'brightness(0.55)' }}
        >
          <img
            src={urls[index + 2]}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Back card: the next photo, tilted and dimmed, sitting behind the
          current one. Because the front card below is also rotated (the
          opposite way), its corners don't fully cover this container, so a
          slice of this back card pops out — the "pile of photos" look. */}
      {showStack && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[20%] pointer-events-none"
          style={{ transform: 'rotate(16deg) scale(0.91) translate(4.5%, -3.5%)', filter: 'brightness(0.75)' }}
        >
          <img
            src={urls[index + 1]}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Front card: the actual sliding track, tilted the opposite way when
          stacked, so the cards behind it fan out clearly rather than hiding
          directly underneath. */}
      <div
        className={`absolute inset-0 overflow-hidden ${showStack ? 'rounded-[20%]' : ''}`}
        style={showStack ? { transform: 'rotate(-10deg)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' } : undefined}
      >
        <motion.div
          className="flex h-full"
          style={{ width: `${urls.length * 100}%` }}
          drag="x"
          dragConstraints={containerRef}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={{ x: `-${index * (100 / urls.length)}%` }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        >
          {urls.map((url, i) => (
            <div
              key={`${postId}-${i}`}
              className="h-full flex-shrink-0"
              style={{ width: `${100 / urls.length}%` }}
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
        </motion.div>
      </div>

      {showCounter && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white z-20 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          {index + 1}/{urls.length}
        </div>
      )}
      {!hideDots && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
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