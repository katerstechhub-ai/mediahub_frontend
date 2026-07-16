// MediaSlider.js – fully functional, passes isActive to renderVideo
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

// ── Helper: normalize a post's images into an array of URLs ──────────────────
export function getImageUrls(post) {
  if (!post) return []
  const urls = []
  if (Array.isArray(post.images)) {
    post.images.forEach(img => {
      if (typeof img === 'string') urls.push(img)
      else if (img?.url) urls.push(img.url)
    })
  }
  if (Array.isArray(post.videos)) {
    post.videos.forEach(vid => {
      if (typeof vid === 'string') urls.push(vid)
      else if (vid?.url) urls.push(vid.url)
    })
  }
  if (Array.isArray(post.media)) {
    post.media.forEach(m => {
      const u = typeof m === 'string' ? m : m?.url
      if (u && !urls.includes(u)) urls.push(u)
    })
  }
  if (urls.length === 0) {
    if (post.image?.url) urls.push(post.image.url)
    else if (typeof post.image === 'string') urls.push(post.image)
    else if (post.imageUrl) urls.push(post.imageUrl)
    else if (post.thumbnail) urls.push(post.thumbnail)
  }
  return urls.filter(Boolean)
}

export function getMediaItems(post) {
  if (!post) return []
  const items = []
  if (Array.isArray(post.images)) {
    post.images.forEach(img => {
      const url = typeof img === 'string' ? img : img?.url
      if (url) items.push({ type: 'image', url })
    })
  }
  if (Array.isArray(post.videos)) {
    post.videos.forEach(vid => {
      if (typeof vid === 'string') items.push({ type: 'video', url: vid, thumbnail: null })
      else if (vid?.url) items.push({ type: 'video', url: vid.url, thumbnail: vid.thumbnail || null })
    })
  }
  if (items.length === 0 && Array.isArray(post.media)) {
    post.media.forEach(m => {
      const url = typeof m === 'string' ? m : m?.url
      const type = m?.type || (url && /\.(mp4|mov|webm|m4v)$/i.test(url) ? 'video' : 'image')
      if (url) items.push({ type, url, thumbnail: m?.thumbnail })
    })
  }
  if (items.length === 0) {
    if (post.image?.url) items.push({ type: 'image', url: post.image.url })
    else if (typeof post.image === 'string') items.push({ type: 'image', url: post.image })
    else if (post.imageUrl) items.push({ type: 'image', url: post.imageUrl })
    else if (post.thumbnail) items.push({ type: 'image', url: post.thumbnail })
  }
  return items
}

export function MultiImage({ urls, title, postId, onDoubleTap, tileRadius = 'rounded-xl', gapClass = 'gap-1.5', children }) {
  // ... (same as you pasted, no changes)
}

export function ImageSlider({ urls, title, postId, onDoubleTap, rounded = 'rounded-2xl', className = '', showCounter = true, hideDots = false, peek = false, tapToNavigate = true }) {
  // ... (same as you pasted, no changes)
}

export function MediaSlider({ items, title, postId, onDoubleTap, rounded = 'rounded-2xl', className = '', showCounter = true, hideDots = false, peek = false, tapToNavigate = true, renderVideo }) {
  const [index, setIndex] = useState(0)
  const containerRef = useRef(null)
  const dragInfo = useRef({ dragged: false })

  if (!items || items.length === 0) return null

  const renderSlide = (item, isActive) => (
    item.type === 'video'
      ? (renderVideo
          ? renderVideo(item, isActive)
          : (
            <video
              src={item.url}
              poster={item.thumbnail || undefined}
              className="w-full h-full object-cover"
              muted
              playsInline
              controls
            />
          ))
      : (
        <img
          src={item.url}
          alt={title || 'Post'}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={(e) => (e.target.style.display = 'none')}
        />
      )
  )

  if (items.length === 1) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${rounded} ${className}`} onClick={onDoubleTap}>
        {renderSlide(items[0], true)}
      </div>
    )
  }

  const hasNext = index < items.length - 1
  const hasNextNext = index < items.length - 2
  const clampIndex = (i) => Math.max(0, Math.min(items.length - 1, i))

  const goTo = (i, e) => { e?.stopPropagation(); setIndex(clampIndex(i)) }

  const handleTap = (e) => {
    if (dragInfo.current.dragged) { dragInfo.current.dragged = false; return }
    if (tapToNavigate) {
      const rect = containerRef.current.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      if (ratio < 0.25) {
        if (index > 0) goTo(index - 1, e); else e.stopPropagation()
        return
      }
      if (ratio > 0.75) {
        if (index < items.length - 1) goTo(index + 1, e); else e.stopPropagation()
        return
      }
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

  const stackImg = (item) => item.thumbnail || (item.type === 'image' ? item.url : null)
  const showStack = peek && hasNext
  const showStack2 = peek && hasNextNext

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${rounded} ${className}`} style={{ touchAction: 'pan-y' }} onClick={handleTap}>
      {showStack2 && stackImg(items[index + 2]) && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[20%] pointer-events-none"
          style={{ transform: 'rotate(22deg) scale(0.86) translate(9%, -7%)', filter: 'brightness(0.55)' }}
        >
          <img src={stackImg(items[index + 2])} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      )}

      {showStack && stackImg(items[index + 1]) && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[20%] pointer-events-none"
          style={{ transform: 'rotate(16deg) scale(0.91) translate(4.5%, -3.5%)', filter: 'brightness(0.75)' }}
        >
          <img src={stackImg(items[index + 1])} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      )}

      <div
        className={`absolute inset-0 overflow-hidden ${showStack ? 'rounded-[20%]' : ''}`}
        style={showStack ? { transform: 'rotate(-10deg)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' } : undefined}
      >
        <motion.div
          className="flex h-full"
          style={{ width: `${items.length * 100}%` }}
          drag="x"
          dragConstraints={containerRef}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={{ x: `-${index * (100 / items.length)}%` }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        >
          {items.map((item, i) => (
            <div
              key={`${postId}-${i}`}
              className="h-full flex-shrink-0 pointer-events-none"
              style={{ width: `${100 / items.length}%` }}
            >
              {renderSlide(item, i === index)}
            </div>
          ))}
        </motion.div>
      </div>

      {showCounter && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white z-20 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          {index + 1}/{items.length}
        </div>
      )}
      {!hideDots && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={(e) => goTo(i, e)}
              aria-label={`Go to item ${i + 1}`}
              className="h-1.5 rounded-full transition-all pointer-events-auto"
              style={{ width: i === index ? 14 : 6, background: i === index ? '#fff' : 'rgba(255,255,255,0.55)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}