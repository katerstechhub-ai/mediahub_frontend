import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import MemoryVideo from './MemoryVideo'

const DEFAULT_TRANSFORMS = [
  'rotate(6deg) translate(-150px)',
  'rotate(2deg) translate(-75px)',
  'rotate(-4deg)',
  'rotate(6deg) translate(75px)',
  'rotate(-6deg) translate(150px)',
]

export default function BounceCards({
  className = '',
  images = [],
  containerWidth = 520,
  containerHeight = 230,
  animationDelay = 0.25,
  animationStagger = 0.08,
  easeType = 'elastic.out(1, 0.65)',
  transformStyles = DEFAULT_TRANSFORMS,
  enableHover = true,
}) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(() => new Set())

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
    if (!enableHover || !containerRef.current) return
    const cards = containerRef.current.querySelectorAll('.profile-bounce-card')
    cards.forEach((card, index) => {
      gsap.to(card, {
        x: index === hoveredIndex ? 0 : index < hoveredIndex ? -12 : 12,
        rotate: index === hoveredIndex ? 0 : undefined,
        duration: 0.35,
        ease: 'back.out(1.4)',
        overwrite: 'auto',
      })
    })
  }

  const resetHover = () => {
    if (!enableHover || !containerRef.current) return
    containerRef.current.querySelectorAll('.profile-bounce-card').forEach((card) => {
      gsap.to(card, { x: 0, duration: 0.35, ease: 'back.out(1.4)', overwrite: 'auto' })
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

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto ${className}`}
      style={{ width: '100%', maxWidth: containerWidth, height: containerHeight }}
      onMouseLeave={resetHover}
    >
      {visibleItems.map((item, index) => {
        const src = typeof item === 'string' ? item : item?.src
        const isVideo = typeof item !== 'string' && item?.type === 'video'
        return (
        <div
          key={`${src}-${index}`}
          className="profile-bounce-card absolute left-1/2 top-1/2 h-[150px] w-[150px] overflow-hidden rounded-[22px] border-[5px] border-white bg-white shadow-[0_12px_28px_rgba(50,35,20,0.18)] sm:h-[174px] sm:w-[174px]"
          style={{ transform: `translate(-50%, -50%) ${transformStyles[index] || 'none'}` }}
          onMouseEnter={() => changeHover(index)}
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
  )
}
