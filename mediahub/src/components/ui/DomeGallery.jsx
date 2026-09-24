import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import MemoryVideo from './MemoryVideo'

export default function DomeGallery({ images = [], onPostSelect, grayscale = false }) {
  const [opened, setOpened] = useState(null)
  const [failed, setFailed] = useState(() => new Set())
  const items = useMemo(() => images.filter((item) => item?.src && !failed.has(item.src)), [images, failed])

  useEffect(() => {
    if (!opened) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [opened])

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

      {opened && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-black/85 p-4 backdrop-blur-md sm:p-6" onClick={() => setOpened(null)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setOpened(null)} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-xl text-white" aria-label="Close image">×</button>
          <div className="flex min-h-0 flex-1 items-center justify-center pb-16" onClick={(event) => event.stopPropagation()}>
            <div className="relative max-h-full max-w-[min(88vw,720px)] overflow-hidden rounded-[26px] border-4 border-white bg-black shadow-2xl">
            {opened.type === 'video' ? (
              <MemoryVideo src={opened.src} poster={opened.poster} className="max-h-[82vh] max-w-full object-contain" />
            ) : (
              <img src={opened.src} alt={opened.alt || 'Memory'} className="max-h-[82vh] max-w-full object-contain" />
            )}
            </div>
          </div>
          {opened.postId && onPostSelect && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
              <button
                type="button"
                onClick={() => { onPostSelect(opened); setOpened(null) }}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-lg"
              >
                View post
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
