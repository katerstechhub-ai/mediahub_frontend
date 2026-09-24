import { useEffect, useRef, useState } from 'react'

export default function MemoryVideo({ src, poster, className = '', onError }) {
  const videoRef = useRef(null)
  const wrapperRef = useRef(null)
  const frameRef = useRef(null)
  const lastTimeRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return undefined
    if (!inView) {
      video.pause()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      lastTimeRef.current = null
      return undefined
    }

    let cancelled = false
    const reverse = (timestamp) => {
      if (cancelled || !videoRef.current) return
      if (lastTimeRef.current == null) lastTimeRef.current = timestamp
      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp
      const next = video.currentTime - delta
      if (next <= 0) {
        video.currentTime = 0
        lastTimeRef.current = null
        video.play().catch(() => {})
      } else {
        video.currentTime = next
        frameRef.current = requestAnimationFrame(reverse)
      }
    }

    const ended = () => {
      lastTimeRef.current = null
      frameRef.current = requestAnimationFrame(reverse)
    }

    video.addEventListener('ended', ended)
    video.currentTime = 0
    video.play().catch(() => {})
    return () => {
      cancelled = true
      video.removeEventListener('ended', ended)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [src, inView])

  if (failed && poster) {
    return <img src={poster} alt="Memory" className={className || 'h-full w-full object-cover'} />
  }

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted
        playsInline
        preload={inView ? 'auto' : 'metadata'}
        className={className || 'h-full w-full object-cover'}
        onError={(event) => {
          setFailed(true)
          onError?.(event)
        }}
      />
    </div>
  )
}
