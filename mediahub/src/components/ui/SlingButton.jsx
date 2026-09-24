import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FiArrowUp } from 'react-icons/fi'

export default function SlingButton({ onSend, disabled = false, loading = false, ariaLabel = 'Post', className = '' }) {
  const start = useRef(null)
  const [pull, setPull] = useState({ x: 0, y: 0 })

  const finish = (event) => {
    if (!start.current) return
    const dx = event.clientX - start.current.x
    const dy = event.clientY - start.current.y
    const distance = Math.hypot(dx, dy)
    start.current = null
    setPull({ x: 0, y: 0 })
    if (!disabled && !loading && (distance < 14 || distance > 28)) onSend?.()
  }

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled || loading}
      className={`relative flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ touchAction: 'none', background: '#f5f5f5', color: '#18181b', boxShadow: '0 0 0 5px rgba(255,198,41,0.2), 0 10px 24px rgba(0,0,0,0.24)' }}
      onPointerDown={(event) => {
        if (disabled || loading) return
        start.current = { x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const dx = event.clientX - start.current.x
        const dy = event.clientY - start.current.y
        const factor = Math.min(1, 64 / Math.max(64, Math.hypot(dx, dy)))
        setPull({ x: dx * factor, y: dy * factor })
      }}
      onPointerUp={finish}
      onPointerCancel={() => { start.current = null; setPull({ x: 0, y: 0 }) }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSend?.()
        }
      }}
    >
      <span className="pointer-events-none absolute inset-[-7px] rounded-full border-2 border-dashed border-white/30" />
      <motion.span animate={{ x: pull.x, y: pull.y, rotate: pull.x / 5 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-400">
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <FiArrowUp size={20} strokeWidth={2.8} />}
      </motion.span>
    </motion.button>
  )
}
