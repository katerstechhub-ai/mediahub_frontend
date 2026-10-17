import { useEffect, useState } from 'react'

// Remembered for the whole session: a photo that loaded once shows instantly next time,
// so coming back to a profile page never flashes empty tiles.
const loadedCache = new Set()

// Resolves true when the image has fully downloaded (false on error or after 7s)
function preload(src) {
  return new Promise((resolve) => {
    if (loadedCache.has(src)) { resolve(true); return }
    const img = new window.Image()
    const timer = setTimeout(() => resolve(false), 7000)
    img.onload = () => { clearTimeout(timer); loadedCache.add(src); resolve(true) }
    img.onerror = () => { clearTimeout(timer); resolve(false) }
    img.src = src
  })
}

// What has to be downloaded before an item can be shown without a blank frame.
// Photos: the photo. Videos: their poster. A video with no real poster is not held back.
function gateSrc(item) {
  if (!item) return null
  if (item.type === 'video') return item.poster && item.poster !== item.src ? item.poster : null
  return item.src || null
}

// items: [{ type, src, poster, ... }]  ->  the same items, but only once their pictures are loaded.
// Items whose picture fails to load are dropped. Results are kept in the original order.
export function useLoadedMedia(items) {
  const key = items.map((item) => `${item.type}|${item.src}`).join('~')
  const initial = () => items.filter((item) => {
    const src = gateSrc(item)
    return !src || loadedCache.has(src)
  })
  const [ready, setReady] = useState(initial)

  useEffect(() => {
    let cancelled = false
    Promise.all(items.map((item) => {
      const src = gateSrc(item)
      return src ? preload(src) : Promise.resolve(true)
    })).then((oks) => {
      if (cancelled) return
      const next = items.filter((_, i) => oks[i])
      // Keep the same array if nothing changed, so galleries do not re-render or re-animate
      setReady((prev) => (
        prev.length === next.length && prev.every((p, i) => p.src === next[i].src) ? prev : next
      ))
    })
    return () => { cancelled = true }
  }, [key])

  return ready
}