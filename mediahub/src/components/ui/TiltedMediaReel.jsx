import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Tiles per row. Rows are wider than the screen on purpose: the container clips the
// edges, so the wall always looks full on phones and desktops alike.
const PER_ROW = 8
// One random tile swaps its photo every SWAP_MS, so the wall changes gradually
// instead of everything flipping at once.
const SWAP_MS = 1100

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/*
  items: [{ src, postId }]  -> ONE entry per post (the page builds this list).
  A post never appears twice on screen: swaps only pick posts that are not
  currently showing. If there are no spare posts, two tiles trade places instead.
*/
function ReelTile({ item, tilt, onItemClick }) {
  const clickable = typeof onItemClick === 'function' && item?.postId

  return (
    <motion.div
      className={`relative mx-1 h-[76px] w-[108px] shrink-0 overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_8px_16px_rgba(50,35,20,0.16)] sm:mx-1.5 sm:h-[108px] sm:w-[154px] ${clickable ? 'cursor-pointer' : ''}`}
      initial={false}
      animate={{ rotate: tilt }}
      whileHover={{ rotate: 0, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={clickable ? () => onItemClick(item) : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? 'Open post' : undefined}
    >
      {/* Same idea as the feed grid: the new photo arrives tilted from behind,
          like the stacked card peeking out, and the old one tips away. */}
      <AnimatePresence initial={false}>
        <motion.img
          key={item.postId || item.src}
          src={item.src}
          alt="Memory"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, rotate: 16, scale: 0.91, x: '4.5%', y: '-3.5%' }}
          animate={{ opacity: 1, rotate: 0, scale: 1, x: '0%', y: '0%' }}
          exit={{ opacity: 0, rotate: -10, scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, opacity: { duration: 0.35 } }}
        />
      </AnimatePresence>
    </motion.div>
  )
}

function TiltedMediaReel({ items = [], rows = 3, tilt = 4, className = '', onItemClick }) {
  // One entry per post, in case the caller sends duplicates
  const pool = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const item of items) {
      const src = typeof item === 'string' ? item : item?.src
      if (!src) continue
      const entry = typeof item === 'string' ? { src, postId: src } : { ...item, postId: item.postId || src }
      if (seen.has(entry.postId)) continue
      seen.add(entry.postId)
      out.push(entry)
    }
    return out
  }, [items])

  const poolKey = pool.map((p) => p.postId).join('|')
  const slotCount = Math.min(pool.length, rows * PER_ROW)

  const [shown, setShown] = useState(() => pool.slice(0, slotCount))
  const poolRef = useRef(pool)
  poolRef.current = pool

  // New pool (e.g. more posts loaded): refill the slots, keeping photos that are still valid
  useEffect(() => {
    setShown((prev) => {
      const valid = new Set(pool.map((p) => p.postId))
      const kept = prev.filter((p) => valid.has(p.postId)).slice(0, slotCount)
      const used = new Set(kept.map((p) => p.postId))
      const fill = pool.filter((p) => !used.has(p.postId)).slice(0, slotCount - kept.length)
      return [...kept, ...fill]
    })
  }, [poolKey, slotCount])

  // Swap one random tile at a time
  useEffect(() => {
    if (slotCount < 2 || prefersReducedMotion()) return undefined
    const timer = setInterval(() => {
      setShown((prev) => {
        if (prev.length < 2) return prev
        const slot = Math.floor(Math.random() * prev.length)
        const used = new Set(prev.map((p) => p.postId))
        const spare = poolRef.current.filter((p) => !used.has(p.postId))
        const next = [...prev]
        if (spare.length) {
          next[slot] = spare[Math.floor(Math.random() * spare.length)]
        } else {
          const other = (slot + 1 + Math.floor(Math.random() * (prev.length - 1))) % prev.length
          ;[next[slot], next[other]] = [next[other], next[slot]]
        }
        return next
      })
    }, SWAP_MS)
    return () => clearInterval(timer)
  }, [slotCount])

  if (!pool.length) return null

  const rowSlots = Array.from({ length: rows }, (_, row) => (
    shown.map((item, slot) => ({ item, slot })).filter(({ slot }) => slot % rows === row)
  ))

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div className="space-y-1.5 py-1 sm:space-y-2 sm:py-2">
        {rowSlots.map((row, rowIndex) => {
          if (!row.length) return null
          return (
            <div key={rowIndex} className="flex justify-center overflow-hidden" style={{ marginLeft: rowIndex % 2 ? 40 : -40 }}>
              <div className="flex w-max">
                {row.map(({ item, slot }, index) => {
                  const cardTilt = ((index + rowIndex) % 2 ? 1 : -1) * tilt
                  return <ReelTile key={slot} item={item} tilt={cardTilt} onItemClick={onItemClick} />
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { TiltedMediaReel }
export default TiltedMediaReel