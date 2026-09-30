import { useEffect, useMemo, useRef, useState } from 'react'
import './DollyGallery.css'

const wrap = (value, length) => ((value % length) + length) % length

export default function DollyGallery({
  images = [],
  itemWidth = 340,
  aspectRatio = 0.8,
  borderRadius = 24,
  perspective = 1000,
  spacing = 520,
  spread = 0.46,
  revealRange = 2,
  passRange = 1,
  grayscale = 0,
  autoScroll = 0,
  backgroundColor = 'transparent',
  className = '',
  children,
}) {
  const items = useMemo(() => images.filter(Boolean), [images])
  const [position, setPosition] = useState(0)
  const [hovered, setHovered] = useState(false)
  const startRef = useRef(null)
  const lastWheelRef = useRef(0)

  useEffect(() => {
    if (items.length < 2) return undefined
    const onWheel = (event) => {
      if (!hovered) return
      const now = Date.now()
      if (now - lastWheelRef.current < 110) return
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (Math.abs(delta) < 4) return
      event.preventDefault()
      lastWheelRef.current = now
      setPosition((current) => current + (delta > 0 ? 1 : -1))
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [hovered, items.length])

  useEffect(() => {
    if (!autoScroll || items.length < 2) return undefined
    const timer = window.setInterval(() => {
      setPosition((current) => current + 1)
    }, Math.max(1200, autoScroll))
    return () => window.clearInterval(timer)
  }, [autoScroll, items.length])

  const onPointerDown = (event) => {
    startRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerUp = (event) => {
    if (!startRef.current) return
    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y
    startRef.current = null
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return
    setPosition((current) => current + (Math.abs(dx) > Math.abs(dy) && dx < 0 || Math.abs(dy) >= Math.abs(dx) && dy < 0 ? 1 : -1))
  }

  if (!items.length) return null

  return (
    <section
      className={`dolly-gallery ${className}`}
      style={{ '--dolly-perspective': `${perspective}px`, '--dolly-width': `${itemWidth}px`, '--dolly-ratio': aspectRatio, '--dolly-radius': `${borderRadius}px`, backgroundColor }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { startRef.current = null }}
      aria-label="Memory gallery"
    >
      <div className="dolly-gallery__stage">
        {items.map((item, index) => {
          const distance = index - position
          const normalized = wrap(distance + Math.floor(items.length / 2), items.length) - Math.floor(items.length / 2)
          const abs = Math.abs(normalized)
          const visible = abs <= Math.max(revealRange, passRange)
          const isBehind = normalized > 0
          const x = normalized * spread * itemWidth
          const z = -normalized * spacing
          const scale = normalized === 0 ? 1 : Math.max(0.72, 1 - abs * 0.08)
          const opacity = normalized < -passRange ? 0 : normalized > revealRange ? 0 : Math.max(0, 1 - abs * 0.34)
          const rotate = normalized === 0 ? 0 : normalized % 2 === 0 ? -2.5 : 2.5
          const source = typeof item === 'string' ? item : item.src || item.image
          const alt = typeof item === 'string' ? 'Memory' : item.alt || 'Memory'

          return (
            <figure
              key={`${source}-${index}`}
              className={`dolly-gallery__card ${normalized === 0 ? 'is-focused' : ''}`}
              style={{
                width: `min(${itemWidth}px, 78vw)`,
                aspectRatio,
                opacity: visible ? opacity : 0,
                zIndex: 100 - abs,
                transform: `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) scale(${scale}) rotate(${rotate}deg)`,
                pointerEvents: normalized === 0 ? 'auto' : 'none',
              }}
            >
              <img src={source} alt={alt} draggable={false} style={{ filter: `grayscale(${grayscale})` }} />
              {isBehind && <span className="dolly-gallery__depth-shade" />}
            </figure>
          )
        })}
      </div>
      <div className="dolly-gallery__caption">
        <span>Scroll through the memories</span>
        <span className="dolly-gallery__count">{wrap(Math.round(position), items.length) + 1} / {items.length}</span>
      </div>
      {children}
    </section>
  )
}
