import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  FiImage, FiX, FiCamera, FiArrowLeft, FiClipboard, FiCheck,
  FiPlus, FiPlay, FiRotateCw, FiChevronLeft, FiChevronRight, FiTrash2,
} from 'react-icons/fi'
import { postsAPI, uploadAPI, uploadMediaDirect } from '../api'
import toast from 'react-hot-toast'

/**
 * CreatePostPage — camera-first compose screen
 * -------------------------------------------------
 * The page now opens straight into a real, live camera feed (not a modal,
 * not a form) — the device camera API starts as soon as the page mounts.
 * From there:
 *   • Capture → freezes the frame and shows a Retake / Use Photo review,
 *     exactly like a native camera app.
 *   • Use Photo → the shot is handed to the exact same compress/upload
 *     pipeline every other photo on this page already used, then the UI
 *     transitions (an animated screen swap, not a page reload) into the
 *     existing post composer (title, story, media grid).
 *   • If the camera is unavailable/denied, or the person just wants to
 *     type, the camera screen always offers a way out: pick from the
 *     gallery, fall back to the OS camera app, or skip straight to
 *     writing — so a blocked camera can never blank the page.
 *   • Once in the composer, the same camera experience is reused as an
 *     on-demand modal (via the existing "Add media"/"Take a photo"
 *     controls) to add further shots up to MAX_MEDIA, mixed freely with
 *     gallery photos/videos.
 *
 * Everything below the screen-switch — validation, compression, signed
 * Cloudinary upload, progress tracking, cancel-in-flight, post creation —
 * is untouched from the previous version.
 *
 * VISUAL LANGUAGE (liquid glass):
 *  • Every surface is a translucent, blurred pane — chrome (top bar, cards,
 *    controls) reads as frosted glass floating above the page, not flat fills.
 *  • Corner radii are chosen concentrically: an outer glass panel's radius
 *    equals its inner content's radius plus the panel's own padding, so
 *    nested shapes (bar → button, card → tile, modal → video frame) always
 *    share a common curvature center, the way Apple's glass surfaces do.
 *  • A thin inner highlight (inset box-shadow) traces the top edge of every
 *    glass pane to fake a specular light catch, plus a soft outer shadow to
 *    keep the pane feeling lifted off the page.
 *
 * Upload path: files go straight from the browser to Cloudinary using a
 * signed upload (uploadAPI.getSignature() + uploadMediaDirect() in ../api.js).
 * Render only ever sees a small JSON payload with the resulting URLs — see
 * post.controller.js's createPost, which has no multer on it at all anymore
 * and reads req.body.images/videos as plain metadata. This is what makes
 * posting fast even for large videos, and it's also what makes a genuine
 * mid-upload Cancel possible: aborting stops the actual byte transfer to
 * Cloudinary, not just some request to our own backend.
 */
const MAX_MEDIA = 5
// Images are downscaled to this max dimension + re-encoded as JPEG before upload.
// This is the main lever for upload speed — a 4000x3000 phone photo (6-8MB) usually
// compresses down to a few hundred KB with no visible quality loss at feed size.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
// Size caps are split by media type — video files are naturally much larger than
// photos (a couple minutes of phone footage is routinely 50-150MB), so reusing the
// image cap here silently rejected every real-world video.
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB — matches backend's IMAGE_SIZE_LIMIT
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB — matches backend's VIDEO_SIZE_LIMIT
// How long a fetched Cloudinary signature stays valid for reuse. Comfortably under
// the backend's own expiry so we never hand uploadMediaDirect a stale signature.
const SIGNATURE_TTL = 8 * 60 * 1000

// ---- liquid-glass style helpers -------------------------------------
// Small, reusable style objects so every "pane" in the UI shares the same
// translucency / blur / edge-highlight recipe. Kept as plain style objects
// (not Tailwind plugins) so they work with the existing CSS-variable theming.
const glassEdge = '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 -1px 0 0 rgba(0,0,0,0.04) inset'
const glassShadow = '0 20px 50px -22px rgba(0,0,0,0.35)'
const glassShadowSoft = '0 10px 26px -16px rgba(0,0,0,0.3)'

function surfaceGlass(opacity = 62) {
  return {
    background: `color-mix(in oklab, var(--bg-primary) ${opacity}%, transparent)`,
    borderColor: 'color-mix(in oklab, var(--border) 65%, transparent)',
    boxShadow: `${glassEdge}, ${glassShadowSoft}`,
  }
}

// A dark, glassy control used for buttons that float over the live camera
// feed or a photo — same recipe as the rest of the app's overlay chrome.
const scrimControl = {
  background: 'rgba(20,20,22,0.4)',
  borderColor: 'rgba(255,255,255,0.2)',
  boxShadow: glassEdge,
}

let idSeq = 0
const nextId = () => `media_${Date.now()}_${idSeq++}`

// Resize + re-encode an image file in the browser using a canvas. Falls back to the
// original file if anything goes wrong (e.g. unsupported format) so uploads never break.
// Videos are skipped (returned as-is) — see generateVideoThumbnail below for their preview.
function compressImage(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
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
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return }
        // Only use the compressed version if it's actually smaller
        if (blob.size >= file.size) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', JPEG_QUALITY)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Grabs a single frame from a video file and returns it as a JPEG data URL, so
// video previews behave exactly like image previews — no <video> tag needed in
// the grid, no risk of it rendering blank because autoplay never fired.
function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => URL.revokeObjectURL(url)
    // Safety net — if a video never fires loadedmetadata/seeked (corrupt file,
    // unsupported codec), don't leave the tile stuck spinning forever.
    const timeout = setTimeout(() => { cleanup(); resolve(null) }, 8000)

    video.onloadedmetadata = () => {
      // The very first frame is often black/undecoded — seek in a touch.
      video.currentTime = Math.min(0.3, (video.duration || 1) / 4)
    }
    video.onseeked = () => {
      clearTimeout(timeout)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || MAX_DIMENSION
      canvas.height = video.videoHeight || MAX_DIMENSION
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        cleanup()
        if (!blob) { resolve(null); return }
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.8)
    }
    video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null) }
  })
}

export default function CreatePostPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const cameraFallbackRef = useRef(null)
  const titleRef = useRef(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  // files/previews are parallel arrays, each entry keyed by a stable id.
  // preview is ALWAYS a static image data URL (a real photo for images, a
  // captured frame for videos) — isVideo just controls the play-icon badge.
  const [mediaItems, setMediaItems] = useState([]) // [{ id, file, preview, compressing, isVideo }]
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0) // 0-100, real bytes-uploaded progress
  const [uploadStage, setUploadStage] = useState('uploading') // 'uploading' | 'saving' | 'cancelling'
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState({})
  const [justPasted, setJustPasted] = useState(false)
  const [previewId, setPreviewId] = useState(null) // id of the item shown in the lightbox, or null

  // ---- top-level screen: the page opens straight into the live camera,
  // then transitions to the composer once a photo is used or the person
  // chooses to skip / picks something from the gallery.
  const [screen, setScreen] = useState('camera') // 'camera' | 'compose'

  // ---- device camera (used both as the initial full-page experience and,
  // later, as an on-demand modal from inside the composer to add more shots)
  const camVideoRef = useRef(null)
  const camStreamRef = useRef(null)
  const camCanvasRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false) // secondary modal camera, opened from the composer
  const [camFacing, setCamFacing] = useState('environment')
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)
  const [shutterFlash, setShutterFlash] = useState(false)
  // A captured-but-not-yet-accepted frame, shown as a Retake/Use Photo review.
  const [capturedShot, setCapturedShot] = useState(null) // { blob, previewUrl } | null
  const cameraActive = screen === 'camera' || cameraOpen

  // Holds the AbortController for whatever's currently in flight (Cloudinary
  // upload(s) or the final post-create call) so Cancel can actually stop it.
  const abortControllerRef = useRef(null)
  // Caches the Cloudinary signature for a few minutes so Post doesn't have to
  // wait on a fresh fetch on top of the actual upload.
  const signatureRef = useRef(null) // { promise, timestamp }
  // Subtle tilt on the dropzone that follows the cursor — feels alive without being loud
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-40, 40], [4, -4])
  const rotateY = useTransform(mx, [-40, 40], [-4, 4])
  const remainingSlots = MAX_MEDIA - mediaItems.length
  const anyCompressing = mediaItems.some(item => item.compressing)
  const previewIndex = mediaItems.findIndex(item => item.id === previewId)
  const previewItem = previewIndex >= 0 ? mediaItems[previewIndex] : null
  const lastShotPreview = mediaItems[mediaItems.length - 1]?.preview || null

  // ---- signature caching --------------------------------------------
  const getCachedSignature = useCallback(() => {
    const now = Date.now()
    if (signatureRef.current && now - signatureRef.current.timestamp < SIGNATURE_TTL) {
      return signatureRef.current.promise
    }
    const promise = uploadAPI.getSignature().then(res => res.data.data)
    signatureRef.current = { promise, timestamp: now }
    promise.catch(() => { if (signatureRef.current?.promise === promise) signatureRef.current = null })
    return promise
  }, [])

  // ---- validation --------------------------------------------------
  const validate = () => {
    const e = {}
    const t = title.trim()
    if (t && t.length < 3) e.title = 'Title must be at least 3 characters'
    else if (t.length > 100) e.title = 'Title must be under 100 characters'
    if (!content.trim() && mediaItems.length === 0) e.content = 'Add a photo/video or a few words'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  // ---- file handling -----------------------------------------------
  // Images and videos can be freely mixed, up to MAX_MEDIA total, in any order.
  const handleFiles = useCallback((fileListLike) => {
    const incoming = Array.from(fileListLike || [])
    if (!incoming.length) return
    if (remainingSlots <= 0) {
      toast.error(`You can add up to ${MAX_MEDIA} media items`)
      return
    }
    const accepted = []
    for (const f of incoming) {
      if (accepted.length >= remainingSlots) {
        toast.error(`Only ${remainingSlots} more media item${remainingSlots === 1 ? '' : 's'} allowed`)
        break
      }
      const isVideoFile = f.type.startsWith('video/')
      const isImageFile = f.type.startsWith('image/')
      if (!isImageFile && !isVideoFile) {
        toast.error(`${f.name || 'File'} isn't an image or video`)
        continue
      }
      const maxSize = isVideoFile ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
      if (f.size > maxSize) {
        const maxLabel = isVideoFile ? `${MAX_VIDEO_SIZE / (1024 * 1024)}MB` : `${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
        toast.error(`${f.name || 'File'} is too large. Max ${maxLabel}`)
        continue
      }
      accepted.push(f)
    }
    if (!accepted.length) return
    // Warm the signature cache the moment the first item lands, so Post
    // doesn't pay for that round-trip later.
    if (mediaItems.length === 0) getCachedSignature()
    setErrors(prev => ({ ...prev, content: '' }))
    accepted.forEach((f) => {
      const id = nextId()
      const isVideo = f.type.startsWith('video/')
      // Add a placeholder immediately with compressing:true, then swap in the
      // real preview once ready. Keeps the UI responsive for many items.
      setMediaItems(prev => [...prev, { id, file: f, preview: null, compressing: true, isVideo }])
      if (isVideo) {
        ;(async () => {
          const thumb = await generateVideoThumbnail(f)
          setMediaItems(prev => prev.map(item => item.id === id
            ? { ...item, preview: thumb, compressing: false }
            : item))
        })()
      } else {
        ;(async () => {
          const compressed = await compressImage(f)
          const reader = new FileReader()
          reader.onloadend = () => {
            setMediaItems(prev => prev.map(item => item.id === id
              ? { ...item, file: compressed, preview: reader.result, compressing: false }
              : item))
          }
          reader.readAsDataURL(compressed)
        })()
      }
    })
  }, [remainingSlots, mediaItems.length, getCachedSignature])
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }
  const removeMedia = (id, e) => {
    e?.stopPropagation()
    setMediaItems(prev => {
      const next = prev.filter(item => item.id !== id)
      if (!next.length) signatureRef.current = null // nothing left to reuse it for
      return next
    })
    setPreviewId(prev => (prev === id ? null : prev))
    if (fileRef.current) fileRef.current.value = ''
  }
  // Files picked via the shared gallery/OS-camera inputs — used from both the
  // initial camera screen and the composer, so route the screen switch here.
  const onFilesPicked = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
    if (screen === 'camera') setScreen('compose')
  }
  // Paste image(s) from clipboard anywhere on the page — desktop delight
  useEffect(() => {
    const onPaste = (e) => {
      const items = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/'))
      if (!items.length) return
      const fs = items.map(i => i.getAsFile()).filter(Boolean)
      if (fs.length) {
        handleFiles(fs)
        setJustPasted(true)
        setTimeout(() => setJustPasted(false), 1600)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFiles])
  // ⌘/Ctrl + Enter to post
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, mediaItems, loading])
  // Abort whatever's in flight if the user navigates away mid-upload.
  useEffect(() => () => abortControllerRef.current?.abort(), [])
  const canPost = Boolean((title.trim() || content.trim() || mediaItems.length > 0) && !loading && !anyCompressing)

  const handleCancel = () => {
    setUploadStage('cancelling')
    abortControllerRef.current?.abort()
  }

  const handleSubmit = async () => {
    if (!canPost || !validate()) return
    setLoading(true)
    setUploadProgress(0)
    setUploadStage('uploading')
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      let images = []
      let videos = []

      if (mediaItems.length > 0) {
        const signatureData = await getCachedSignature()

        // Track each file's own progress so the overall bar reflects real
        // bytes uploaded across all files, not just "file N of M done".
        const fileProgress = new Array(mediaItems.length).fill(0)
        const updateOverall = () => {
          const total = fileProgress.reduce((a, b) => a + b, 0)
          setUploadProgress(Math.round(total / mediaItems.length))
        }

        const results = await Promise.all(
          mediaItems.map(({ file }, i) =>
            uploadMediaDirect({
              file,
              signatureData,
              signal: controller.signal,
              onProgress: (pct) => { fileProgress[i] = pct; updateOverall() },
            })
          )
        )

        mediaItems.forEach((item, i) => {
          if (item.isVideo) videos.push(results[i])
          else images.push(results[i])
        })
      }

      setUploadStage('saving')
      // Plain JSON — matches post.controller.js's createPost exactly.
      // Do NOT wrap this in FormData or set a multipart header: there's no
      // multer on this route anymore, so anything but JSON gets silently
      // dropped by express.json() and the post will fail to create.
      const payload = { images, videos }
      if (title.trim()) payload.title = title.trim()
      if (content.trim()) payload.content = content.trim()
      else if (mediaItems.length) payload.content = ' '

      await postsAPI.create(payload, { signal: controller.signal })

      toast.success('Posted 🎉')
      navigate('/')
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        toast('Upload cancelled')
      } else {
        console.error(err)
        toast.error(err.response?.data?.message || 'Failed to create post')
      }
    } finally {
      setLoading(false)
      setUploadProgress(0)
      setUploadStage('uploading')
      abortControllerRef.current = null
      signatureRef.current = null // fetch a fresh one next time, win or lose
    }
  }

  // ---- device camera ---------------------------------------------------
  // Drives whichever camera UI is currently visible — the full-page initial
  // screen (screen === 'camera') or the secondary "add another shot" modal
  // opened from the composer (cameraOpen). Only one is ever active at once.
  // The stream is always torn down the moment neither is active, so the
  // camera is never left running in the background.
  const stopCameraStream = useCallback(() => {
    camStreamRef.current?.getTracks().forEach(t => t.stop())
    camStreamRef.current = null
  }, [])

  useEffect(() => {
    if (!cameraActive) return
    let cancelled = false
    setCamReady(false)
    setCamError(false)
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: camFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        stopCameraStream()
        camStreamRef.current = stream
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream
          await camVideoRef.current.play().catch(() => {})
        }
        if (!cancelled) setCamReady(true)
      } catch (err) {
        console.error('Camera unavailable', err)
        if (!cancelled) setCamError(true)
      }
    })()
    return () => {
      cancelled = true
      stopCameraStream()
    }
  }, [cameraActive, camFacing, stopCameraStream])

  // Closes the secondary (composer) camera modal without touching `screen`.
  const closeCameraModal = () => {
    if (capturedShot?.previewUrl) URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
    setCameraOpen(false)
    setCamReady(false)
    setCamError(false)
  }

  // Freezes the current frame into a review step (Retake / Use Photo) —
  // nothing is added to the post until the person explicitly accepts it.
  const capturePhoto = () => {
    const video = camVideoRef.current
    if (!video || !camReady || !video.videoWidth) return
    const canvas = camCanvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    if (camFacing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    setShutterFlash(true)
    setTimeout(() => setShutterFlash(false), 150)
    canvas.toBlob((blob) => {
      if (!blob) return
      setCapturedShot({ blob, previewUrl: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.92)
  }

  const retakePhoto = () => {
    if (capturedShot?.previewUrl) URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
  }

  // Accepts the reviewed frame: runs it through the exact same
  // compress/preview pipeline as any other photo, then moves on —
  // to the composer for the initial screen, or just closes the modal.
  const usePhoto = () => {
    if (!capturedShot) return
    const file = new File([capturedShot.blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
    handleFiles([file])
    URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
    if (screen === 'camera') setScreen('compose')
    else setCameraOpen(false)
  }

  const flipCamera = () => setCamFacing(f => (f === 'user' ? 'environment' : 'user'))

  // ---- shared camera UI --------------------------------------------
  // Renders identically whether it's the initial full-page screen or the
  // composer's on-demand modal — only the outer wrapper differs.
  const renderCameraUI = (mode) => {
    const isModal = mode === 'modal'
    const onClose = isModal ? closeCameraModal : () => navigate(-1)
    return (
      <div
        className={isModal
          ? 'relative w-full max-w-md mx-4 rounded-[36px] overflow-hidden border backdrop-blur-2xl p-1.5'
          : 'relative w-full h-full'}
        style={isModal ? { background: 'rgba(10,10,10,0.55)', borderColor: 'rgba(255,255,255,0.14)', boxShadow: `${glassEdge}, ${glassShadow}` } : undefined}
      >
        <div className={isModal ? 'relative aspect-[3/4] rounded-[30px] overflow-hidden' : 'relative w-full h-full'}>
          {!camError ? (
            <video
              ref={camVideoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: camReady ? 1 : 0,
                transition: 'opacity .4s ease',
                transform: camFacing === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8" style={{ background: '#0a0a0a' }}>
              <FiCamera size={24} color="rgba(255,255,255,0.5)" />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Couldn't access the camera. You can still add photos another way.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[220px]">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => cameraFallbackRef.current?.click()}
                  className="px-4 py-2.5 rounded-full text-xs font-bold"
                  style={{ background: '#f59e0b', color: 'white' }}
                >
                  Open camera app
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2.5 rounded-full text-xs font-bold border backdrop-blur-xl"
                  style={{ ...scrimControl, color: 'white' }}
                >
                  Choose from gallery
                </motion.button>
                {!isModal && (
                  <button
                    onClick={() => setScreen('compose')}
                    className="mt-1 text-xs font-semibold underline underline-offset-2"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    Skip, just write instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Frozen review frame — shown after Capture, before Retake/Use Photo */}
          <AnimatePresence>
            {capturedShot && (
              <motion.img
                key="review"
                src={capturedShot.previewUrl}
                alt="Captured preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </AnimatePresence>

          {!camReady && !camError && !capturedShot && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="rounded-full h-6 w-6 border-2 block"
                style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#f59e0b' }}
              />
            </div>
          )}

          <AnimatePresence>
            {shutterFlash && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: '#fff' }}
              />
            )}
          </AnimatePresence>

          {/* Top controls — hidden while reviewing a shot */}
          {!capturedShot && (
            <>
              <button
                onClick={onClose}
                aria-label={isModal ? 'Close camera' : 'Back'}
                className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                style={scrimControl}
              >
                {isModal ? <FiX size={18} color="white" /> : <FiArrowLeft size={18} color="white" />}
              </button>
              {!camError && (
                <button
                  onClick={flipCamera}
                  aria-label="Flip camera"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                  style={scrimControl}
                >
                  <FiRotateCw size={16} color="white" />
                </button>
              )}
              {!isModal && !camError && (
                <button
                  onClick={() => setScreen('compose')}
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-xl"
                  style={{ ...scrimControl, color: 'white' }}
                >
                  Skip, just write
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom controls */}
        {!camError && (
          <div className="flex items-center justify-center py-5 px-8">
            {capturedShot ? (
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={retakePhoto}
                  className="px-5 h-11 rounded-full text-sm font-bold border backdrop-blur-xl"
                  style={{ ...scrimControl, color: 'white' }}
                >
                  Retake
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={usePhoto}
                  className="flex items-center gap-1.5 px-6 h-11 rounded-full text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    color: 'white',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px -8px rgba(245,158,11,0.6)',
                  }}
                >
                  <FiCheck size={15} strokeWidth={3} /> Use Photo
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Choose from gallery"
                  className="w-12 h-12 rounded-2xl overflow-hidden border backdrop-blur-xl flex items-center justify-center"
                  style={scrimControl}
                >
                  {lastShotPreview ? (
                    <img src={lastShotPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiImage size={18} color="white" />
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={capturePhoto}
                  disabled={!camReady}
                  aria-label="Take photo"
                  className="rounded-full disabled:opacity-40"
                  style={{
                    width: 72,
                    height: 72,
                    background: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <span className="block rounded-full" style={{ width: 58, height: 58, margin: '0 auto', background: '#fff' }} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={flipCamera}
                  aria-label="Flip camera"
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl"
                  style={scrimControl}
                >
                  <FiRotateCw size={18} color="white" />
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ---- render ------------------------------------------------------
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: screen === 'camera' ? '#000' : 'var(--bg-primary)' }}>
      {/* Shared canvas + hidden inputs — used by both the full-page camera
          and the composer's modal camera / gallery pickers. */}
      <canvas ref={camCanvasRef} className="hidden" />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onFilesPicked}
      />
      {/* Fallback for devices/browsers where getUserMedia isn't available:
          this opens the OS camera app directly via the file picker. */}
      <input
        ref={cameraFallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFilesPicked}
      />

      <AnimatePresence mode="wait">
        {screen === 'camera' ? (
          <motion.div
            key="camera-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-20"
          >
            {renderCameraUI('full')}
          </motion.div>
        ) : (
          <motion.div
            key="compose-screen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Soft ambient glow that drifts — pure decoration */}
            <motion.div
              aria-hidden
              className="pointer-events-none fixed -top-40 -right-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
              style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 60%)' }}
              animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none fixed -bottom-40 -left-40 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
              style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 60%)' }}
              animate={{ x: [0, -20, 30, 0], y: [0, 20, -10, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating liquid-glass top bar */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="sticky top-3 z-30 flex items-center justify-between mx-3 px-3 py-2.5 rounded-[28px] border backdrop-blur-2xl backdrop-saturate-150"
              style={surfaceGlass(58)}
            >
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center rounded-full border backdrop-blur-xl"
                style={{
                  color: 'var(--text-primary)',
                  background: 'color-mix(in oklab, var(--bg-secondary) 55%, transparent)',
                  borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)',
                  boxShadow: glassEdge,
                }}
              >
                <FiArrowLeft size={18} strokeWidth={2.4} />
              </motion.button>
              <div className="flex flex-col items-center leading-tight">
                <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>New post</h1>
                <span className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--text-muted)' }}>
                  Draft
                </span>
              </div>
              <PostButton canPost={canPost} loading={loading} uploadProgress={uploadProgress} onClick={handleSubmit} />
            </motion.header>
            {/* Full-screen upload overlay — visible while the request is actually in flight.
                Includes a Cancel button that aborts the real network transfer via
                AbortController, not just a fake UI dismiss. */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md"
                  style={{ background: 'rgba(0,0,0,0.32)' }}
                >
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    className="w-64 rounded-[32px] px-6 py-7 flex flex-col items-center gap-4 border backdrop-blur-2xl backdrop-saturate-150"
                    style={{ ...surfaceGlass(72), boxShadow: `${glassEdge}, ${glassShadow}` }}
                  >
                    <div className="relative w-16 h-16 rounded-full border flex items-center justify-center"
                      style={{
                        background: 'color-mix(in oklab, var(--bg-secondary) 60%, transparent)',
                        borderColor: 'color-mix(in oklab, var(--border) 60%, transparent)',
                      }}
                    >
                      <svg width="56" height="56" viewBox="0 0 64 64" className="-rotate-90 absolute">
                        <defs>
                          <linearGradient id="postProgGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="5" />
                        <motion.circle
                          cx="32" cy="32" r="27" fill="none" stroke="url(#postProgGrad)" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 27}
                          initial={false}
                          animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - uploadProgress / 100) }}
                          transition={{ ease: 'linear', duration: 0.15 }}
                        />
                      </svg>
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {uploadProgress}%
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {uploadStage === 'cancelling'
                          ? 'Cancelling…'
                          : uploadStage === 'saving'
                          ? 'Saving post…'
                          : uploadProgress < 100
                          ? 'Uploading…'
                          : 'Almost done…'}
                      </p>
                      {mediaItems.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {mediaItems.length} media item{mediaItems.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleCancel}
                      disabled={uploadStage === 'cancelling'}
                      className="px-4 py-2 rounded-full text-xs font-bold border backdrop-blur-xl disabled:opacity-50"
                      style={{
                        background: 'color-mix(in oklab, var(--bg-secondary) 65%, transparent)',
                        color: 'var(--text-primary)',
                        borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)',
                        boxShadow: glassEdge,
                      }}
                    >
                      {uploadStage === 'cancelling' ? 'Cancelling…' : 'Cancel'}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Body */}
            <motion.main
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
            >
              {/* Dropzone / preview grid */}
              <motion.section
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                className="mb-8"
              >
                <AnimatePresence mode="wait">
                  {mediaItems.length > 0 ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-[32px] border backdrop-blur-2xl backdrop-saturate-150 p-3 space-y-3"
                      style={surfaceGlass(50)}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {mediaItems.length} / {MAX_MEDIA} media
                          {anyCompressing && <span style={{ color: '#f59e0b' }}> · optimizing…</span>}
                        </span>
                        {justPasted && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.9 }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
                            style={{ background: 'rgba(245,158,11,0.85)', color: 'white', boxShadow: glassEdge }}
                          >
                            <FiClipboard size={12} /> Pasted
                          </motion.div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <AnimatePresence>
                          {mediaItems.map(({ id, preview, file, compressing, isVideo }) => (
                            <motion.div
                              key={id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                              onClick={() => preview && !compressing && setPreviewId(id)}
                              className="relative aspect-square rounded-[20px] overflow-hidden group border"
                              style={{
                                background: 'var(--bg-secondary)',
                                borderColor: 'color-mix(in oklab, var(--border) 55%, transparent)',
                                boxShadow: glassShadowSoft,
                                cursor: preview && !compressing ? 'zoom-in' : 'default',
                              }}
                            >
                              {preview ? (
                                <motion.img
                                  src={preview}
                                  alt={file?.name || 'Preview'}
                                  initial={{ scale: 1.08, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                    className="rounded-full h-5 w-5 border-2 block"
                                    style={{ borderColor: 'var(--border)', borderTopColor: '#f59e0b' }}
                                  />
                                </div>
                              )}
                              {compressing && preview && (
                                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]" style={{ background: 'rgba(0,0,0,0.22)' }}>
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                    className="rounded-full h-6 w-6 border-2 block"
                                    style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}
                                  />
                                </div>
                              )}
                              {/* Play badge marks video items — preview is a captured frame, not a live video */}
                              {isVideo && preview && !compressing && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border"
                                    style={{ background: 'rgba(20,20,22,0.4)', borderColor: 'rgba(255,255,255,0.22)', boxShadow: glassEdge }}>
                                    <FiPlay size={16} color="white" fill="white" style={{ marginLeft: 2 }} />
                                  </div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => removeMedia(id, e)}
                                aria-label="Remove media"
                                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl border"
                                style={{ background: 'rgba(20,20,22,0.4)', borderColor: 'rgba(255,255,255,0.2)', boxShadow: glassEdge }}
                              >
                                <FiX size={14} color="white" />
                              </motion.button>
                              {file && !compressing && (
                                <div
                                  className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-xl border"
                                  style={{ background: 'rgba(20,20,22,0.4)', color: 'white', borderColor: 'rgba(255,255,255,0.16)' }}
                                >
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </div>
                              )}
                            </motion.div>
                          ))}
                          {remainingSlots > 0 && (
                            <motion.div
                              key="add-more-group"
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="aspect-square rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center gap-2"
                              style={{ borderColor: 'color-mix(in oklab, var(--border) 80%, transparent)', background: 'color-mix(in oklab, var(--bg-secondary) 45%, transparent)' }}
                            >
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => fileRef.current?.click()}
                                  aria-label="Add from gallery"
                                  className="w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                                  style={{ background: 'color-mix(in oklab, var(--bg-primary) 60%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)', boxShadow: glassEdge }}
                                >
                                  <FiPlus size={16} color="#f59e0b" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => setCameraOpen(true)}
                                  aria-label="Take a photo"
                                  className="w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                                  style={{ background: 'color-mix(in oklab, var(--bg-primary) 60%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)', boxShadow: glassEdge }}
                                >
                                  <FiCamera size={15} color="#f59e0b" />
                                </motion.button>
                              </div>
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                                Add media
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="dropzone"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => fileRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onMouseMove={(e) => {
                        const r = e.currentTarget.getBoundingClientRect()
                        mx.set(e.clientX - r.left - r.width / 2)
                        my.set(e.clientY - r.top - r.height / 2)
                      }}
                      onMouseLeave={() => { mx.set(0); my.set(0) }}
                      style={{
                        borderColor: dragOver ? '#f59e0b' : 'color-mix(in oklab, var(--border) 75%, transparent)',
                        background: dragOver
                          ? 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.05))'
                          : 'color-mix(in oklab, var(--bg-secondary) 45%, transparent)',
                        rotateX,
                        rotateY,
                        transformPerspective: 1000,
                        boxShadow: `${glassEdge}, ${glassShadowSoft}`,
                      }}
                      className="relative rounded-[32px] border-2 border-dashed backdrop-blur-2xl backdrop-saturate-150 flex flex-col items-center justify-center gap-3 cursor-pointer py-16 sm:py-20 px-6 text-center"
                    >
                      <motion.div
                        animate={{
                          scale: dragOver ? 1.15 : 1,
                          rotate: dragOver ? [0, -6, 6, 0] : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                        className="w-16 h-16 rounded-[22px] flex items-center justify-center border"
                        style={{
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.20), rgba(245,158,11,0.06))',
                          borderColor: 'rgba(245,158,11,0.25)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                        }}
                      >
                        <FiImage size={28} color="#f59e0b" strokeWidth={2} />
                      </motion.div>
                      <div className="space-y-1">
                        <p className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {dragOver ? 'Drop it here' : 'Add photos & videos'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Drag & drop, click to browse, or <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border backdrop-blur-xl"
                            style={{ background: 'color-mix(in oklab, var(--bg-primary) 60%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)' }}>⌘V</kbd> to paste — up to {MAX_MEDIA}, mix photos and videos freely
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => { e.stopPropagation(); setCameraOpen(true) }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-xl"
                        style={{ background: 'color-mix(in oklab, var(--bg-primary) 60%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)', color: 'var(--text-primary)', boxShadow: glassEdge }}
                      >
                        <FiCamera size={13} color="#f59e0b" /> Take a photo instead
                      </motion.button>
                      <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>
                        <span>PNG</span><span>·</span><span>JPG</span><span>·</span><span>WEBP</span><span>·</span><span>MP4</span><span>·</span><span>10MB photos / 100MB video</span>
                      </div>
                      <AnimatePresence>
                        {justPasted && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md"
                            style={{ background: 'rgba(245,158,11,0.85)', color: 'white', boxShadow: glassEdge }}
                          >
                            <FiClipboard size={12} /> Pasted
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
              {/* Title */}
              <motion.section
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                className="rounded-[28px] border backdrop-blur-xl px-5 py-4"
                style={surfaceGlass(40)}
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
                    Title
                  </span>
                  <span className="flex-1 h-px" style={{ background: 'color-mix(in oklab, var(--border) 70%, transparent)' }} />
                </div>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder="Give it a name…"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (errors.title) setErrors(p => ({ ...p, title: '' }))
                  }}
                  maxLength={100}
                  className="w-full bg-transparent outline-none text-2xl sm:text-3xl font-extrabold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                />
                <div className="flex justify-between items-center mt-1.5 min-h-[18px]">
                  <AnimatePresence mode="wait">
                    {errors.title ? (
                      <motion.p
                        key="err"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-500 font-medium"
                      >
                        {errors.title}
                      </motion.p>
                    ) : <span key="ph" />}
                  </AnimatePresence>
                  <CharCounter value={title.length} max={100} />
                </div>
              </motion.section>
              {/* Content */}
              <motion.section
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                className="mt-4 rounded-[28px] border backdrop-blur-xl px-5 py-4"
                style={surfaceGlass(40)}
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
                    Story
                  </span>
                  <span className="flex-1 h-px" style={{ background: 'color-mix(in oklab, var(--border) 70%, transparent)' }} />
                </div>
                <textarea
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    if (errors.content) setErrors(p => ({ ...p, content: '' }))
                  }}
                  rows={6}
                  className="w-full bg-transparent outline-none text-[16px] resize-none leading-[1.7]"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <AnimatePresence>
                  {errors.content && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-red-500 font-medium"
                    >
                      {errors.content}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.section>
              {/* Footer hint */}
              <motion.div
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                className="mt-8 flex items-center justify-center gap-2 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border backdrop-blur-xl"
                  style={{ background: 'color-mix(in oklab, var(--bg-secondary) 55%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)' }}>⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border backdrop-blur-xl"
                  style={{ background: 'color-mix(in oklab, var(--bg-secondary) 55%, transparent)', borderColor: 'color-mix(in oklab, var(--border) 70%, transparent)' }}>Enter</kbd>
                <span>to post</span>
              </motion.div>
            </motion.main>

            {/* Secondary camera modal — opened from the composer to add
                further shots. Same capture/retake/use flow as the initial
                full-page camera, just presented as a floating glass card. */}
            <AnimatePresence>
              {cameraOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <motion.div
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                  >
                    {renderCameraUI('modal')}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lightbox preview — tap any grid tile to open a full-size view with
                prev/next when there's more than one item, and a way to remove it. */}
            <AnimatePresence>
              {previewItem && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 backdrop-blur-md"
                  style={{ background: 'rgba(0,0,0,0.82)' }}
                  onClick={() => setPreviewId(null)}
                >
                  <button
                    onClick={() => setPreviewId(null)}
                    aria-label="Close preview"
                    className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', boxShadow: glassEdge }}
                  >
                    <FiX size={18} color="white" />
                  </button>
                  {mediaItems.length > 1 && (
                    <span className="absolute top-5 left-5 text-xs font-semibold px-2.5 py-1 rounded-full text-white border backdrop-blur-xl"
                      style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)' }}>
                      {previewIndex + 1} / {mediaItems.length}
                    </span>
                  )}
                  <div className="relative w-full flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    {previewIndex > 0 && (
                      <button
                        onClick={() => setPreviewId(mediaItems[previewIndex - 1].id)}
                        aria-label="Previous"
                        className="absolute left-2 z-10 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                        style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', boxShadow: glassEdge }}
                      >
                        <FiChevronLeft size={18} color="white" />
                      </button>
                    )}
                    <img
                      src={previewItem.preview}
                      alt=""
                      className="max-w-full max-h-[70vh] rounded-[24px] object-contain"
                    />
                    {previewIndex < mediaItems.length - 1 && (
                      <button
                        onClick={() => setPreviewId(mediaItems[previewIndex + 1].id)}
                        aria-label="Next"
                        className="absolute right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                        style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', boxShadow: glassEdge }}
                      >
                        <FiChevronRight size={18} color="white" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pb-8" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => removeMedia(previewItem.id, e)}
                      className="flex items-center gap-1.5 px-5 h-10 rounded-full text-sm font-semibold border backdrop-blur-xl"
                      style={{ background: 'rgba(239,68,68,0.18)', color: '#ff6b6b', borderColor: 'rgba(239,68,68,0.3)', boxShadow: glassEdge }}
                    >
                      <FiTrash2 size={14} /> Remove
                    </button>
                    <button
                      onClick={() => setPreviewId(null)}
                      className="px-5 h-10 rounded-full text-sm font-semibold text-white border backdrop-blur-xl"
                      style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', boxShadow: glassEdge }}
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ---------- sub-components ------------------------------------------------
function PostButton({ canPost, loading, uploadProgress, onClick }) {
  return (
    <motion.button
      whileHover={canPost ? { scale: 1.05 } : {}}
      whileTap={canPost ? { scale: 0.94 } : {}}
      onClick={onClick}
      disabled={!canPost}
      className="relative px-5 py-2 rounded-full font-bold text-sm border disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden backdrop-blur-xl"
      style={{
        background: canPost
          ? 'linear-gradient(135deg, #f59e0b, #f97316)'
          : 'color-mix(in oklab, var(--bg-secondary) 60%, transparent)',
        borderColor: canPost ? 'rgba(255,255,255,0.35)' : 'color-mix(in oklab, var(--border) 70%, transparent)',
        color: canPost ? 'white' : 'var(--text-muted)',
        boxShadow: canPost
          ? 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px -8px rgba(245,158,11,0.6)'
          : 'none',
      }}
    >
      {canPost && (
        <motion.span
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.45), transparent)' }}
          animate={{ x: ['-120%', '120%'], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative flex items-center gap-1.5"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              className="rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent block"
            />
            {uploadProgress > 0 ? `${uploadProgress}%` : 'Posting'}
          </motion.span>
        ) : (
          <motion.span
            key="post"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative flex items-center gap-1"
          >
            <FiCheck size={14} strokeWidth={3} /> Post
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
function CharCounter({ value, max }) {
  const pct = Math.min(1, value / max)
  const color = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : 'var(--text-muted)'
  const circumference = 2 * Math.PI * 7
  return (
    <div className="flex items-center gap-1.5">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        <motion.circle
          cx="9" cy="9" r="7" fill="none"
          stroke={color} strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          transform="rotate(-90 9 9)"
        />
      </svg>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] font-mono tabular-nums"
        style={{ color }}
      >
        {value}/{max}
      </motion.span>
    </div>
  )
}