// import { useState, useRef, useEffect, useCallback } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
// import { FiImage, FiX, FiCamera, FiArrowLeft, FiClipboard, FiCheck, FiPlus, FiPlay } from 'react-icons/fi'
// import { postsAPI, uploadAPI, uploadMediaDirect } from '../api'
// import toast from 'react-hot-toast'

// const MAX_MEDIA = 5
// const MAX_DIMENSION = 1600
// const JPEG_QUALITY = 0.82
// const MAX_IMAGE_SIZE = 10 * 1024 * 1024
// const MAX_VIDEO_SIZE = 100 * 1024 * 1024
// // How long we trust a prefetched signature before treating it as stale and
// // re-fetching. Keep this comfortably shorter than the backend's actual
// // signature TTL — this is just about not reusing a signature after the user
// // has been sitting on the compose screen for ages.
// const SIGNATURE_TTL = 8 * 60 * 1000

// let idSeq = 0
// const nextId = () => `media_${Date.now()}_${idSeq++}`

// function compressImage(file) {
//   return new Promise((resolve) => {
//     if (!file.type.startsWith('image/')) {
//       resolve(file)
//       return
//     }
//     const img = new window.Image()
//     const url = URL.createObjectURL(file)
//     img.onload = () => {
//       URL.revokeObjectURL(url)
//       let { width, height } = img
//       if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
//         if (width > height) {
//           height = Math.round((height * MAX_DIMENSION) / width)
//           width = MAX_DIMENSION
//         } else {
//           width = Math.round((width * MAX_DIMENSION) / height)
//           height = MAX_DIMENSION
//         }
//       }
//       const canvas = document.createElement('canvas')
//       canvas.width = width
//       canvas.height = height
//       const ctx = canvas.getContext('2d')
//       ctx.drawImage(img, 0, 0, width, height)
//       canvas.toBlob((blob) => {
//         if (!blob) { resolve(file); return }
//         if (blob.size >= file.size) { resolve(file); return }
//         resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
//       }, 'image/jpeg', JPEG_QUALITY)
//     }
//     img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
//     img.src = url
//   })
// }

// function generateVideoThumbnail(file) {
//   return new Promise((resolve) => {
//     const video = document.createElement('video')
//     video.preload = 'metadata'
//     video.muted = true
//     video.playsInline = true
//     const url = URL.createObjectURL(file)
//     video.src = url

//     const cleanup = () => URL.revokeObjectURL(url)
//     const timeout = setTimeout(() => { cleanup(); resolve(null) }, 8000)

//     video.onloadedmetadata = () => {
//       video.currentTime = Math.min(0.3, (video.duration || 1) / 4)
//     }
//     video.onseeked = () => {
//       clearTimeout(timeout)
//       const canvas = document.createElement('canvas')
//       canvas.width = video.videoWidth || MAX_DIMENSION
//       canvas.height = video.videoHeight || MAX_DIMENSION
//       const ctx = canvas.getContext('2d')
//       ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
//       canvas.toBlob((blob) => {
//         cleanup()
//         if (!blob) { resolve(null); return }
//         const reader = new FileReader()
//         reader.onloadend = () => resolve(reader.result)
//         reader.onerror = () => resolve(null)
//         reader.readAsDataURL(blob)
//       }, 'image/jpeg', 0.8)
//     }
//     video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null) }
//   })
// }

// export default function CreatePostPage() {
//   const navigate = useNavigate()
//   const fileRef = useRef(null)
//   const titleRef = useRef(null)
//   const [title, setTitle] = useState('')
//   const [content, setContent] = useState('')
//   const [mediaItems, setMediaItems] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const [uploadStage, setUploadStage] = useState('uploading')
//   const [dragOver, setDragOver] = useState(false)
//   const [errors, setErrors] = useState({})
//   const [justPasted, setJustPasted] = useState(false)
//   const abortControllerRef = useRef(null)
//   // ── NEW: caches the in-flight/most-recent signature fetch so we don't wait
//   // on a fresh round-trip at submit time if we already warmed it up earlier.
//   const signatureRef = useRef(null) // { promise, timestamp }
//   const mx = useMotionValue(0)
//   const my = useMotionValue(0)
//   const rotateX = useTransform(my, [-40, 40], [4, -4])
//   const rotateY = useTransform(mx, [-40, 40], [-4, 4])
//   const remainingSlots = MAX_MEDIA - mediaItems.length
//   const anyCompressing = mediaItems.some(item => item.compressing)

//   const getCachedSignature = useCallback(() => {
//     const now = Date.now()
//     if (signatureRef.current && now - signatureRef.current.timestamp < SIGNATURE_TTL) {
//       return signatureRef.current.promise
//     }
//     const promise = uploadAPI.getSignature().then(res => res.data.data)
//     signatureRef.current = { promise, timestamp: now }
//     // If this particular fetch fails, don't leave a broken promise cached —
//     // let the next call (e.g. at actual submit time) try again fresh.
//     promise.catch(() => { if (signatureRef.current?.promise === promise) signatureRef.current = null })
//     return promise
//   }, [])

//   const validate = () => {
//     const e = {}
//     const t = title.trim()
//     if (t && t.length < 3) e.title = 'Title must be at least 3 characters'
//     else if (t.length > 100) e.title = 'Title must be under 100 characters'
//     if (!content.trim() && mediaItems.length === 0) e.content = 'Add a photo/video or a few words'
//     setErrors(e)
//     return Object.keys(e).length === 0
//   }

//   const handleFiles = useCallback((fileListLike) => {
//     const incoming = Array.from(fileListLike || [])
//     if (!incoming.length) return
//     if (remainingSlots <= 0) {
//       toast.error(`You can add up to ${MAX_MEDIA} media items`)
//       return
//     }
//     const accepted = []
//     for (const f of incoming) {
//       if (accepted.length >= remainingSlots) {
//         toast.error(`Only ${remainingSlots} more media item${remainingSlots === 1 ? '' : 's'} allowed`)
//         break
//       }
//       const isVideoFile = f.type.startsWith('video/')
//       const isImageFile = f.type.startsWith('image/')
//       if (!isImageFile && !isVideoFile) {
//         toast.error(`${f.name || 'File'} isn't an image or video`)
//         continue
//       }
//       const maxSize = isVideoFile ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
//       if (f.size > maxSize) {
//         const maxLabel = isVideoFile ? `${MAX_VIDEO_SIZE / (1024 * 1024)}MB` : `${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
//         toast.error(`${f.name || 'File'} is too large. Max ${maxLabel}`)
//         continue
//       }
//       accepted.push(f)
//     }
//     if (!accepted.length) return

//     // Warm the Cloudinary signature the moment the first file lands, so by
//     // the time the user finishes writing their caption and hits Post, that
//     // network round-trip is already done instead of adding to the wait.
//     if (mediaItems.length === 0) getCachedSignature()

//     setErrors(prev => ({ ...prev, content: '' }))
//     accepted.forEach((f) => {
//       const id = nextId()
//       const isVideo = f.type.startsWith('video/')
//       setMediaItems(prev => [...prev, { id, file: f, preview: null, compressing: true, isVideo }])
//       if (isVideo) {
//         ;(async () => {
//           const thumb = await generateVideoThumbnail(f)
//           setMediaItems(prev => prev.map(item => item.id === id
//             ? { ...item, preview: thumb, compressing: false }
//             : item))
//         })()
//       } else {
//         ;(async () => {
//           const compressed = await compressImage(f)
//           const reader = new FileReader()
//           reader.onloadend = () => {
//             setMediaItems(prev => prev.map(item => item.id === id
//               ? { ...item, file: compressed, preview: reader.result, compressing: false }
//               : item))
//           }
//           reader.readAsDataURL(compressed)
//         })()
//       }
//     })
//   }, [remainingSlots, mediaItems.length, getCachedSignature])

//   const handleDrop = (e) => {
//     e.preventDefault()
//     setDragOver(false)
//     handleFiles(e.dataTransfer.files)
//   }

//   const removeMedia = (id, e) => {
//     e?.stopPropagation()
//     setMediaItems(prev => {
//       const next = prev.filter(item => item.id !== id)
//       if (next.length === 0) signatureRef.current = null // nothing left to upload — drop the prefetch
//       return next
//     })
//     if (fileRef.current) fileRef.current.value = ''
//   }

//   useEffect(() => {
//     const onPaste = (e) => {
//       const items = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/'))
//       if (!items.length) return
//       const fs = items.map(i => i.getAsFile()).filter(Boolean)
//       if (fs.length) {
//         handleFiles(fs)
//         setJustPasted(true)
//         setTimeout(() => setJustPasted(false), 1600)
//       }
//     }
//     window.addEventListener('paste', onPaste)
//     return () => window.removeEventListener('paste', onPaste)
//   }, [handleFiles])

//   useEffect(() => {
//     const onKey = (e) => {
//       if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
//     }
//     window.addEventListener('keydown', onKey)
//     return () => window.removeEventListener('keydown', onKey)
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [title, content, mediaItems, loading])

//   useEffect(() => () => abortControllerRef.current?.abort(), [])

//   const canPost = Boolean((title.trim() || content.trim() || mediaItems.length > 0) && !loading && !anyCompressing)

//   const handleCancel = () => {
//     setUploadStage('cancelling')
//     abortControllerRef.current?.abort()
//   }

//   const handleSubmit = async () => {
//     if (!canPost || !validate()) return
//     setLoading(true)
//     setUploadProgress(0)
//     setUploadStage('uploading')
//     const controller = new AbortController()
//     abortControllerRef.current = controller
//     try {
//       let images = []
//       let videos = []

//       if (mediaItems.length > 0) {
//         // Reuses the prefetched signature warmed in handleFiles when possible.
//         const signatureData = await getCachedSignature()

//         const fileProgress = new Array(mediaItems.length).fill(0)
//         const updateOverall = () => {
//           const total = fileProgress.reduce((a, b) => a + b, 0)
//           setUploadProgress(Math.round(total / mediaItems.length))
//         }

//         const results = await Promise.all(
//           mediaItems.map(({ file }, i) =>
//             uploadMediaDirect({
//               file,
//               signatureData,
//               signal: controller.signal,
//               onProgress: (pct) => { fileProgress[i] = pct; updateOverall() },
//             })
//           )
//         )

//         mediaItems.forEach((item, i) => {
//           if (item.isVideo) videos.push(results[i])
//           else images.push(results[i])
//         })
//       }

//       setUploadStage('saving')
//       const payload = { images, videos }
//       if (title.trim()) payload.title = title.trim()
//       if (content.trim()) payload.content = content.trim()
//       else if (mediaItems.length) payload.content = ' '

//       await postsAPI.create(payload, { signal: controller.signal })

//       toast.success('Posted 🎉')
//       navigate('/')
//     } catch (err) {
//       if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
//         toast('Upload cancelled')
//       } else {
//         console.error(err)
//         toast.error(err.response?.data?.message || 'Failed to create post')
//       }
//     } finally {
//       setLoading(false)
//       setUploadProgress(0)
//       setUploadStage('uploading')
//       abortControllerRef.current = null
//       signatureRef.current = null // signature is single-use in most Cloudinary setups — don't reuse across posts
//     }
//   }

//   return (
//     <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
//       <motion.div
//         aria-hidden
//         className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
//         style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 60%)' }}
//         animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
//         transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
//       />
//       <motion.div
//         aria-hidden
//         className="pointer-events-none absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
//         style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 60%)' }}
//         animate={{ x: [0, -20, 30, 0], y: [0, 20, -10, 0] }}
//         transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
//       />
//       <motion.header
//         initial={{ y: -20, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ type: 'spring', stiffness: 260, damping: 26 }}
//         className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
//         style={{
//           background: 'color-mix(in oklab, var(--bg-primary) 72%, transparent)',
//           borderColor: 'var(--border)',
//         }}
//       >
//         <motion.button
//           whileHover={{ scale: 1.06, x: -2 }}
//           whileTap={{ scale: 0.92 }}
//           onClick={() => navigate(-1)}
//           aria-label="Back"
//           className="w-10 h-10 flex items-center justify-center rounded-full"
//           style={{ color: 'var(--text-primary)' }}
//         >
//           <FiArrowLeft size={20} strokeWidth={2.4} />
//         </motion.button>
//         <div className="flex flex-col items-center leading-tight">
//           <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New post</h1>
//           <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
//             Draft
//           </span>
//         </div>
//         <PostButton canPost={canPost} loading={loading} uploadProgress={uploadProgress} onClick={handleSubmit} />
//       </motion.header>
//       <AnimatePresence>
//         {loading && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
//             style={{ background: 'rgba(0,0,0,0.45)' }}
//           >
//             <motion.div
//               initial={{ scale: 0.92, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.92, opacity: 0 }}
//               className="w-64 rounded-3xl px-6 py-6 flex flex-col items-center gap-4"
//               style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
//             >
//               <div className="relative w-16 h-16">
//                 <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
//                   <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="5" />
//                   <motion.circle
//                     cx="32" cy="32" r="27" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round"
//                     strokeDasharray={2 * Math.PI * 27}
//                     initial={false}
//                     animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - uploadProgress / 100) }}
//                     transition={{ ease: 'linear', duration: 0.15 }}
//                   />
//                 </svg>
//                 <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
//                   {uploadProgress}%
//                 </div>
//               </div>
//               <div className="text-center">
//                 <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
//                   {uploadStage === 'cancelling'
//                     ? 'Cancelling…'
//                     : uploadStage === 'saving'
//                     ? 'Saving post…'
//                     : uploadProgress < 100
//                     ? 'Uploading…'
//                     : 'Almost done…'}
//                 </p>
//                 {mediaItems.length > 0 && (
//                   <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
//                     {mediaItems.length} media item{mediaItems.length > 1 ? 's' : ''}
//                   </p>
//                 )}
//               </div>
//               <motion.button
//                 whileHover={{ scale: 1.04 }}
//                 whileTap={{ scale: 0.96 }}
//                 onClick={handleCancel}
//                 disabled={uploadStage === 'cancelling'}
//                 className="px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50"
//                 style={{
//                   background: 'var(--bg-secondary)',
//                   color: 'var(--text-primary)',
//                   border: '1px solid var(--border)',
//                 }}
//               >
//                 {uploadStage === 'cancelling' ? 'Cancelling…' : 'Cancel'}
//               </motion.button>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       <motion.main
//         initial="hidden"
//         animate="show"
//         variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
//         className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
//       >
//         <motion.section
//           variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
//           className="mb-8"
//         >
//           <AnimatePresence mode="wait">
//             {mediaItems.length > 0 ? (
//               <motion.div
//                 key="grid"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="space-y-3"
//               >
//                 <div className="flex items-center justify-between">
//                   <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
//                     {mediaItems.length} / {MAX_MEDIA} media
//                     {anyCompressing && <span style={{ color: '#f59e0b' }}> · optimizing…</span>}
//                   </span>
//                   {justPasted && (
//                     <motion.div
//                       initial={{ opacity: 0, y: -6, scale: 0.9 }}
//                       animate={{ opacity: 1, y: 0, scale: 1 }}
//                       exit={{ opacity: 0, y: -6, scale: 0.9 }}
//                       className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
//                       style={{ background: '#f59e0b', color: 'white' }}
//                     >
//                       <FiClipboard size={12} /> Pasted
//                     </motion.div>
//                   )}
//                 </div>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                   <AnimatePresence>
//                     {mediaItems.map(({ id, preview, file, compressing, isVideo }) => (
//                       <motion.div
//                         key={id}
//                         layout
//                         initial={{ opacity: 0, scale: 0.9 }}
//                         animate={{ opacity: 1, scale: 1 }}
//                         exit={{ opacity: 0, scale: 0.9 }}
//                         transition={{ type: 'spring', stiffness: 260, damping: 24 }}
//                         className="relative aspect-square rounded-2xl overflow-hidden group"
//                         style={{
//                           background: 'var(--bg-secondary)',
//                           boxShadow: '0 12px 30px -14px rgba(0,0,0,0.35)',
//                         }}
//                       >
//                         {preview ? (
//                           <motion.img
//                             src={preview}
//                             alt={file?.name || 'Preview'}
//                             initial={{ scale: 1.08, opacity: 0 }}
//                             animate={{ scale: 1, opacity: 1 }}
//                             transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
//                             className="w-full h-full object-cover"
//                           />
//                         ) : (
//                           <div className="w-full h-full flex items-center justify-center">
//                             <motion.span
//                               animate={{ rotate: 360 }}
//                               transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
//                               className="rounded-full h-5 w-5 border-2 block"
//                               style={{ borderColor: 'var(--border)', borderTopColor: '#f59e0b' }}
//                             />
//                           </div>
//                         )}
//                         {compressing && preview && (
//                           <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]" style={{ background: 'rgba(0,0,0,0.25)' }}>
//                             <motion.span
//                               animate={{ rotate: 360 }}
//                               transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
//                               className="rounded-full h-6 w-6 border-2 block"
//                               style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}
//                             />
//                           </div>
//                         )}
//                         {isVideo && preview && !compressing && (
//                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                             <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.5)' }}>
//                               <FiPlay size={16} color="white" fill="white" style={{ marginLeft: 2 }} />
//                             </div>
//                           </div>
//                         )}
//                         <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
//                         <motion.button
//                           whileHover={{ scale: 1.1 }}
//                           whileTap={{ scale: 0.9 }}
//                           onClick={(e) => removeMedia(id, e)}
//                           aria-label="Remove media"
//                           className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
//                           style={{ background: 'rgba(0,0,0,0.55)' }}
//                         >
//                           <FiX size={14} color="white" />
//                         </motion.button>
//                         {file && !compressing && (
//                           <div
//                             className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md"
//                             style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
//                           >
//                             {(file.size / 1024 / 1024).toFixed(1)} MB
//                           </div>
//                         )}
//                       </motion.div>
//                     ))}
//                     {remainingSlots > 0 && (
//                       <motion.button
//                         key="add-more"
//                         layout
//                         initial={{ opacity: 0, scale: 0.9 }}
//                         animate={{ opacity: 1, scale: 1 }}
//                         exit={{ opacity: 0, scale: 0.9 }}
//                         whileHover={{ scale: 1.03 }}
//                         whileTap={{ scale: 0.97 }}
//                         onClick={() => fileRef.current?.click()}
//                         className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5"
//                         style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
//                       >
//                         <FiPlus size={20} color="#f59e0b" />
//                         <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
//                           Add media
//                         </span>
//                       </motion.button>
//                     )}
//                   </AnimatePresence>
//                 </div>
//               </motion.div>
//             ) : (
//               <motion.div
//                 key="dropzone"
//                 initial={{ opacity: 0, scale: 0.98 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 exit={{ opacity: 0, scale: 0.98 }}
//                 transition={{ duration: 0.25 }}
//                 onClick={() => fileRef.current?.click()}
//                 onDrop={handleDrop}
//                 onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
//                 onDragLeave={() => setDragOver(false)}
//                 onMouseMove={(e) => {
//                   const r = e.currentTarget.getBoundingClientRect()
//                   mx.set(e.clientX - r.left - r.width / 2)
//                   my.set(e.clientY - r.top - r.height / 2)
//                 }}
//                 onMouseLeave={() => { mx.set(0); my.set(0) }}
//                 style={{
//                   borderColor: dragOver ? '#f59e0b' : 'var(--border)',
//                   background: dragOver
//                     ? 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))'
//                     : 'var(--bg-secondary)',
//                   rotateX,
//                   rotateY,
//                   transformPerspective: 1000,
//                 }}
//                 className="relative rounded-[28px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer py-16 sm:py-20 px-6 text-center"
//               >
//                 <motion.div
//                   animate={{
//                     scale: dragOver ? 1.15 : 1,
//                     rotate: dragOver ? [0, -6, 6, 0] : 0,
//                   }}
//                   transition={{ type: 'spring', stiffness: 300, damping: 18 }}
//                   className="w-16 h-16 rounded-2xl flex items-center justify-center"
//                   style={{
//                     background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
//                     boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
//                   }}
//                 >
//                   <FiImage size={28} color="#f59e0b" strokeWidth={2} />
//                 </motion.div>
//                 <div className="space-y-1">
//                   <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
//                     {dragOver ? 'Drop it here' : 'Add photos & videos'}
//                   </p>
//                   <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
//                     Drag & drop, click to browse, or <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
//                       style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>⌘V</kbd> to paste — up to {MAX_MEDIA}, mix photos and videos freely
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider"
//                   style={{ color: 'var(--text-muted)' }}>
//                   <span>PNG</span><span>·</span><span>JPG</span><span>·</span><span>WEBP</span><span>·</span><span>MP4</span><span>·</span><span>10MB photos / 100MB video</span>
//                 </div>
//                 <AnimatePresence>
//                   {justPasted && (
//                     <motion.div
//                       initial={{ opacity: 0, y: 10, scale: 0.9 }}
//                       animate={{ opacity: 1, y: 0, scale: 1 }}
//                       exit={{ opacity: 0, y: -10, scale: 0.9 }}
//                       className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
//                       style={{ background: '#f59e0b', color: 'white' }}
//                     >
//                       <FiClipboard size={12} /> Pasted
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </motion.div>
//             )}
//           </AnimatePresence>
//           <input
//             ref={fileRef}
//             type="file"
//             accept="image/*,video/*"
//             multiple
//             className="hidden"
//             onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
//           />
//         </motion.section>
//         <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
//           <div className="flex items-baseline gap-3 mb-2">
//             <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
//               Title
//             </span>
//             <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
//           </div>
//           <input
//             ref={titleRef}
//             type="text"
//             placeholder="Give it a name…"
//             value={title}
//             onChange={(e) => {
//               setTitle(e.target.value)
//               if (errors.title) setErrors(p => ({ ...p, title: '' }))
//             }}
//             maxLength={100}
//             className="w-full bg-transparent outline-none text-2xl sm:text-3xl font-extrabold tracking-tight"
//             style={{ color: 'var(--text-primary)' }}
//           />
//           <div className="flex justify-between items-center mt-1.5 min-h-[18px]">
//             <AnimatePresence mode="wait">
//               {errors.title ? (
//                 <motion.p
//                   key="err"
//                   initial={{ opacity: 0, x: -6 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0 }}
//                   className="text-xs text-red-500 font-medium"
//                 >
//                   {errors.title}
//                 </motion.p>
//               ) : <span key="ph" />}
//             </AnimatePresence>
//             <CharCounter value={title.length} max={100} />
//           </div>
//         </motion.section>
//         <motion.section
//           variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
//           className="mt-6"
//         >
//           <div className="flex items-baseline gap-3 mb-2">
//             <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
//               Story
//             </span>
//             <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
//           </div>
//           <textarea
//             placeholder="What's on your mind?"
//             value={content}
//             onChange={(e) => {
//               setContent(e.target.value)
//               if (errors.content) setErrors(p => ({ ...p, content: '' }))
//             }}
//             rows={6}
//             className="w-full bg-transparent outline-none text-[16px] resize-none leading-[1.7]"
//             style={{ color: 'var(--text-secondary)' }}
//           />
//           <AnimatePresence>
//             {errors.content && (
//               <motion.p
//                 initial={{ opacity: 0, y: -4 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -4 }}
//                 className="text-xs text-red-500 font-medium"
//               >
//                 {errors.content}
//               </motion.p>
//             )}
//           </AnimatePresence>
//         </motion.section>
//         <motion.div
//           variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
//           className="mt-10 flex items-center justify-center gap-2 text-xs"
//           style={{ color: 'var(--text-muted)' }}
//         >
//           <span>Press</span>
//           <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
//             style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>⌘</kbd>
//           <span>+</span>
//           <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
//             style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Enter</kbd>
//           <span>to post</span>
//         </motion.div>
//       </motion.main>
//     </div>
//   )
// }

// function PostButton({ canPost, loading, uploadProgress, onClick }) {
//   return (
//     <motion.button
//       whileHover={canPost ? { scale: 1.05 } : {}}
//       whileTap={canPost ? { scale: 0.94 } : {}}
//       onClick={onClick}
//       disabled={!canPost}
//       className="relative px-5 py-2 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
//       style={{
//         background: canPost
//           ? 'linear-gradient(135deg, #f59e0b, #f97316)'
//           : 'var(--bg-secondary)',
//         color: 'white',
//         boxShadow: canPost ? '0 8px 20px -8px rgba(245,158,11,0.6)' : 'none',
//       }}
//     >
//       {canPost && (
//         <motion.span
//           aria-hidden
//           className="absolute inset-0 opacity-0"
//           style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)' }}
//           animate={{ x: ['-120%', '120%'], opacity: [0, 1, 0] }}
//           transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
//         />
//       )}
//       <AnimatePresence mode="wait" initial={false}>
//         {loading ? (
//           <motion.span
//             key="loading"
//             initial={{ opacity: 0, y: 6 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -6 }}
//             className="relative flex items-center gap-1.5"
//           >
//             <motion.span
//               animate={{ rotate: 360 }}
//               transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
//               className="rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent block"
//             />
//             {uploadProgress > 0 ? `${uploadProgress}%` : 'Posting'}
//           </motion.span>
//         ) : (
//           <motion.span
//             key="post"
//             initial={{ opacity: 0, y: 6 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -6 }}
//             className="relative flex items-center gap-1"
//           >
//             <FiCheck size={14} strokeWidth={3} /> Post
//           </motion.span>
//         )}
//       </AnimatePresence>
//     </motion.button>
//   )
// }

// function CharCounter({ value, max }) {
//   const pct = Math.min(1, value / max)
//   const color = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : 'var(--text-muted)'
//   const circumference = 2 * Math.PI * 7
//   return (
//     <div className="flex items-center gap-1.5">
//       <svg width="18" height="18" viewBox="0 0 18 18">
//         <circle cx="9" cy="9" r="7" fill="none" stroke="var(--border)" strokeWidth="1.5" />
//         <motion.circle
//           cx="9" cy="9" r="7" fill="none"
//           stroke={color} strokeWidth="1.5" strokeLinecap="round"
//           strokeDasharray={circumference}
//           initial={false}
//           animate={{ strokeDashoffset: circumference * (1 - pct) }}
//           transition={{ type: 'spring', stiffness: 200, damping: 20 }}
//           transform="rotate(-90 9 9)"
//         />
//       </svg>
//       <motion.span
//         key={value}
//         initial={{ opacity: 0, y: -3 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="text-[11px] font-mono tabular-nums"
//         style={{ color }}
//       >
//         {value}/{max}
//       </motion.span>
//     </div>
//   )
// }




import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiZap, FiImage, FiCheck, FiArrowLeft, FiMapPin,
  FiUsers, FiMusic, FiPlay, FiChevronRight, FiRotateCw, FiCamera,
} from 'react-icons/fi'
import { postsAPI, uploadAPI, uploadMediaDirect } from '../api'
import toast from 'react-hot-toast'

const MAX_MEDIA = 5
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const SIGNATURE_TTL = 8 * 60 * 1000

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

function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'; video.muted = true; video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url
    const cleanup = () => URL.revokeObjectURL(url)
    const timeout = setTimeout(() => { cleanup(); resolve(null) }, 8000)
    video.onloadedmetadata = () => { video.currentTime = Math.min(0.3, (video.duration || 1) / 4) }
    video.onseeked = () => {
      clearTimeout(timeout)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || MAX_DIMENSION
      canvas.height = video.videoHeight || MAX_DIMENSION
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        cleanup()
        if (!blob) return resolve(null)
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.8)
    }
    video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null) }
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

  const [screen, setScreen] = useState('capture')
  const [mediaItems, setMediaItems] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [facing, setFacing] = useState('environment')
  const [flashOn, setFlashOn] = useState(false)
  const [flashPulse, setFlashPulse] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('uploading')
  const [errors, setErrors] = useState({})

  const remainingSlots = MAX_MEDIA - mediaItems.length
  const anyCompressing = mediaItems.some((i) => i.compressing)
  const activeItem = useMemo(
    () => mediaItems.find((i) => i.id === activeId) || mediaItems[0] || null,
    [mediaItems, activeId]
  )

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing }, audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraReady(true); setCameraError(false)
      } catch {
        setCameraError(true)
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  useEffect(() => {
    // Lock body scroll when this page mounts
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => () => abortControllerRef.current?.abort(), [])

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
    setFlashPulse(true); setTimeout(() => setFlashPulse(false), 180)
    const canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      handleFiles([new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })])
    }, 'image/jpeg', 0.9)
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
    <div 
      className="fixed inset-0 overflow-hidden select-none text-white"
      style={{ 
        background: '#000', 
        fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",sans-serif',
        zIndex: 100, // 👈 HIGH z-index to overlay bottom nav
      }}
    >
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

          {/* flash pulse */}
          <AnimatePresence>
            {flashPulse && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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
                onClick={() => setFlashOn((f) => !f)}
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

        {/* Bottom control deck - reverted to original padding (no extra offset) */}
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

          {/* Shutter row */}
          <div className="relative flex items-center justify-between px-8 pb-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
            >
              <FiImage size={18} />
            </button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={capturePhoto}
              disabled={!cameraReady}
              aria-label="Take photo"
              className="relative rounded-full flex items-center justify-center disabled:opacity-40"
              style={{
                width: 76, height: 76,
                background: 'transparent',
                boxShadow: '0 0 0 3px #fff, 0 0 0 6px rgba(0,0,0,0.4)',
              }}
            >
              <span className="rounded-full transition-transform"
                style={{ width: 60, height: 60, background: '#fff' }} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setScreen('edit')}
              disabled={!canNext}
              className="px-5 h-11 rounded-full text-sm font-semibold disabled:opacity-30"
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
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setScreen('capture')}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <FiArrowLeft size={18} />
                </button>
                <h2 className="text-[15px] font-semibold tracking-tight">New post</h2>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSubmit}
                  disabled={!canShare}
                  className="px-4 h-9 rounded-full text-[13px] font-bold disabled:opacity-30"
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
                <div className="flex gap-3 mb-5">
                  <div className="w-[70px] h-[70px] rounded-xl overflow-hidden flex-shrink-0 relative"
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
                  <textarea
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value)
                      if (errors.content) setErrors((p) => ({ ...p, content: '' }))
                    }}
                    placeholder="Write a caption…"
                    rows={3}
                    maxLength={2200}
                    className="flex-1 bg-transparent outline-none text-[15px] resize-none leading-relaxed placeholder:text-white/30"
                  />
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

                {/* Options */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { icon: FiUsers, label: 'Tag people' },
                    { icon: FiMapPin, label: 'Add location' },
                    { icon: FiMusic, label: 'Add music' },
                  ].map(({ icon: Icon, label }, i, arr) => (
                    <button
                      key={label}
                      onClick={() => toast('Coming soon')}
                      className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/5 transition"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    >
                      <span className="flex items-center gap-3 text-[14px] font-medium">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <Icon size={15} color="rgba(255,255,255,0.75)" />
                        </span>
                        {label}
                      </span>
                      <FiChevronRight size={16} color="rgba(255,255,255,0.3)" />
                    </button>
                  ))}
                </div>

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
                className="px-5 py-2 rounded-full text-xs font-semibold disabled:opacity-40"
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
      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition"
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