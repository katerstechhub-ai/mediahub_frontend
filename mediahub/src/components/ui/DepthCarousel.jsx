import { useEffect, useMemo, useRef, useState } from 'react'
import './DepthCarousel.css'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export default function DepthCarousel({
  items = [],
  cardWidth = 300,
  cardHeight = 380,
  radius = 18,
  depth = 220,
  spread = 90,
  tilt = 22,
  tiltDirection = 'right',
  visibleCards = 4,
  autoplay = false,
  autoplayDelay = 3200,
  loop = true,
  showControls = true,
  fill = false,
  contain = false,
  showIndicators = true,
  className = '',
}) {
  const data = useMemo(() => items.filter(Boolean), [items])
  const [active, setActive] = useState(0)
  const touchStartX = useRef(null)
  const direction = tiltDirection === 'left' ? -1 : 1

  useEffect(() => {
    if (!autoplay || data.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActive((current) => loop ? (current + 1) % data.length : Math.min(current + 1, data.length - 1))
    }, autoplayDelay)
    return () => window.clearInterval(timer)
  }, [autoplay, autoplayDelay, data.length, loop])

  useEffect(() => {
    if (active >= data.length) setActive(Math.max(0, data.length - 1))
  }, [active, data.length])

  const move = (step) => {
    if (!data.length) return
    setActive((current) => {
      const next = current + step
      if (loop) return (next + data.length) % data.length
      return clamp(next, 0, data.length - 1)
    })
  }

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event) => {
    if (touchStartX.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 36 || data.length < 2) return
    event.preventDefault()
    event.stopPropagation()
    move(delta < 0 ? 1 : -1)
  }

  if (!data.length) return null

  return (
    <div
      className={`depth-carousel ${fill ? 'depth-carousel--fill' : ''} ${contain ? 'depth-carousel--contain' : ''} ${className}`}
      style={{ '--depth-card-width': `${cardWidth}px`, '--depth-card-height': `${cardHeight}px`, '--depth-radius': `${radius}px`, '--depth-distance': `${depth}px`, '--depth-spread': `${spread}px`, '--depth-tilt': `${tilt}deg` }}
      aria-label="Memory carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="depth-carousel__stage">
        {data.map((item, index) => {
          let distance = index - active
          if (loop && data.length > 1) {
            distance = ((distance % data.length) + data.length) % data.length
            if (distance > data.length / 2) distance -= data.length
          }
          const absDistance = Math.abs(distance)
          const isVisible = absDistance <= visibleCards
          const isVideo = item.type === 'video' || item.resourceType === 'video' || /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.src || item.url || '')
          const src = item.src || item.image || item.url
          const poster = item.poster || item.thumbnail
          const side = direction * distance
          const scale = fill ? Math.max(0.78, 1 - absDistance * 0.045) : Math.max(0.7, 1 - absDistance * 0.08)
          const opacity = isVisible ? Math.max(0, 1 - absDistance * 0.18) : 0
          const lateral = fill ? 22 : spread
          const transform = `translate(-50%, -50%) translateX(${side * lateral}px) translateZ(${-absDistance * depth}px) rotateY(${direction * Math.min(distance, 1) * tilt}deg) scale(${distance === 0 ? 1 : scale})`
          const cardWidthValue = fill ? (distance === 0 ? '100%' : '86%') : 'min(var(--depth-card-width), 86%)'
          const cardHeightValue = fill ? (distance === 0 ? '100%' : '88%') : 'min(var(--depth-card-height), 88%)'

          return (
            <div
              key={`${src || 'memory'}-${index}`}
              className={`depth-carousel__card ${distance === 0 ? 'is-active' : ''}`}
              style={{ width: cardWidthValue, height: cardHeightValue, borderRadius: 'var(--depth-radius)', opacity, zIndex: 100 - absDistance, transform, pointerEvents: isVisible ? 'auto' : 'none' }}
              onClick={(event) => { if (distance !== 0) { event.stopPropagation(); setActive(index) } }}
            >
              {isVideo ? (
                <video src={src} poster={poster || undefined} className="depth-carousel__media" muted playsInline autoPlay={distance === 0} loop preload={distance === 0 ? 'auto' : 'metadata'} />
              ) : (
                <img src={src} alt={item.alt || 'Memory'} className="depth-carousel__media" draggable={false} />
              )}
              <span className="depth-carousel__shade" />
            </div>
          )
        })}
      </div>

      {showControls && data.length > 1 && (
        <div className="depth-carousel__controls">
          <button type="button" onClick={(event) => { event.stopPropagation(); move(-1) }} aria-label="Previous memory">‹</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); move(1) }} aria-label="Next memory">›</button>
        </div>
      )}

      {fill && showIndicators && data.length > 1 && (
        <div className="depth-carousel__indicators" aria-hidden="true">
          {data.slice(0, 7).map((_, index) => (
            <span key={index} className={index === active ? 'is-active' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}
