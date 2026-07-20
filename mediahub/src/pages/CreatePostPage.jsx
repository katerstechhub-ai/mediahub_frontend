import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiZap, FiImage, FiCheck, FiArrowLeft,
  FiPlay, FiRotateCw, FiCamera,
} from 'react-icons/fi'
import { postsAPI, uploadAPI, uploadMediaDirect } from '../api'
import toast from 'react-hot-toast'

const MAX_MEDIA = 5
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const SIGNATURE_TTL = 8 * 60 * 1000
const LONG_PRESS_MS = 350
const MAX_RECORD_MS = 60000

let idSeq = 0
const nextId = () => `media_${Date.now()}_${idSeq++}`

/* ─────────────────────────── helpers ─────────────────────────── */

function compressImage(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file)
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) return resolve(file)
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', JPEG_QUALITY)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Grabs a thumbnail frame from a video file/blob.
//
// IMPORTANT: this used to seek to a duration-derived timestamp and wait for
// `seeked`. That works fine for a normal uploaded video file, but blobs
// coming straight out of MediaRecorder often report an unreliable or
// Infinity duration until the browser has fully indexed the file — seeking
// against that can just hang and never fire `seeked`. The longer the
// recording, the more likely this was to time out, which is exactly why
// short clips got a preview and long ones silently didn't.
//
// Fix: don't seek at all. Just play the video briefly and grab whatever
// frame is on screen, then stop. This works regardless of whether duration
// or seeking is reliable.
function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      video.pause()
      video.removeAttribute('src')
      video.load()
      resolve(result)
    }

    const timeout = setTimeout(() => finish(null), 8000)

    const grabFrame = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || MAX_DIMENSION
        canvas.height = video.videoHeight || MAX_DIMENSION
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) return finish(null)
          const reader = new FileReader()
          reader.onloadend = () => finish(reader.result)
          reader.onerror = () => finish(null)
          reader.readAsDataURL(blob)
        }, 'image/jpeg', 0.8)
      } catch {
        finish(null)
      }
    }

    video.addEventListener('loadeddata', () => {
      video.play()
        .then(() => { setTimeout(() => { video.pause(); grabFrame() }, 150) })
        .catch(() => grabFrame()) // autoplay blocked — the loaded frame is still paintable
    }, { once: true })

    video.onerror = () => finish(null)
  })
}

/* ─────────────────────────── component ─────────────────────────── */

export default function CreatePostPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const abortControllerRef = useRef(null)
  const signatureRef = useRef(null)

  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const longPressTimerRef = useRef(null)
  const recordDurationTimerRef = useRef(null)
  const isHoldingRef = useRef(false)
  const videoFlashWarnedRef = useRef(false)

  const [screen, setScreen] = useState('capture')
  const [mediaItems, setMediaItems] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [facing, setFacing] = useState('environment')
  const [flashOn, setFlashOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [flashPulse, setFlashPulse] = useState(false)
  const [shutterClick, setShutterClick] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('uploading')
  const [errors, setErrors] = useState({})

  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)

  const remainingSlots = MAX_MEDIA - mediaItems.length
  const anyCompressing = mediaItems.some((i) => i.compressing)
  const activeItem = useMemo(
    () => mediaItems.find((i) => i.id === activeId) || mediaItems[0] || null,
    [mediaItems, activeId]
  )

  // Hide the app's persistent bottom nav while this full-screen composer is
  // mounted. This page renders as a `fixed inset-0` overlay, but the bottom
  // nav lives elsewhere in the tree as its own fixed-position component, so
  // z-index on this page alone doesn't guarantee it's covered. Injecting the
  // rule directly here targets common bottom-nav markup conventions so this
  // works without editing another file. If your nav still shows through,
  // add its real class/id to the selector list below.
  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-composer-nav-hide', 'true')
    style.textContent = `
      body.composer-open nav,
      body.composer-open [class*="bottom-nav" i],
      body.composer-open [class*="bottomnav" i],
      body.composer-open [class*="tab-bar" i],
      body.composer-open [class*="tabbar" i],
      body.composer-open [id*="bottom-nav" i],
      body.composer-open [data-bottom-nav] {
        display: none !important;
      }
    `
    document.head.appendChild(style)
    document.body.classList.add('composer-open')
    return () => {
      document.body.classList.remove('composer-open')
      style.remove()
    }
  }, [])

  const getCachedSignature = useCallback(() => {
    const now = Date.now()
    if (signatureRef.current && now - signatureRef.current.timestamp < SIGNATURE_TTL) {
      return signatureRef.current.promise
    }
    const promise = uploadAPI.getSignature().then((res) => res.data.data)
    signatureRef.current = { promise, timestamp: now }
    promise.catch(() => { if (signatureRef.current?.promise === promise) signatureRef.current = null })
    return promise
  }, [])

  /* camera */
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing }, audio: true,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing }, audio: false,
          })
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraReady(true); setCameraError(false)

        // Torch (hardware flashlight) support check. This is a real hardware
        // capability, not a bug we can work around: iOS (Safari, and every
        // other iOS browser, since they all run on WKWebView) never exposes
        // `torch` in getCapabilities() at all. Only Chromium-based browsers
        // on Android generally support it. That's why flash falls back to a
        // screen flash below whenever this comes back false.
        const track = stream.getVideoTracks()[0]
        const supportsTorch = !!track?.getCapabilities?.().torch
        setTorchSupported(supportsTorch)
        if (supportsTorch && flashOn) {
          track.applyConstraints({ advanced: [{ torch: true }] }).catch((err) => {
            console.error('Torch re-apply failed after camera restart', err)
          })
        }
      } catch {
        setCameraError(true)
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing])

  useEffect(() => () => {
    abortControllerRef.current?.abort()
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (recordDurationTimerRef.current) clearInterval(recordDurationTimerRef.current)
    if (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0]
    const next = !flashOn
    if (torchSupported && track) {
      try {
        await track.applyConstraints({ advanced: [{ torch: next }] })
        setFlashOn(next)
      } catch (err) {
        console.error('Torch toggle failed', err)
        toast.error('Flash failed on this device')
      }
    } else {
      // No hardware torch on this device/browser (always true on iOS — see
      // note above). Screen-flash fallback: capturePhoto() below fires a
      // full-brightness pulse right before the shot instead.
      setFlashOn(next)
      if (next) toast('No hardware flash here — using a bright screen flash for photos instead', { icon: '💡' })
    }
  }

  const handleFiles = useCallback((fileListLike) => {
    const incoming = Array.from(fileListLike || [])
    if (!incoming.length) return
    if (remainingSlots <= 0) return toast.error(`You can add up to ${MAX_MEDIA} media items`)

    const accepted = []
    for (const f of incoming) {
      if (accepted.length >= remainingSlots) {
        toast.error(`Only ${remainingSlots} more allowed`); break
      }
      const isVideo = f.type.startsWith('video/')
      const isImage = f.type.startsWith('image/')
      if (!isImage && !isVideo) { toast.error(`${f.name} isn't an image or video`); continue }
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
      if (f.size > maxSize) {
        toast.error(`${f.name} too large. Max ${maxSize / (1024 * 1024)}MB`); continue
      }
      accepted.push(f)
    }
    if (!accepted.length) return

    if (mediaItems.length === 0) getCachedSignature()
    setErrors((p) => ({ ...p, content: '' }))

    let firstNewId = null
    accepted.forEach((f, idx) => {
      const id = nextId()
      if (idx === 0) firstNewId = id
      const isVideo = f.type.startsWith('video/')
      setMediaItems((prev) => [...prev, { id, file: f, preview: null, compressing: true, isVideo }])
      if (isVideo) {
        ;(async () => {
          const thumb = await generateVideoThumbnail(f)
          setMediaItems((prev) => prev.map((i) =>
            i.id === id ? { ...i, preview: thumb, compressing: false } : i))
        })()
      } else {
        ;(async () => {
          const compressed = await compressImage(f)
          const reader = new FileReader()
          reader.onloadend = () => {
            setMediaItems((prev) => prev.map((i) =>
              i.id === id ? { ...i, file: compressed, preview: reader.result, compressing: false } : i))
          }
          reader.readAsDataURL(compressed)
        })()
      }
    })
    setActiveId((prev) => prev || firstNewId)
  }, [remainingSlots, mediaItems.length, getCachedSignature])

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !cameraReady || !video.videoWidth) return

    const doCapture = () => {
      const canvas = canvasRef.current
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        handleFiles([new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })])
      }, 'image/jpeg', 0.9)
    }

    if (flashOn && !torchSupported) {
      // Real screen-flash: full white, held a beat longer so it actually
      // lights the subject (and reads unmistakably as "flash fired", unlike
      // the quick shutter-click below).
      setFlashPulse(true)
      setTimeout(() => {
        doCapture()
        setTimeout(() => setFlashPulse(false), 180)
      }, 120)
    } else {
      // Either flash is off, or torch is already lighting the scene
      // continuously — just a quick, subtle click for shutter feedback.
      setShutterClick(true)
      setTimeout(() => setShutterClick(false), 90)
      doCapture()
    }
  }

  /* video recording — hold the shutter to record, release to stop */
  const startRecording = () => {
    const stream = streamRef.current
    if (!stream || !cameraReady) return

    // Torch can stay on continuously for video (that's real light hitting
    // the subject). A screen flash can't — it would just wash out every
    // frame of the recording — so let people know once that flash won't
    // help here if they don't have hardware torch.
    if (flashOn && !torchSupported && !videoFlashWarnedRef.current) {
      videoFlashWarnedRef.current = true
      toast('Flash only works for photos on this device, not video', { icon: '💡' })
    }
    const track = stream.getVideoTracks()[0]
    if (flashOn && torchSupported && track) {
      track.applyConstraints({ advanced: [{ torch: true }] }).catch((err) => {
        console.error('Torch failed to engage for recording', err)
      })
    }

    recordedChunksRef.current = []
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    const mimeType = candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
        recordedChunksRef.current = []
        if (blob.size > 0) {
          const ext = recorder.mimeType?.includes('mp4') ? 'mp4' : 'webm'
          handleFiles([new File([blob], `video_${Date.now()}.${ext}`, { type: recorder.mimeType || 'video/webm' })])
        }
      }
      recorder.start()
      setIsRecording(true)
      setRecordSeconds(0)
      recordDurationTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_RECORD_MS / 1000) { stopRecording(); return s }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Recording failed', err)
      toast.error('Video recording not supported on this device')
    }
  }

  const stopRecording = () => {
    clearInterval(recordDurationTimerRef.current)
    recordDurationTimerRef.current = null
    setIsRecording(false)
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }

  const handleShutterDown = () => {
    isHoldingRef.current = true
    longPressTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) startRecording()
    }, LONG_PRESS_MS)
  }

  const handleShutterUp = () => {
    isHoldingRef.current = false
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
    if (isRecording) stopRecording()
    else capturePhoto()
  }

  const handleShutterCancel = () => {
    isHoldingRef.current = false
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
    if (isRecording) stopRecording()
  }

  const removeMedia = (id, e) => {
    e?.stopPropagation()
    setMediaItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      if (!next.length) signatureRef.current = null
      return next
    })
    setActiveId((prev) => {
      if (prev !== id) return prev
      const next = mediaItems.filter((i) => i.id !== id)
      return next[0]?.id || null
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const validate = () => {
    const e = {}
    if (mediaItems.length === 0 && !content.trim()) e.content = 'Add a photo/video or write something'
    setErrors(e)
    return !Object.keys(e).length
  }

  const canShare = Boolean((content.trim() || mediaItems.length > 0) && !loading && !anyCompressing)
  const canNext = mediaItems.length > 0 || content.trim().length > 0

  const handleCancel = () => {
    setUploadStage('cancelling')
    abortControllerRef.current?.abort()
  }

  const handleSubmit = async () => {
    if (!canShare || !validate()) return
    setLoading(true); setUploadProgress(0); setUploadStage('uploading')
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      let images = [], videos = []
      if (mediaItems.length) {
        const signatureData = await getCachedSignature()
        const fp = new Array(mediaItems.length).fill(0)
        const update = () => setUploadProgress(Math.round(fp.reduce((a, b) => a + b, 0) / mediaItems.length))
        const results = await Promise.all(mediaItems.map(({ file }, i) =>
          uploadMediaDirect({
            file, signatureData, signal: controller.signal,
            onProgress: (pct) => { fp[i] = pct; update() },
          })
        ))
        mediaItems.forEach((it, i) => it.isVideo ? videos.push(results[i]) : images.push(results[i]))
      }
      setUploadStage('saving')
      const payload = { images, videos }
      if (content.trim()) payload.content = content.trim()
      else if (mediaItems.length) payload.content = ' '
      await postsAPI.create(payload, { signal: controller.signal })
      toast.success('Posted 🎉')
      navigate('/')
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') toast('Upload cancelled')
      else { console.error(err); toast.error(err.response?.data?.message || 'Failed to create post') }
    } finally {
      setLoading(false); setUploadProgress(0); setUploadStage('uploading')
      abortControllerRef.current = null; signatureRef.current = null
    }
  }

  /* ─────────────────────────── UI ─────────────────────────── */

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden select-none text-white"
      style={{ background: '#000', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",sans-serif' }}>
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── Capture layer ─── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          transform: screen === 'edit' ? 'scale(0.94)' : 'scale(1)',
          filter: screen === 'edit' ? 'brightness(0.3) blur(2px)' : 'none',
          transition: 'transform .35s cubic-bezier(.2,.8,.2,1), filter .3s ease',
          pointerEvents: screen === 'edit' ? 'none' : 'auto',
        }}
      >
        {/* Viewfinder */}
        <div className="relative flex-1" style={{ background: '#0a0a0a' }}>
          {!cameraError && (
            <video
              ref={videoRef}
              playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: cameraReady ? 1 : 0,
                transition: 'opacity .5s ease',
                transform: facing === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-3"
              style={{ background: 'radial-gradient(circle at center, #1a1a1a, #000)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <FiCamera size={22} color="rgba(255,255,255,0.5)" />
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Camera unavailable — use the gallery
              </p>
            </div>
          )}

          {/* subtle vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

          {/* Real flash: full-white, held a beat — this is the actual light
              source on devices with no hardware torch (see capturePhoto). */}
          <AnimatePresence>
            {flashPulse && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: '#fff' }}
              />
            )}
          </AnimatePresence>

          {/* Shutter click: quick, low-opacity — just feedback that a photo
              was taken, deliberately much weaker than the real flash above
              so the two are never confused for each other. */}
          <AnimatePresence>
            {shutterClick && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.22 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.06 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: '#fff' }}
              />
            )}
          </AnimatePresence>

          {/* Selected media preview overlays camera */}
          <AnimatePresence mode="wait">
            {activeItem && (
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0"
              >
                {activeItem.preview ? (
                  activeItem.isVideo ? (
                    <video src={activeItem.preview} muted loop autoPlay playsInline
                      className="w-full h-full object-cover" />
                  ) : (
                    <img src={activeItem.preview} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                    <span className="h-7 w-7 rounded-full border-2 block animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top header (over camera) */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 14px)',
              paddingBottom: 12,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
            }}>
            <IconButton onClick={() => navigate(-1)} label="Close"><FiX size={20} /></IconButton>
            <h1 className="text-[15px] font-semibold tracking-tight">New post</h1>
            <div className="flex items-center gap-2">
              <IconButton
                onClick={toggleFlash}
                label="Flash"
                style={{ color: flashOn ? '#fbbf24' : '#fff' }}
              >
                <FiZap size={17} fill={flashOn ? '#fbbf24' : 'none'} />
              </IconButton>
              <IconButton
                onClick={() => setFacing((f) => f === 'user' ? 'environment' : 'user')}
                label="Flip camera"
              >
                <FiRotateCw size={16} />
              </IconButton>
              <IconButton onClick={() => fileRef.current?.click()} label="Gallery">
                <FiImage size={17} />
              </IconButton>
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-52 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
        </div>

        {/* Bottom control deck */}
        <div className="relative z-10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 18px)' }}>
          {/* Gallery strip */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {mediaItems.map((item) => {
                const isActive = item.id === activeItem?.id
                return (
                  <motion.button
                    key={item.id}
                    layout
                    onClick={() => setActiveId(item.id)}
                    className="relative flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{
                      width: 62, height: 62,
                      boxShadow: isActive ? '0 0 0 2px #fff' : '0 0 0 1px rgba(255,255,255,0.12)',
                      transition: 'box-shadow .2s ease',
                    }}
                  >
                    {item.preview ? (
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full animate-pulse"
                        style={{ background: 'rgba(255,255,255,0.08)' }} />
                    )}
                    {item.isVideo && (
                      <span className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1 rounded"
                        style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <FiPlay size={9} fill="white" />
                      </span>
                    )}
                    <span
                      onClick={(e) => removeMedia(item.id, e)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                    >
                      <FiX size={9} />
                    </span>
                  </motion.button>
                )
              })}
              {remainingSlots > 0 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-shrink-0 flex items-center justify-center rounded-2xl"
                  style={{
                    width: 62, height: 62,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed rgba(255,255,255,0.18)',
                  }}
                >
                  <FiImage size={18} color="rgba(255,255,255,0.5)" />
                </button>
              )}
            </div>
          </div>

          {/* Shutter row — the shutter is absolutely centered in this row so
              it stays dead-center regardless of the (differently-sized)
              gallery and Next buttons on either side. */}
          <div className="relative flex items-center justify-between px-8 pb-2 min-h-[76px]">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
            >
              <FiImage size={18} />
            </button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onPointerDown={handleShutterDown}
              onPointerUp={handleShutterUp}
              onPointerLeave={handleShutterCancel}
              onPointerCancel={handleShutterCancel}
              disabled={!cameraReady}
              aria-label="Take photo, hold for video"
              className="absolute left-1/2 top-1/2 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{
                width: 76, height: 76,
                transform: 'translate(-50%, -50%)',
                background: 'transparent',
                boxShadow: isRecording
                  ? '0 0 0 3px #ef4444, 0 0 0 6px rgba(239,68,68,0.3)'
                  : '0 0 0 3px #fff, 0 0 0 6px rgba(0,0,0,0.4)',
              }}
            >
              <motion.span
                animate={{
                  borderRadius: isRecording ? '30%' : '50%',
                  scale: isRecording ? 0.55 : 1,
                  backgroundColor: isRecording ? '#ef4444' : '#ffffff',
                }}
                transition={{ duration: 0.2 }}
                style={{ width: 60, height: 60 }}
              />
              {isRecording && (
                <span className="absolute -top-8 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: 'rgba(239,68,68,0.9)' }}>
                  {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                  {String(recordSeconds % 60).padStart(2, '0')}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setScreen('edit')}
              disabled={!canNext}
              className="inline-flex items-center justify-center px-6 h-11 min-w-[84px] rounded-full text-sm font-semibold whitespace-nowrap disabled:opacity-30 flex-shrink-0"
              style={{
                background: canNext
                  ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                  : 'rgba(255,255,255,0.08)',
                color: '#fff',
                boxShadow: canNext ? '0 6px 20px rgba(59,130,246,0.45)' : 'none',
              }}
            >
              Next
            </motion.button>
          </div>
          {!isRecording && (
            <p className="text-center text-[11px] pb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Tap for photo · hold for video
            </p>
          )}
        </div>
      </div>

      {/* ─── Edit sheet ─── */}
      <AnimatePresence>
        {screen === 'edit' && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setScreen('capture')}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              className="absolute bottom-0 inset-x-0 flex flex-col overflow-hidden"
              style={{
                height: '86%',
                background: 'linear-gradient(to bottom, #1c1c1e, #141416)',
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                boxShadow: '0 -24px 60px rgba(0,0,0,0.55)',
              }}
            >
              {/* grabber */}
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>

              {/* header */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <button
                  onClick={() => setScreen('capture')}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <FiArrowLeft size={18} />
                </button>
                <h2 className="text-[15px] font-semibold tracking-tight flex-1 text-center">New post</h2>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSubmit}
                  disabled={!canShare}
                  className="inline-flex items-center justify-center px-5 h-9 min-w-[76px] rounded-full text-[13px] font-bold whitespace-nowrap disabled:opacity-30 flex-shrink-0"
                  style={{
                    background: canShare
                      ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                      : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    boxShadow: canShare ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
                  }}
                >
                  Share
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Caption */}
                <div className="flex gap-3 mb-4">
                  <div className="w-[76px] h-[76px] rounded-xl overflow-hidden flex-shrink-0 relative"
                    style={{ background: '#000', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
                    {activeItem?.preview ? (
                      activeItem.isVideo ? (
                        <video src={activeItem.preview} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={activeItem.preview} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <FiImage size={20} />
                      </div>
                    )}
                    {mediaItems.length > 1 && (
                      <span className="absolute bottom-1 right-1 text-[10px] font-bold px-1.5 rounded"
                        style={{ background: 'rgba(0,0,0,0.7)' }}>
                        {mediaItems.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 rounded-xl px-3.5 py-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <textarea
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value)
                        if (errors.content) setErrors((p) => ({ ...p, content: '' }))
                      }}
                      placeholder="Write a caption…"
                      rows={3}
                      maxLength={2200}
                      className="w-full h-full bg-transparent outline-none text-[16px] resize-none leading-relaxed placeholder:text-white/30"
                    />
                  </div>
                </div>
                {errors.content && (
                  <p className="text-xs mb-4" style={{ color: '#ef4444' }}>{errors.content}</p>
                )}

                {/* Thumbs row */}
                {mediaItems.length > 1 && (
                  <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
                    {mediaItems.map((item) => {
                      const isActive = item.id === activeItem?.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveId(item.id)}
                          className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden"
                          style={{
                            boxShadow: isActive
                              ? '0 0 0 2px #3b82f6'
                              : '0 0 0 1px rgba(255,255,255,0.08)',
                          }}
                        >
                          {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
                          {isActive && (
                            <span className="absolute inset-0 flex items-center justify-center"
                              style={{ background: 'rgba(59,130,246,0.25)' }}>
                              <FiCheck size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Advanced hint */}
                <p className="text-[11px] text-center mt-6"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Your post will be visible to your followers
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* Upload overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-72 rounded-[28px] px-6 py-7 flex flex-col items-center gap-5"
              style={{
                background: 'linear-gradient(to bottom, #1e1e20, #17171a)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              }}
            >
              <div className="relative w-20 h-20">
                <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="40" r="34" fill="none"
                    stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                  <motion.circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="url(#progGrad)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - uploadProgress / 100) }}
                    transition={{ ease: 'linear', duration: 0.15 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[15px] font-bold">
                  {uploadProgress}%
                </div>
              </div>

              <div className="text-center">
                <p className="text-[15px] font-semibold">
                  {uploadStage === 'cancelling' ? 'Cancelling…'
                    : uploadStage === 'saving' ? 'Publishing…'
                    : uploadProgress < 100 ? 'Uploading media…' : 'Almost done…'}
                </p>
                {mediaItems.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {mediaItems.length} item{mediaItems.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleCancel}
                disabled={uploadStage === 'cancelling'}
                className="inline-flex items-center justify-center px-5 py-2 min-w-[92px] rounded-full text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {uploadStage === 'cancelling' ? 'Cancelling…' : 'Cancel'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* small helper */
function IconButton({ children, onClick, label, style }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition flex-shrink-0"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}