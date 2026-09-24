import { useMemo, useState } from 'react'
import MemoryVideo from './MemoryVideo'

export default function DomeGallery({ images = [], onSelect, grayscale = false }) {
  const [opened, setOpened] = useState(null)
  const [failed, setFailed] = useState(() => new Set())
  const items = useMemo(() => images.filter((item) => item?.src && !failed.has(item.src)), [images, failed])

  const removeFailed = (src) => {
    setFailed((current) => {
      const next = new Set(current)
      next.add(src)
      return next
    })
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
                onClick={() => {
                  setOpened(item)
                  onSelect?.(item)
                }}
                className="group relative aspect-square overflow-hidden rounded-[18px] border-2 border-white/80 bg-white shadow-[0_10px_22px_rgba(50,35,20,0.16)] transition duration-300 hover:z-10 hover:scale-105 hover:!rotate-0"
                style={{ transform: `translateY(${lift}px) rotate(${tilt}deg)` }}
                aria-label={item.alt || 'Open memory'}
              >
                {item.type === 'video' ? (
                  <MemoryVideo src={item.src} poster={item.poster} onError={() => removeFailed(item.src)} className={`h-full w-full object-cover ${grayscale ? 'grayscale' : ''}`} />
                ) : (
                  <img src={item.src} alt={item.alt || 'Memory'} loading="lazy" className={`h-full w-full object-cover ${grayscale ? 'grayscale' : ''}`} draggable={false} onError={() => removeFailed(item.src)} />
                )}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition group-hover:opacity-100" />
              </button>
            )
          })}
        </div>
      </div>

      {opened && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md" onClick={() => setOpened(null)} role="dialog" aria-modal="true">
          <div className="relative max-h-[86vh] max-w-[min(88vw,720px)] overflow-hidden rounded-[26px] border-4 border-white bg-black shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {opened.type === 'video' ? (
              <MemoryVideo src={opened.src} poster={opened.poster} className="max-h-[82vh] max-w-full object-contain" />
            ) : (
              <img src={opened.src} alt={opened.alt || 'Memory'} className="max-h-[82vh] max-w-full object-contain" />
            )}
            <button type="button" onClick={() => setOpened(null)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-xl text-white" aria-label="Close image">×</button>
          </div>
        </div>
      )}
    </>
  )
}
