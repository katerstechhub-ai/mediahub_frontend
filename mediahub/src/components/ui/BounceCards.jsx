import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import MemoryVideo from './MemoryVideo'
import PostPreviewModal from './PostPreviewModal'

// Tilt of each of the five cards (left to right)
const TILTS = [6, 2, -4, 6, -6]

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
}) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(() => new Set())
  const [opened, setOpened] = useState(null)
  const [hovered, setHovered] = useState(-1)
  const [width, setWidth] = useState(containerWidth)

  // The row is sized from the real width, so all five cards fit on a phone
  // instead of the outer ones sliding off-screen and the rest piling up in the middle.
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || containerWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerWidth])

  useEffect(() => {
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
  }, [animationDelay, animationStagger, easeType, images.length])

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

  const visibleItems = images.filter((item) => {
    const src = typeof item === 'string' ? item : item?.src
    return src && !failed.has(src)
  }).slice(0, 5)

  const removeFailed = (src) => {
    setFailed((current) => new Set([...current, src]))
  }

  if (!visibleItems.length) return null

  // Card size and spacing come from the row width: the five cards always span the row,
  // each one overlaps its neighbour by about a third, so every card has a clear strip to tap.
  const count = visibleItems.length
  const size = Math.round(Math.min(174, Math.max(96, width * 0.36)))
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
          const isVideo = typeof item !== 'string' && item?.type === 'video'
          const openItem = () => setOpened(typeof item === 'string' ? { type: 'image', src: item } : item)
          return (
          <div
            key={`${src}-${index}`}
            className="profile-bounce-card absolute top-1/2 cursor-pointer overflow-hidden rounded-[22px] border-[5px] border-white bg-white shadow-[0_12px_28px_rgba(50,35,20,0.18)]"
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
            {isVideo ? (
              <MemoryVideo src={src} poster={item?.poster} onError={() => removeFailed(src)} className="h-full w-full object-cover" />
            ) : (
              <img src={src} alt={`Memory ${index + 1}`} className="h-full w-full object-cover" draggable={false} onError={() => removeFailed(src)} />
            )}
          </div>
          )
        })}
      </div>

      <PostPreviewModal item={opened} onClose={() => setOpened(null)} onViewPost={onPostSelect} />
    </>
  )
}