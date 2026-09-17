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
 * CreatePostPage
 * -------------------------------------------------------------------
 * Compose-first: the page opens straight into the composer (heading,
 * media collage, title, story). The device camera is a single on-demand
 * overlay, opened from the "Add media" / "Take a photo" controls, and it
 * hands its result to the exact same compress/upload pipeline every other
 * photo or video on this page uses.
 *
 * Capture overlay behavior (Instagram-style):
 *   • Tap the shutter  → takes a photo, freezes it into a Retake/Use review.
 *   • Press and hold   → starts recording video (with audio, mic permitting);
 *     releasing stops the recording and shows the same Retake/Use review,
 *     just with a video instead of a still.
 *   • "Use" hands the resulting File to the same handleFiles() path that
 *     gallery picks and pastes already go through — no separate code path.
 *   • The overlay's own height adapts to whatever vertical space is left
 *     above the app's bottom navigation (it never assumes a fixed aspect
 *     ratio), and it renders on a z-index high enough to sit above that
 *     nav rather than needing the nav hidden while the camera is open.
 *   • If the camera (or mic) is unavailable/denied, the overlay always
 *     offers a way out: pick from the gallery, or fall back to the OS
 *     camera app.
 *
 * Everything below capture — validation, compression, signed Cloudinary
 * upload, progress tracking, cancel-in-flight, post creation — is untouched.
 *
 * VISUAL LANGUAGE:
 *  • Matches the app's dark-charcoal / gold-yellow onboarding screens: flat
 *    matte cards (no blur/glass), a single accent yellow used for CTAs,
 *    labels and progress, dashed yellow borders on empty upload slots, and
 *    a big full-width CTA pinned above the bottom navigation.
 *  • The media picker is a five-slot collage (one large slot + two stacked
 *    slots beside it + two along the bottom) rather than a uniform grid —
 *    it mirrors the onboarding "Upload Your Photos" layout so the two
 *    screens feel like the same product.
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

// ---- capture overlay tuning -----------------------------------------
// How long a shutter press has to be held before it turns into a video
// recording instead of a photo tap — matches the feel of Instagram/Stories.
const LONG_PRESS_MS = 280
// Hard ceiling on a single in-app recording so nobody accidentally uploads
// a multi-minute clip through the "hold the button" gesture.
const MAX_RECORD_MS = 60 * 1000
// Height reserved at the bottom of the viewport for the app's own bottom
// navigation, plus whatever the device's home-indicator/safe-area needs.
// Bump BOTTOM_NAV_HEIGHT if the real nav bar's height ever changes — every
// fixed/overlay element on this page (capture overlay, lightbox, bottom
// CTA bar) reads from this one constant so they all clear the nav the
// same way instead of each guessing their own number.
const BOTTOM_NAV_HEIGHT = 64
const BOTTOM_CLEARANCE = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)`
const TOP_CLEARANCE = 'calc(env(safe-area-inset-top, 0px) + 12px)'
// Any overlay that needs to sit above the app's persistent bottom nav uses
// this z-index. It's deliberately much higher than any in-page chrome so a
// nav bar with its own stacking context can never render on top of it —
// that's what actually fixes "the camera overlaps the nav", not hiding it.
const OVERLAY_Z = 9999

// ---- brand palette (flat, matches the onboarding screens) -----------
const ACCENT = '#FFC629'
const ACCENT_STRONG = '#F5B700'
const INK = '#141416' // page background
const SURFACE = '#1D1D20' // card background
const SURFACE_SOFT = '#232326'
const BORDER = 'rgba(255,255,255,0.09)'
const TEXT_PRIMARY = '#F5F5F3'
const TEXT_MUTED = 'rgba(245,245,243,0.55)'
const TEXT_FAINT = 'rgba(245,245,243,0.38)'

// A dark, glassy control used for buttons that float over the live camera
// feed or a photo — kept from the previous camera chrome since it's read
// against live video, not against the app's flat surfaces.
const scrimControl = {
  background: 'rgba(20,20,22,0.5)',
  borderColor: 'rgba(255,255,255,0.2)',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.25) inset',
}
const scrimShadow = '0 20px 50px -22px rgba(0,0,0,0.6)'

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

// Picks the best-supported mimeType for MediaRecorder, preferring mp4/h264
// (plays natively everywhere) and falling back through webm variants.
function pickRecorderMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return candidates.find((type) => window.MediaRecorder.isTypeSupported?.(type)) || ''
}

// The five collage slots, in the order they fill. `area` maps each slot to
// a named cell in the CSS grid below — one big slot, two stacked beside it,
// two smaller ones along the bottom.
const COLLAGE_AREAS = ['big', 'small1', 'small2', 'wide', 'small3']

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

  // ---- capture overlay: opened on demand from "Add media" / "Take a
  // photo" — never the page's default screen.
  const camVideoRef = useRef(null)
  const camStreamRef = useRef(null)
  const camCanvasRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [camFacing, setCamFacing] = useState('environment')
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)
  const [shutterFlash, setShutterFlash] = useState(false)
  // A captured-but-not-yet-accepted shot, shown as a Retake/Use review.
  // kind distinguishes a still frame from a recorded clip so the review UI
  // and the eventual File() both handle it correctly.
  const [capturedShot, setCapturedShot] = useState(null) // { blob, previewUrl, kind: 'photo'|'video', durationSec? } | null
  // Press-and-hold video recording state
  const pressTimerRef = useRef(null)
  const recordingRef = useRef(false) // synchronous flag — avoids stale-closure races with pointer events
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordMimeRef = useRef('')
  const recordIntervalRef = useRef(null)
  const maxRecordTimeoutRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)

  // Holds the AbortController for whatever's currently in flight (Cloudinary
  // upload(s) or the final post-create call) so Cancel can actually stop it.
  const abortControllerRef = useRef(null)
  // Caches the Cloudinary signature for a few minutes so Post doesn't have to
  // wait on a fresh fetch on top of the actual upload.
  const signatureRef = useRef(null) // { promise, timestamp }
  const remainingSlots = MAX_MEDIA - mediaItems.length
  const anyCompressing = mediaItems.some(item => item.compressing)
  const previewIndex = mediaItems.findIndex(item => item.id === previewId)
  const previewItem = previewIndex >= 0 ? mediaItems[previewIndex] : null
  const lastShotPreview = mediaItems[mediaItems.length - 1]?.preview || null
  // Simple "how filled out is this post" measure, shown as the thin bar
  // under the header — same visual motif as the onboarding steps.
  const progressFraction = (
    (title.trim() ? 1 : 0) + (content.trim() ? 1 : 0) + (mediaItems.length > 0 ? 1 : 0)
  ) / 3

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
  // This is the single entry point for gallery picks, pastes, and anything
  // accepted out of the capture overlay — they all become plain Files here.
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
  // Files picked via the shared gallery/OS-camera inputs.
  const onFilesPicked = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
    // These are an escape hatch out of the capture overlay (used when the
    // camera/mic isn't available) — close it once a file's been chosen.
    if (cameraOpen) setCameraOpen(false)
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
  // Drives the capture overlay only — the stream lives and dies with
  // `cameraOpen`.
  const stopCameraStream = useCallback(() => {
    camStreamRef.current?.getTracks().forEach(t => t.stop())
    camStreamRef.current = null
  }, [])

  useEffect(() => {
    if (!cameraOpen) return
    let cancelled = false
    setCamReady(false)
    setCamError(false)
    ;(async () => {
      const videoConstraints = { facingMode: camFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      let stream = null
      // Ask for mic + camera together first so press-and-hold recording can
      // start instantly with no extra permission round-trip. If the mic is
      // denied (or simply unavailable) fall back to video-only — photos
      // still work fine, video recording just won't have sound.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true })
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
        } catch (err2) {
          console.error('Camera unavailable', err2)
          if (!cancelled) setCamError(true)
          return
        }
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      stopCameraStream()
      camStreamRef.current = stream
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = stream
        await camVideoRef.current.play().catch(() => {})
      }
      if (!cancelled) setCamReady(true)
    })()
    return () => {
      cancelled = true
      stopCameraStream()
    }
  }, [cameraOpen, camFacing, stopCameraStream])

  // Closes the capture overlay and cleans up everything it touched: any
  // in-progress recording, the frozen review frame, and the camera/mic
  // stream itself.
  const closeCameraModal = () => {
    if (recordingRef.current) {
      mediaRecorderRef.current?.stop()
      recordingRef.current = false
    }
    clearInterval(recordIntervalRef.current)
    clearTimeout(maxRecordTimeoutRef.current)
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
    setIsRecording(false)
    setRecordSeconds(0)
    if (capturedShot?.previewUrl) URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
    setCameraOpen(false)
    setCamReady(false)
    setCamError(false)
  }

  // Freezes the current frame into a review step (Retake / Use) — nothing
  // is added to the post until the person explicitly accepts it.
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
      setCapturedShot({ blob, previewUrl: URL.createObjectURL(blob), kind: 'photo' })
    }, 'image/jpeg', 0.92)
  }

  // ---- press-and-hold video recording --------------------------------
  const startRecording = () => {
    const stream = camStreamRef.current
    if (!stream || recordingRef.current) return
    recordedChunksRef.current = []
    recordMimeRef.current = pickRecorderMimeType()
    try {
      const recorder = new MediaRecorder(stream, recordMimeRef.current ? { mimeType: recordMimeRef.current } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        clearInterval(recordIntervalRef.current)
        clearTimeout(maxRecordTimeoutRef.current)
        recordingRef.current = false
        setIsRecording(false)
        const blob = new Blob(recordedChunksRef.current, { type: recordMimeRef.current || 'video/webm' })
        recordedChunksRef.current = []
        if (blob.size > 0) {
          setCapturedShot({
            blob,
            previewUrl: URL.createObjectURL(blob),
            kind: 'video',
            durationSec: recordSeconds,
          })
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      recordingRef.current = true
      setIsRecording(true)
      setRecordSeconds(0)
      recordIntervalRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
      // Auto-stop so a stuck/forgotten hold can't produce a huge clip.
      maxRecordTimeoutRef.current = setTimeout(() => {
        if (recordingRef.current) mediaRecorderRef.current?.stop()
      }, MAX_RECORD_MS)
    } catch (err) {
      console.error('Recording failed to start', err)
      recordingRef.current = false
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      recordingRef.current = false
      setIsRecording(false)
    }
  }

  // Tap → photo, hold past LONG_PRESS_MS → video. Handled with a single
  // timer so a quick tap never has to know recording exists.
  const handleShutterDown = (e) => {
    e.preventDefault()
    if (!camReady || capturedShot) return
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null
      startRecording()
    }, LONG_PRESS_MS)
  }
  const handleShutterUp = () => {
    if (pressTimerRef.current) {
      // Released before the long-press threshold — it was a tap.
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
      capturePhoto()
      return
    }
    if (recordingRef.current) stopRecording()
  }
  // Pointer sliding off the button while held should behave like a release,
  // not leave a recording stuck running forever.
  const handleShutterCancel = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
    if (recordingRef.current) stopRecording()
  }

  const retakeCapture = () => {
    if (capturedShot?.previewUrl) URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
  }

  // Accepts the reviewed shot — photo or video — turns it into a File and
  // runs it through the exact same pipeline as any gallery pick, then
  // closes the overlay.
  const useCapturedShot = () => {
    if (!capturedShot) return
    const { blob, kind } = capturedShot
    const file = kind === 'video'
      ? new File([blob], `capture_${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`, { type: blob.type || 'video/webm' })
      : new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
    handleFiles([file])
    URL.revokeObjectURL(capturedShot.previewUrl)
    setCapturedShot(null)
    setCameraOpen(false)
  }

  const flipCamera = () => {
    if (recordingRef.current) stopRecording()
    setCamFacing(f => (f === 'user' ? 'environment' : 'user'))
  }

  const recordLabel = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ---- capture overlay UI --------------------------------------------
  // The card is a flex COLUMN with a flexible video area (`flex-1 min-h-0`)
  // and a fixed-height control strip below it. That's what makes it fit
  // any leftover height above the bottom nav — on a short viewport the
  // video area just shrinks (and crops via object-cover), instead of the
  // whole card overflowing past the nav or getting squeezed into a tiny
  // box the way a fixed aspect-ratio card does.
  const renderCaptureOverlay = () => (
    <div
      className="relative w-full h-full max-w-md flex flex-col rounded-[32px] overflow-hidden border p-1.5"
      style={{ background: 'rgba(10,10,10,0.7)', borderColor: 'rgba(255,255,255,0.14)', boxShadow: scrimShadow }}
    >
      <div className="relative flex-1 min-h-0 rounded-[26px] overflow-hidden">
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
                style={{ background: ACCENT, color: '#171717' }}
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
            </div>
          </div>
        )}

        {/* Frozen review frame — shown after a tap (photo) or a hold (video),
            before Retake/Use. Videos play back muted+looping so the review
            still reads as "this is what you captured" without extra chrome. */}
        <AnimatePresence>
          {capturedShot && (
            capturedShot.kind === 'video' ? (
              <motion.video
                key="review-video"
                src={capturedShot.previewUrl}
                autoPlay
                loop
                muted
                playsInline
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <motion.img
                key="review-photo"
                src={capturedShot.previewUrl}
                alt="Captured preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          )}
        </AnimatePresence>

        {!camReady && !camError && !capturedShot && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="rounded-full h-6 w-6 border-2 block"
              style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: ACCENT }}
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

        {/* Recording indicator — timer + pulsing dot, top-center */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border"
              style={{ background: 'rgba(20,20,22,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2 h-2 rounded-full block"
                style={{ background: '#ef4444' }}
              />
              <span className="text-xs font-bold tabular-nums" style={{ color: 'white' }}>
                {recordLabel(recordSeconds)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top controls — hidden while reviewing or recording */}
        {!capturedShot && !isRecording && (
          <>
            <button
              onClick={closeCameraModal}
              aria-label="Close camera"
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
              style={scrimControl}
            >
              <FiX size={18} color="white" />
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
          </>
        )}
      </div>

      {/* Bottom controls — fixed height; the video area above shrinks to
          leave room for this, so it's never the thing that gets cut off. */}
      {!camError && (
        <div className="flex-none flex items-center justify-center py-4 px-8">
          {capturedShot ? (
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={retakeCapture}
                className="px-5 h-11 rounded-full text-sm font-bold border backdrop-blur-xl"
                style={{ ...scrimControl, color: 'white' }}
              >
                Retake
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={useCapturedShot}
                className="flex items-center gap-1.5 px-6 h-11 rounded-full text-sm font-bold"
                style={{ background: ACCENT, color: '#171717' }}
              >
                <FiCheck size={15} strokeWidth={3} /> {capturedShot.kind === 'video' ? 'Use Video' : 'Use Photo'}
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
                disabled={isRecording}
              >
                {lastShotPreview ? (
                  <img src={lastShotPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiImage size={18} color="white" />
                )}
              </motion.button>
              {/* Tap = photo, press & hold = video. touch-action:none stops
                  the browser from treating the hold as a scroll/selection
                  gesture on mobile. */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onPointerDown={handleShutterDown}
                onPointerUp={handleShutterUp}
                onPointerLeave={handleShutterCancel}
                onPointerCancel={handleShutterCancel}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!camReady}
                aria-label="Hold to record, tap for photo"
                className="rounded-full disabled:opacity-40 select-none flex-none"
                style={{
                  width: 68,
                  height: 68,
                  touchAction: 'none',
                  background: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isRecording
                    ? '0 0 0 2px rgba(239,68,68,0.95), 0 0 0 6px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
                    : `0 0 0 2px ${ACCENT}, 0 0 0 6px rgba(255,198,41,0.18), inset 0 1px 0 rgba(255,255,255,0.5)`,
                }}
              >
                <motion.span
                  animate={isRecording ? { borderRadius: '10px', width: 26, height: 26 } : { borderRadius: '999px', width: 54, height: 54 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="block"
                  style={{ margin: '0 auto', background: isRecording ? '#ef4444' : '#fff' }}
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={flipCamera}
                aria-label="Flip camera"
                className="w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl"
                style={scrimControl}
                disabled={isRecording}
              >
                <FiRotateCw size={18} color="white" />
              </motion.button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ---- media collage slot -------------------------------------------
  // Renders one of the five fixed collage cells. `area` names the CSS grid
  // area it occupies (see the grid below). If media already fills this
  // index, show the thumbnail; if this is the next empty slot, show the
  // dashed "add" placeholder; otherwise show an inert dashed placeholder.
  const CollageSlot = ({ area, index }) => {
    const item = mediaItems[index]
    const isNextEmpty = !item && index === mediaItems.length
    if (item) {
      const { id, preview, compressing, isVideo } = item
      return (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ gridArea: area, background: SURFACE_SOFT, borderColor: BORDER }}
          className="relative rounded-2xl overflow-hidden border"
          onClick={() => preview && !compressing && setPreviewId(id)}
        >
          {preview ? (
            <motion.img
              src={preview}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full object-cover cursor-zoom-in"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="rounded-full h-5 w-5 border-2 block"
                style={{ borderColor: BORDER, borderTopColor: ACCENT }}
              />
            </div>
          )}
          {compressing && preview && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="rounded-full h-5 w-5 border-2 block"
                style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}
              />
            </div>
          )}
          {isVideo && preview && !compressing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <FiPlay size={13} color="white" fill="white" style={{ marginLeft: 1 }} />
              </div>
            </div>
          )}
          <button
            onClick={(e) => removeMedia(id, e)}
            aria-label="Remove media"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}
          >
            <FiX size={12} color="#171717" strokeWidth={2.5} />
          </button>
        </motion.div>
      )
    }
    return (
      <motion.button
        type="button"
        layout
        whileTap={{ scale: 0.97 }}
        style={{ gridArea: area, borderColor: 'rgba(255,198,41,0.45)' }}
        className="relative rounded-2xl border-2 border-dashed flex items-center justify-center"
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        <FiImage size={area === 'big' ? 26 : 16} color={ACCENT} strokeWidth={2} />
        {area === 'big' && (
          <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
            {isNextEmpty ? 'Add photos' : ''}
          </span>
        )}
      </motion.button>
    )
  }

  // ---- render ------------------------------------------------------
  return (
    <div className="min-h-screen relative" style={{ background: INK }}>
      {/* Shared canvas + hidden inputs — used by the capture overlay and by
          the ordinary gallery / OS-camera-app pickers. */}
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

      {/* Top bar — back arrow + thin progress bar, matching the onboarding
          screens' header. No blur/glass here; flat charcoal. */}
      <header
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: INK, paddingTop: TOP_CLEARANCE }}
      >
        <div className="flex items-center justify-between mb-3">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 flex items-center justify-center rounded-full"
            style={{ color: TEXT_PRIMARY, background: SURFACE }}
          >
            <FiArrowLeft size={18} strokeWidth={2.4} />
          </motion.button>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_FAINT }}>
            Draft
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: SURFACE_SOFT }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: ACCENT }}
            initial={false}
            animate={{ width: `${Math.max(8, progressFraction * 100)}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
      </header>

      {/* Full-screen upload overlay — visible while the request is actually in flight.
          Includes a Cancel button that aborts the real network transfer via
          AbortController, not just a fake UI dismiss. */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-64 rounded-[28px] px-6 py-7 flex flex-col items-center gap-4 border"
              style={{ background: SURFACE, borderColor: BORDER }}
            >
              <div className="relative w-16 h-16 rounded-full border flex items-center justify-center"
                style={{ background: SURFACE_SOFT, borderColor: BORDER }}
              >
                <svg width="56" height="56" viewBox="0 0 64 64" className="-rotate-90 absolute">
                  <circle cx="32" cy="32" r="27" fill="none" stroke={SURFACE_SOFT} strokeWidth="5" />
                  <motion.circle
                    cx="32" cy="32" r="27" fill="none" stroke={ACCENT} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 27}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - uploadProgress / 100) }}
                    transition={{ ease: 'linear', duration: 0.15 }}
                  />
                </svg>
                <div className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                  {uploadProgress}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                  {uploadStage === 'cancelling'
                    ? 'Cancelling…'
                    : uploadStage === 'saving'
                    ? 'Saving post…'
                    : uploadProgress < 100
                    ? 'Uploading…'
                    : 'Almost done…'}
                </p>
                {mediaItems.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                    {mediaItems.length} media item{mediaItems.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleCancel}
                disabled={uploadStage === 'cancelling'}
                className="px-4 py-2 rounded-full text-xs font-bold border disabled:opacity-50"
                style={{ background: SURFACE_SOFT, color: TEXT_PRIMARY, borderColor: BORDER }}
              >
                {uploadStage === 'cancelling' ? 'Cancelling…' : 'Cancel'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body — bottom padding reserves room for the fixed CTA bar below. */}
      <main
        className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-2"
        style={{ paddingBottom: `calc(${BOTTOM_CLEARANCE} + 84px)` }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight mb-4" style={{ color: TEXT_PRIMARY }}>
          New post
        </h1>

        {/* Media collage — one big slot, two stacked beside it, two along
            the bottom. Mirrors the "Upload Your Photos" onboarding layout. */}
        <section className="mb-6">
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(2, 84px) 84px',
              gridTemplateAreas: `"big big small1" "big big small2" "wide wide small3"`,
            }}
          >
            {COLLAGE_AREAS.map((area, i) => (
              <CollageSlot key={area} area={area} index={i} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2.5 px-0.5">
            <span className="text-[11px] font-semibold" style={{ color: TEXT_FAINT }}>
              {mediaItems.length} / {MAX_MEDIA} media
              {anyCompressing && <span style={{ color: ACCENT }}> · optimizing…</span>}
            </span>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setCameraOpen(true)}
              disabled={remainingSlots <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-40"
              style={{ background: SURFACE, color: TEXT_PRIMARY }}
            >
              <FiCamera size={13} color={ACCENT} /> Take a photo or video
            </motion.button>
          </div>
          <AnimatePresence>
            {justPasted && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ background: ACCENT, color: '#171717' }}
              >
                <FiClipboard size={12} /> Pasted
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Title */}
        <section className="rounded-[24px] border px-5 py-4" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: ACCENT }}>
              Title
            </span>
            <span className="flex-1 h-px" style={{ background: BORDER }} />
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
            style={{ color: TEXT_PRIMARY }}
          />
          <div className="flex justify-between items-center mt-1.5 min-h-[18px]">
            <AnimatePresence mode="wait">
              {errors.title ? (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-400 font-medium"
                >
                  {errors.title}
                </motion.p>
              ) : <span key="ph" />}
            </AnimatePresence>
            <CharCounter value={title.length} max={100} />
          </div>
        </section>

        {/* Content */}
        <section className="mt-3 rounded-[24px] border px-5 py-4" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: ACCENT }}>
              Story
            </span>
            <span className="flex-1 h-px" style={{ background: BORDER }} />
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
            style={{ color: TEXT_MUTED }}
          />
          <AnimatePresence>
            {errors.content && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-red-400 font-medium"
              >
                {errors.content}
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: TEXT_FAINT }}>
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border" style={{ background: SURFACE, borderColor: BORDER }}>⌘</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border" style={{ background: SURFACE, borderColor: BORDER }}>Enter</kbd>
          <span>to post</span>
        </div>
      </main>

      {/* Bottom CTA — pinned above the app's bottom nav, same clearance
          math the capture overlay and lightbox use, so it never overlaps
          nav chrome that lives outside this component. */}
      <div
        className="fixed left-0 right-0 z-30 px-4"
        style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}
      >
        <div className="max-w-2xl mx-auto pb-3 pt-2" style={{ background: `linear-gradient(to top, ${INK} 60%, transparent)` }}>
          <PostButton canPost={canPost} loading={loading} uploadProgress={uploadProgress} onClick={handleSubmit} />
        </div>
      </div>

      {/* Capture overlay — sized to whatever vertical space is left above
          the bottom nav (see renderCaptureOverlay), and rendered at
          OVERLAY_Z so it always sits above that nav instead of needing it
          hidden. */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', paddingTop: TOP_CLEARANCE, paddingBottom: BOTTOM_CLEARANCE, zIndex: OVERLAY_Z }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md h-full"
            >
              {renderCaptureOverlay()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox preview — tap any collage tile to open a full-size view
          with prev/next when there's more than one item, and a way to
          remove it. Same z-index/clearance treatment as the capture overlay. */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.88)', paddingTop: TOP_CLEARANCE, paddingBottom: BOTTOM_CLEARANCE, zIndex: OVERLAY_Z }}
            onClick={() => setPreviewId(null)}
          >
            <button
              onClick={() => setPreviewId(null)}
              aria-label="Close preview"
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
              style={scrimControl}
            >
              <FiX size={18} color="white" />
            </button>
            {mediaItems.length > 1 && (
              <span className="absolute top-5 left-5 text-xs font-semibold px-2.5 py-1 rounded-full text-white border backdrop-blur-xl"
                style={scrimControl}>
                {previewIndex + 1} / {mediaItems.length}
              </span>
            )}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0" onClick={(e) => e.stopPropagation()}>
              {previewIndex > 0 && (
                <button
                  onClick={() => setPreviewId(mediaItems[previewIndex - 1].id)}
                  aria-label="Previous"
                  className="absolute left-2 z-10 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                  style={scrimControl}
                >
                  <FiChevronLeft size={18} color="white" />
                </button>
              )}
              <img
                src={previewItem.preview}
                alt=""
                className="max-w-full max-h-full rounded-[24px] object-contain"
              />
              {previewIndex < mediaItems.length - 1 && (
                <button
                  onClick={() => setPreviewId(mediaItems[previewIndex + 1].id)}
                  aria-label="Next"
                  className="absolute right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-xl"
                  style={scrimControl}
                >
                  <FiChevronRight size={18} color="white" />
                </button>
              )}
            </div>
            <div className="flex-none flex items-center gap-3 pt-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => removeMedia(previewItem.id, e)}
                className="flex items-center gap-1.5 px-5 h-10 rounded-full text-sm font-semibold border backdrop-blur-xl"
                style={{ background: 'rgba(239,68,68,0.18)', color: '#ff6b6b', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <FiTrash2 size={14} /> Remove
              </button>
              <button
                onClick={() => setPreviewId(null)}
                className="px-5 h-10 rounded-full text-sm font-semibold text-white border backdrop-blur-xl"
                style={scrimControl}
              >
                Done
              </button>
            </div>
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
      whileHover={canPost ? { scale: 1.015 } : {}}
      whileTap={canPost ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={!canPost}
      className="relative w-full h-14 rounded-full font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: canPost ? ACCENT : SURFACE,
        color: canPost ? '#171717' : TEXT_MUTED,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative flex items-center justify-center gap-2"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              className="rounded-full h-4 w-4 border-2 border-current border-t-transparent block"
            />
            {uploadProgress > 0 ? `${uploadProgress}%` : 'Posting'}
          </motion.span>
        ) : (
          <motion.span
            key="post"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative flex items-center justify-center gap-1.5"
          >
            <FiCheck size={16} strokeWidth={3} /> Post
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
function CharCounter({ value, max }) {
  const pct = Math.min(1, value / max)
  const color = pct > 0.9 ? '#f87171' : pct > 0.7 ? ACCENT : TEXT_FAINT
  const circumference = 2 * Math.PI * 7
  return (
    <div className="flex items-center gap-1.5">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7" fill="none" stroke={BORDER} strokeWidth="1.5" />
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