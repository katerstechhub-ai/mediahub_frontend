import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

function CardRotate({ children, onSendToBack, sensitivity, disableDrag }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [60, -60])
  const rotateY = useTransform(x, [-100, 100], [-60, 60])

  if (disableDrag) {
    return <motion.div className="absolute inset-0" style={{ x: 0, y: 0 }}>{children}</motion.div>
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) onSendToBack()
        else { x.set(0); y.set(0) }
      }}
    >
      {children}
    </motion.div>
  )
}

export default function Stack({
  randomRotation = true,
  sensitivity = 180,
  cards = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = true,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = true,
  mobileClickOnly = true,
  mobileBreakpoint = 768,
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [stack, setStack] = useState(() => cards.map((content, index) => ({ id: index + 1, content })))

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < mobileBreakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [mobileBreakpoint])

  useEffect(() => {
    setStack(cards.map((content, index) => ({ id: index + 1, content })))
  }, [cards])

  const sendToBack = (id) => {
    setStack((current) => {
      const next = [...current]
      const index = next.findIndex((card) => card.id === id)
      if (index < 0) return current
      const [card] = next.splice(index, 1)
      next.unshift(card)
      return next
    })
  }

  useEffect(() => {
    if (!autoplay || isPaused || stack.length < 2) return undefined
    const timer = setInterval(() => sendToBack(stack[stack.length - 1].id), autoplayDelay)
    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isPaused, stack])

  if (!stack.length) return null
  const disableDrag = mobileClickOnly && isMobile

  return (
    <div
      className="relative h-full w-full [perspective:900px]"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {stack.map((card, index) => {
        const rotation = randomRotation ? ((card.id * 17) % 11) - 5 : 0
        return (
          <CardRotate
            key={card.id}
            sensitivity={sensitivity}
            disableDrag={disableDrag}
            onSendToBack={() => sendToBack(card.id)}
          >
            <motion.div
              className="absolute inset-0 overflow-hidden rounded-[24px] border-[6px] border-white bg-white shadow-[0_16px_35px_rgba(50,35,20,0.22)]"
              onClick={() => (sendToBackOnClick || disableDrag) && sendToBack(card.id)}
              animate={{
                rotateZ: (stack.length - index - 1) * 4 + rotation,
                scale: 1 + index * 0.045 - stack.length * 0.045,
                transformOrigin: '90% 90%',
              }}
              transition={{ type: 'spring', stiffness: animationConfig.stiffness, damping: animationConfig.damping }}
            >
              {card.content}
            </motion.div>
          </CardRotate>
        )
      })}
    </div>
  )
}
