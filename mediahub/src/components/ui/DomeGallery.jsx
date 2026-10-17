import { useMemo, useState } from 'react'
import MemoryVideo from './MemoryVideo'
import SafeImage from './SafeImage'
import PostPreviewModal from './PostPreviewModal'

export default function DomeGallery({ images = [], onPostSelect, grayscale = false, onItemFail }) {
  const [opened, setOpened] = useState(null)
  const [failed, setFailed] = useState(() => new Set())
  // Posters that failed but have a real video: shown as a video instead of being removed
  const [posterFailed, setPosterFailed] = useState(() => new Set())
  const items = useMemo(() => images.filter((item) => item?.src && !failed.has(item.src)), [images, failed])

  const removeFailed = (src) => {
    setFailed((current) => {
      const next = new Set(current)
      next.add(src)
      return next
    })
    if (onItemFail) onItemFail(src)
  }

  const handleImageError = (item) => {
    if (item.video && !posterFailed.has(item.src)) {
      setPosterFailed((current) => new Set([...current, item.src]))
    }
  }

  if (!items.length) return null

  return (
    <>
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] px-2 py-8 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[var(--bg-primary)] to-transparent" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 [perspective:1000px]">
          {items.map((item, index) => {
            const tilt = ((index % 5) - 2) * 2.2
            const lift = index % 2 ? 12 : 0
            return (
              <button
                key={`${item.src}-${index}`}
                type="button"
                onClick={() => setOpened(item)}
                className="group relative aspect-square overflow-hidden rounded-[18px] border-2 border-white/80 bg-[color-mix(in_srgb,var(--text-muted)_30%,var(--bg-secondary))] shadow-[0_10px_22px_rgba(50,35,20,0.16)] transition duration-300 hover:z-10 hover:scale-105 hover:!rotate-0"
                style={{ transform: `translateY(${lift}px) rotate(${tilt}deg)` }}
                aria-label={item.alt || 'Open memory'}
              >
                {item.video && posterFailed.has(item.src) ? (
                  <MemoryVideo src={item.video} className={`h-full w-full object-cover ${grayscale ? 'grayscale' : ''}`} />
                ) : item.type === 'video' ? (
                  <MemoryVideo src={item.src} poster={item.poster} className={`h-full w-full object-cover ${grayscale ? 'grayscale' : ''}`} />
                ) : (
                  <SafeImage src={item.src} fallback={item.full} alt={item.alt || 'Memory'} loading="lazy" className={`h-full w-full object-cover ${grayscale ? 'grayscale' : ''}`} draggable={false} onFail={() => handleImageError(item)} />
                )}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition group-hover:opacity-100" />
              </button>
            )
          })}
        </div>
      </div>

      <PostPreviewModal item={opened} onClose={() => setOpened(null)} onViewPost={onPostSelect} />
    </>
  )
}