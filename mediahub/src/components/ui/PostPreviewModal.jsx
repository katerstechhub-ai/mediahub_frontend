import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { videoSrc } from '../../lib/perf'

// Plays automatically (muted, because browsers block autoplay with sound) and has controls,
// so the viewer can unmute, pause or scrub. Falls back to the original file if the
// smaller Cloudinary copy fails.
function ModalVideo({ src, poster }) {
  const ref = useRef(null)
  const [useOriginal, setUseOriginal] = useState(false)
  const playSrc = useOriginal ? src : videoSrc(src, 960)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }, [playSrc])

  return (
    <video
      key={playSrc}
      ref={ref}
      src={playSrc}
      poster={poster || undefined}
      className="max-h-[78vh] max-w-full bg-black object-contain"
      autoPlay
      muted
      loop
      playsInline
      controls
      preload="auto"
      onError={() => { if (!useOriginal && playSrc !== src) setUseOriginal(true) }}
    />
  )
}

// Full-screen preview of one photo/video with a "View post" button.
// item: { type, src, poster, postId, video, alt }
//   - type 'video': src is the video file, poster its still frame
//   - type 'image' with a `video` field: a video shown as its poster elsewhere; the preview plays `video`
// onViewPost is optional: without it the button goes straight to /posts/:postId.
export default function PostPreviewModal({ item, onClose, onViewPost }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!item) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [item, onClose])

  if (!item || typeof document === 'undefined') return null

  const videoUrl = item.type === 'video' ? item.src : item.video
  const posterUrl = item.type === 'video' ? item.poster : item.src

  const viewPost = () => {
    onClose()
    if (onViewPost) onViewPost(item)
    else navigate(`/posts/${item.postId}`)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-black/85 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-xl text-white" aria-label="Close preview">×</button>
      <div className="flex min-h-0 flex-1 items-center justify-center pb-24" onClick={(event) => event.stopPropagation()}>
        <div className="relative max-h-full max-w-[min(88vw,720px)] overflow-hidden rounded-[26px] border-4 border-white bg-black shadow-2xl">
          {videoUrl ? (
            <ModalVideo src={videoUrl} poster={posterUrl} />
          ) : (
            <img src={item.src} alt={item.alt || 'Memory'} className="max-h-[78vh] max-w-full object-contain" />
          )}
        </div>
      </div>
      {item.postId && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[calc(env(safe-area-inset-bottom,0px)+24px)]" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={viewPost}
            className="rounded-full bg-amber-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-500/30"
          >
            View post
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}