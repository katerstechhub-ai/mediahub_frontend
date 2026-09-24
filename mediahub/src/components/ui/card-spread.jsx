import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function CardSpread({
  cards = [],
  cardWidth = 168,
  cardHeight = 252,
  cardRadius = 12,
  radius = 440,
  arc = 88,
  cardColor = '#ffffff',
  cardPadding = 0,
  borderColor = 'transparent',
  shadow = 0.28,
  lift = 26,
  push = 3.6,
  pushReach = 3,
  restOpacity = 1,
  stiffness = 150,
  damping = 16,
  mass = 1,
  stagger = 0.06,
  fit = true,
  maxScale = 1,
  interactive = true,
  className = '',
  style,
}) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const safeCards = useMemo(() => cards.filter((card) => card?.src), [cards])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  if (!safeCards.length) return null

  const count = safeCards.length
  const centerIndex = (count - 1) / 2
  const angleStep = count > 1 ? arc / (count - 1) : 0
  // Keep the deck comfortably inside narrow phone screens.
  const responsiveScale = fit
    ? Math.min(maxScale, isMobile ? 0.66 : 1)
    : 1

  const clearActive = () => {
    if (interactive) setActiveIndex(null)
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={style}
      onMouseLeave={clearActive}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) clearActive()
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `scale(${responsiveScale})`,
          transformOrigin: 'center center',
        }}
      >
        {safeCards.map((card, index) => {
          const baseAngle = (index - centerIndex) * angleStep
          const distance = activeIndex == null ? 0 : index - activeIndex
          const isActive = activeIndex === index
          const isNearActive = activeIndex != null && Math.abs(distance) <= pushReach
          const neighbourAngle = isNearActive && !isActive ? Math.sign(distance) * push : 0
          const angle = baseAngle + neighbourAngle
          const outwardLift = isActive ? lift : 0
          const zIndex = isActive ? count + 10 : index + 1
          const restScale = activeIndex == null ? 1 : isActive ? 1.04 : 0.98
          const restCardOpacity = activeIndex == null || isActive ? 1 : restOpacity

          return (
            <motion.button
              key={card.id || card.src || index}
              type="button"
              aria-label={card.alt || `View image ${index + 1}`}
              tabIndex={interactive ? 0 : -1}
              disabled={!interactive}
              className="absolute left-1/2 top-1/2 block overflow-hidden text-left outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70"
              style={{
                width: cardWidth,
                height: cardHeight,
                zIndex,
                padding: cardPadding,
                borderRadius: cardRadius,
                background: cardColor,
                border: `1px solid ${borderColor}`,
                boxShadow: shadow > 0 ? `0 ${10 + shadow * 16}px ${18 + shadow * 22}px rgba(20, 15, 10, ${shadow})` : 'none',
                transformOrigin: `50% ${radius}px`,
              }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{
                opacity: restCardOpacity,
                scale: restScale,
                x: '-50%',
                y: `calc(-50% - ${outwardLift}px)`,
                rotate: angle,
              }}
              transition={{
                type: 'spring',
                stiffness,
                damping,
                mass,
                delay: index * stagger,
              }}
              onMouseEnter={() => interactive && setActiveIndex(index)}
              onFocus={() => interactive && setActiveIndex(index)}
            >
              <img
                src={card.src}
                alt={card.alt || ''}
                draggable={false}
                className="h-full w-full select-none object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
