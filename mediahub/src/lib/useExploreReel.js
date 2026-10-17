import { useEffect, useState } from 'react'
import { postsAPI } from '../api'
import { getMediaItems } from '../components/PostMedia'
import { thumb } from './perf'
import { autoPoster, isVideoMedia } from './mediaPoster'

// Resolves true once the image is fully downloaded (false on error or after 7s)
const preloadImage = (src) => new Promise((resolve) => {
  const img = new window.Image()
  const timer = setTimeout(() => resolve(false), 7000)
  img.onload = () => { clearTimeout(timer); resolve(true) }
  img.onerror = () => { clearTimeout(timer); resolve(false) }
  img.src = src
})

// Loads the photos for the Explore reel, using the same media handling as the Feed page:
//  - getMediaItems(post) for photos and videos
//  - a video with no saved thumbnail gets a generated still frame (autoPoster),
//    never the video file itself
//  - each photo is checked in its resized form first, then in its original form,
//    and is only dropped if both fail
export default function useExploreReel(cache) {
  const [reelItems, setReelItems] = useState(cache.reel)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await postsAPI.getAll()
        const d = res.data
        let arr = []
        if (d && d.data && d.data.posts) arr = d.data.posts
        else if (d && d.posts) arr = d.posts
        else if (d && Array.isArray(d.data)) arr = d.data
        else if (Array.isArray(d)) arr = d

        const items = []
        const seen = new Set()
        const addItem = (small, full) => {
          if (!small || seen.has(small)) return
          seen.add(small)
          items.push({ type: 'image', src: small, full, url: small, thumbnail: small })
        }

        for (let i = 0; i < arr.length && items.length < 24; i++) {
          const media = getMediaItems(arr[i]) || []
          for (let j = 0; j < media.length && items.length < 24; j++) {
            const m = media[j]
            if (!m || !m.url) continue
            if (isVideoMedia(m)) {
              const original = m.thumbnail || autoPoster(m.url, 900)
              if (!original) continue // no still frame available for this video
              const small = m.thumbnail ? thumb(m.thumbnail, 600) : autoPoster(m.url, 600)
              addItem(small, original)
            } else {
              addItem(thumb(m.url, 600), m.url)
            }
          }
        }

        const okList = await Promise.all(items.map(async (it) => {
          if (await preloadImage(it.src)) return true
          if (it.full && it.full !== it.src && await preloadImage(it.full)) {
            it.src = it.full
            return true
          }
          return false
        }))
        const loaded = items.filter((_, i) => okList[i])
        if (!cancelled && loaded.length > 0) {
          cache.reel = loaded
          // Keep the current list if nothing changed, so the reel doesn't remount and flash
          setReelItems((prev) => (
            prev.length === loaded.length && prev.every((p, i) => p.src === loaded[i].src) ? prev : loaded
          ))
        }
      } catch (err) {
        console.error('Reel load failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return reelItems
}