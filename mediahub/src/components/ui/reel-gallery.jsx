import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeRowImages(images, rowIndex) {
  if (!images.length) return []
  const rotated = images.slice(rowIndex % images.length).concat(images.slice(0, rowIndex % images.length))
  return [...rotated, ...rotated, ...rotated]
}

export default function ReelGallery({
  images = [],
  rows = 4,
  rowHeight = 74,
  rowGap = 15,
  itemGap = 14,
  tilt = 5,
  arch = 34,
  speed = 0.8,
  speedVariance = 0.45,
  alternate = false,
  autoScroll = 18,
  inertia = 0.92,
  damping = 0.12,
  dragSensitivity = 1.6,
  wheelSensitivity = 1,
  radius = 12,
  grayscale = 0.35,
  focusRadius = 190,
  focusStrength = 0.9,
  brightness = 1,
  fade = 0.16,
  dim = 0.28,
  taper = 0.1,
  backgroundColor = 'transparent',
  interactive = true,
  paused = false,
  className = '',
  children,
}) {
  const safeImages = useMemo(() => images.filter(Boolean), [images])
  const [offsets, setOffsets] = useState(() => Array.from({ length: rows }, () => 0))
  const [pointer, setPointer] = useState({ x: -1000, y: -1000 })
  const dragRef = useRef(null)

  useEffect(() => {
    setOffsets((current) => Array.from({ length: rows }, (_, index) => current[index] || 0))
  }, [rows])

  useEffect(() => {
    if (paused || !interactive || !safeImages.length || !autoScroll) return undefined

    let frame
    let last = performance.now()
    const tick = (now) => {
      const delta = Math.min(40, now - last)
      last = now
      setOffsets((current) => current.map((value, index) => {
        const variance = 1 + ((index % 3) - 1) * speedVariance
        const direction = alternate && index % 2 ? -1 : 1
        return value + (autoScroll * speed * variance * direction * delta) / 1000
      }))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [alternate, autoScroll, paused, safeImages.length, speed, speedVariance, interactive])

  if (!safeImages.length) return null

  const handlePointerDown = (event) => {
    if (!interactive) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, lastX: event.clientX }
  }

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setPointer({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })

    if (!dragRef.current || !interactive) return
    const delta = event.clientX - dragRef.current.lastX
    dragRef.current.lastX = event.clientX
    setOffsets((current) => current.map((value, index) => value + delta * dragSensitivity * (alternate && index % 2 ? -1 : 1)))
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleWheel = (event) => {
    if (!interactive) return
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    setOffsets((current) => current.map((value, index) => value - delta * wheelSensitivity * (alternate && index % 2 ? -1 : 1)))
  }

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background: backgroundColor, touchAction: interactive ? 'pan-y' : undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setPointer({ x: -1000, y: -1000 })}
      onWheel={handleWheel}
      role={interactive ? 'application' : undefined}
      aria-label={interactive ? 'Interactive image reel gallery' : undefined}
    >
      <div className="absolute inset-0 flex flex-col justify-center" style={{ gap: rowGap }}>
        {Array.from({ length: rows }, (_, rowIndex) => {
          const rowImages = makeRowImages(safeImages, rowIndex)
          const direction = alternate && rowIndex % 2 ? -1 : 1
          const rowOffset = offsets[rowIndex] || 0
          const archOffset = ((rowIndex - (rows - 1) / 2) / Math.max(1, rows - 1)) * arch

          return (
            <div
              key={rowIndex}
              className="relative flex shrink-0 items-center whitespace-nowrap"
              style={{
                height: rowHeight,
                gap: itemGap,
                transform: `translateX(${rowOffset}px) translateY(${archOffset}px) rotate(${direction * tilt * 0.18}deg)`,
                // The position is updated every animation frame. A CSS transition here
                // makes mobile browsers chase stale frames, which looks like vibration.
                transition: 'none',
              }}
            >
              {rowImages.map((src, imageIndex) => {
                const centerX = pointer.x
                const cardLeft = imageIndex * (rowHeight * 1.45 + itemGap) + rowOffset
                const cardCenter = cardLeft + rowHeight * 0.72
                const distance = Math.abs(centerX - cardCenter)
                const focus = clamp(1 - distance / focusRadius, 0, 1) * focusStrength
                const opacity = 1 - dim * (1 - focus)
                const saturation = grayscale * (1 - focus)

                return (
                  <img
                    key={`${rowIndex}-${imageIndex}-${src}`}
                    src={src}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="block shrink-0 select-none object-cover"
                    style={{
                      width: rowHeight * 1.45,
                      height: rowHeight,
                      borderRadius: radius,
                      opacity,
                      filter: `grayscale(${saturation}) brightness(${brightness})`,
                      transform: `scale(${1 - taper * (1 - focus)})`,
                      transition: 'filter 180ms ease, opacity 180ms ease, transform 180ms ease',
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {fade > 0 && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10"
            style={{ width: `${fade * 100}%`, background: 'linear-gradient(to right, var(--bg-primary, #fff), transparent)' }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10"
            style={{ width: `${fade * 100}%`, background: 'linear-gradient(to left, var(--bg-primary, #fff), transparent)' }}
          />
        </>
      )}

      {children && <div className="relative z-20">{children}</div>}
    </div>
  )
}
