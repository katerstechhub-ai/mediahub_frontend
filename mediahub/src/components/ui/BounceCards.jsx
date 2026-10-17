import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import MemoryVideo from './MemoryVideo'
import SafeImage from './SafeImage'
import PostPreviewModal from './PostPreviewModal'

// Tilt of each of the five cards (left to right)
const TILTS = [6, 2, -4, 6, -6, 3, -3]
// Most cards the row shows. Any number from 1 up to this works; extra photos go to the grid below.
const MAX_CARDS = 12

export default function BounceCards({
  className = '',
  images = [],
  containerWidth = 520,
  containerHeight = 230,
  animationDelay = 0.25,
  animationStagger = 0.08,
  easeType = 'elastic.out(1, 0.65)',
  enableHover = true,
  // Optional. Without it, the preview's "View post" button goes to /posts/:postId by itself.
  onPostSelect,
  // Optional. Called with an item's src when it fails completely and is removed.
  onItemFail,
}) {
  const containerRef = useRef(null)
  // Cards that failed completely (removed from the row)
  const [failed, setFailed] = useState(() => new Set())
  // Cards whose poster image failed but that have a real video: shown as a video instead
  const [posterFailed, setPosterFailed] = useState(() => new Set())
  const [opened, setOpened] = useState(null)
  const [hovered, setHovered] = useState(-1)
  const [width, setWidth] = useState(containerWidth)

  const visibleItems = images.filter((item) => {
    const src = typeof item === 'string' ? item : item?.src
    return src && !failed.has(src)
  }).slice(0, MAX_CARDS)
  const hasItems = visibleItems.length > 0

  // Measure the real width before the first paint, so the cards never shrink after loading
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const measured = el.getBoundingClientRect().width
    if (measured) setWidth(measured)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width
      if (next) setWidth(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasItems])

  // The entrance bounce plays once, when the cards first appear.
  useEffect(() => {
    if (!hasItems) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo('.profile-bounce-card', { scale: 0, opacity: 0 }, {
        scale: 1,
        opacity: 1,
        stagger: animationStagger,
        ease: easeType,
        delay: animationDelay,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [hasItems, animationDelay, animationStagger, easeType])

  const changeHover = (hoveredIndex) => {
    setHovered(hoveredIndex)
    if (!enableHover || !containerRef.current) return
    const cards = containerRef.current.querySelectorAll('.profile-bounce-card')
    cards.forEach((card, index) => {
      gsap.to(card, {
        x: index === hoveredIndex ? 0 : index < hoveredIndex ? -10 : 10,
        rotate: index === hoveredIndex ? 0 : undefined,
        duration: 0.35,
        ease: 'back.out(1.4)',
        overwrite: 'auto',
      })
    })
  }

  const resetHover = () => {
    setHovered(-1)
    if (!enableHover || !containerRef.current) return
    containerRef.current.querySelectorAll('.profile-bounce-card').forEach((card, index) => {
      gsap.to(card, { x: 0, rotate: TILTS[index] || 0, duration: 0.35, ease: 'back.out(1.4)', overwrite: 'auto' })
    })
  }

  const removeFailed = (src) => {
    setFailed((current) => new Set([...current, src]))
    if (onItemFail) onItemFail(src)
  }

  const handleImageError = (item, src) => {
    // Poster could not load: if the card has a real video, show that instead of deleting the card
    if (typeof item !== 'string' && item?.video && !posterFailed.has(src)) {
      setPosterFailed((current) => new Set([...current, src]))
    }
  }

  if (!hasItems) return null

  const count = visibleItems.length
  // Cards shrink as more are added, so each one keeps a clear strip you can tap.
  // One or two cards get the full size; seven fit a phone-width row.
  const size = Math.round(Math.min(174, Math.max(80, width / (1 + (count - 1) * 0.5))))
  const step = count > 1 ? Math.min(size * 0.62, (width - size - 8) / (count - 1)) : 0
  const mid = (count - 1) / 2

  return (
    <>
      <div
        ref={containerRef}
        className={`relative mx-auto ${className}`}
        style={{ width: '100%', maxWidth: containerWidth, height: containerHeight }}
        onMouseLeave={resetHover}
      >
        {visibleItems.map((item, index) => {
          const src = typeof item === 'string' ? item : item?.src
          const isRealVideo = typeof item !== 'string' && item?.type === 'video'
          const showFallbackVideo = typeof item !== 'string' && item?.video && posterFailed.has(src)
          const openItem = () => setOpened(typeof item === 'string' ? { type: 'image', src: item } : item)
          return (
          <div
            key={`${src}-${index}`}
            className="profile-bounce-card absolute top-1/2 cursor-pointer overflow-hidden rounded-[22px] border-[5px] border-white bg-[color-mix(in_srgb,var(--text-muted)_30%,var(--bg-secondary))] shadow-[0_12px_28px_rgba(50,35,20,0.18)]"
            style={{
              left: `calc(50% + ${Math.round((index - mid) * step)}px)`,
              width: size,
              height: size,
              zIndex: hovered === index ? 20 : index + 1,
              transform: `translate(-50%, -50%) rotate(${TILTS[index] || 0}deg)`,
            }}
            onMouseEnter={() => changeHover(index)}
            onClick={openItem}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openItem()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Open memory"
          >
            {isRealVideo ? (
              <MemoryVideo src={src} poster={item?.poster} className="h-full w-full object-cover" />
            ) : showFallbackVideo ? (
              <MemoryVideo src={item.video} className="h-full w-full object-cover" />
            ) : (
              <SafeImage src={src} fallback={item?.full} alt={`Memory ${index + 1}`} className="h-full w-full object-cover" draggable={false} onFail={() => handleImageError(item, src)} />
            )}
          </div>
          )
        })}
      </div>

      <PostPreviewModal item={opened} onClose={() => setOpened(null)} onViewPost={onPostSelect} />
    </>
  )
}