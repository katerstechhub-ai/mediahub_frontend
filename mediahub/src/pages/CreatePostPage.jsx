// import { useState, useRef, useEffect, useCallback } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
// import { FiImage, FiX, FiCamera, FiArrowLeft, FiClipboard, FiCheck, FiPlus, FiPlay } from 'react-icons/fi'
// import { postsAPI } from '../api'
// import toast from 'react-hot-toast'
// /**
//  * CreatePostPage — refined compose screen
//  * -------------------------------------------------
//  * Design goals:
//  *  • Editorial, calm layout — content first, chrome second
//  *  • Warm amber accent (#f59e0b) used sparingly for focus + CTA
//  *  • Framer Motion drives every state change (no CSS transitions)
//  *  • Feels native on mobile (sticky glass top bar, big tap targets)
//  *  • Feels premium on desktop (drag tilt, paste-from-clipboard, spring reveals)
//  *  • Supports up to MAX_IMAGES photos/videos per post, freely mixed
//  */
// const MAX_MEDIA = 5
// // Images are downscaled to this max dimension + re-encoded as JPEG before upload.
// // This is the main lever for upload speed — a 4000x3000 phone photo (6-8MB) usually
// // compresses down to a few hundred KB with no visible quality loss at feed size.
// const MAX_DIMENSION = 1600
// const JPEG_QUALITY = 0.82
// // Size caps are split by media type — video files are naturally much larger than
// // photos (a couple minutes of phone footage is routinely 50-150MB), so reusing the
// // image cap here silently rejected every real-world video.
// const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
// const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
// let idSeq = 0
// const nextId = () => `media_${Date.now()}_${idSeq++}`

// // Resize + re-encode an image file in the browser using a canvas. Falls back to the
// // original file if anything goes wrong (e.g. unsupported format) so uploads never break.
// // Videos are skipped (returned as-is) — see generateVideoThumbnail below for their preview.
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
//         // Only use the compressed version if it's actually smaller
//         if (blob.size >= file.size) { resolve(file); return }
//         resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
//       }, 'image/jpeg', JPEG_QUALITY)
//     }
//     img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
//     img.src = url
//   })
// }

// // Grabs a single frame from a video file and returns it as a JPEG data URL, so
// // video previews behave exactly like image previews — no <video> tag needed,
// // no risk of it rendering blank because autoplay never fired.
// function generateVideoThumbnail(file) {
//   return new Promise((resolve) => {
//     const video = document.createElement('video')
//     video.preload = 'metadata'
//     video.muted = true
//     video.playsInline = true
//     const url = URL.createObjectURL(file)
//     video.src = url

//     const cleanup = () => URL.revokeObjectURL(url)
//     // Safety net — if a video never fires loadedmetadata/seeked (corrupt file,
//     // unsupported codec), don't leave the tile stuck spinning forever.
//     const timeout = setTimeout(() => { cleanup(); resolve(null) }, 8000)

//     video.onloadedmetadata = () => {
//       // The very first frame is often black/undecoded — seek in a touch.
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
//   // files/previews are parallel arrays, each entry keyed by a stable id.
//   // preview is ALWAYS a static image data URL (a real photo for images, a
//   // captured frame for videos) — isVideo just controls the play-icon badge.
//   const [mediaItems, setMediaItems] = useState([]) // [{ id, file, preview, compressing, isVideo }]
//   const [loading, setLoading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0) // 0-100 while the request is in flight
//   const [dragOver, setDragOver] = useState(false)
//   const [errors, setErrors] = useState({})
//   const [justPasted, setJustPasted] = useState(false)
//   // Subtle tilt on the dropzone that follows the cursor — feels alive without being loud
//   const mx = useMotionValue(0)
//   const my = useMotionValue(0)
//   const rotateX = useTransform(my, [-40, 40], [4, -4])
//   const rotateY = useTransform(mx, [-40, 40], [-4, 4])
//   const remainingSlots = MAX_MEDIA - mediaItems.length
//   const anyCompressing = mediaItems.some(item => item.compressing)
//   // ---- validation --------------------------------------------------
//   const validate = () => {
//     const e = {}
//     const t = title.trim()
//     if (t && t.length < 3) e.title = 'Title must be at least 3 characters'
//     else if (t.length > 100) e.title = 'Title must be under 100 characters'
//     if (!content.trim() && mediaItems.length === 0) e.content = 'Add a photo/video or a few words'
//     setErrors(e)
//     return Object.keys(e).length === 0
//   }
//   // ---- file handling -----------------------------------------------
//   // Images and videos can be freely mixed, up to MAX_MEDIA total, in any order.
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
//     setErrors(prev => ({ ...prev, content: '' }))
//     accepted.forEach((f) => {
//       const id = nextId()
//       const isVideo = f.type.startsWith('video/')
//       // Add a placeholder immediately with compressing:true, then swap in the
//       // real preview once ready. Keeps the UI responsive for many items.
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
//   }, [remainingSlots])
//   const handleDrop = (e) => {
//     e.preventDefault()
//     setDragOver(false)
//     handleFiles(e.dataTransfer.files)
//   }
//   const removeMedia = (id, e) => {
//     e?.stopPropagation()
//     setMediaItems(prev => prev.filter(item => item.id !== id))
//     if (fileRef.current) fileRef.current.value = ''
//   }
//   // Paste image(s) from clipboard anywhere on the page — desktop delight
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
//   // ⌘/Ctrl + Enter to post
//   useEffect(() => {
//     const onKey = (e) => {
//       if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
//     }
//     window.addEventListener('keydown', onKey)
//     return () => window.removeEventListener('keydown', onKey)
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [title, content, mediaItems, loading])
//   const canPost = Boolean((title.trim() || content.trim() || mediaItems.length > 0) && !loading && !anyCompressing)
//   const handleSubmit = async () => {
//     if (!canPost || !validate()) return
//     setLoading(true)
//     setUploadProgress(0)
//     try {
//       const fd = new FormData()
//       if (title.trim()) fd.append('title', title.trim())
//       if (content.trim()) fd.append('content', content.trim())
//       else if (mediaItems.length) fd.append('content', ' ')
//       // Field name 'media' — backend is expected to split these by mimetype
//       // into post.images / post.videos on its side.
//       mediaItems.forEach(({ file }) => fd.append('media', file))
//       await postsAPI.create(fd, {
//         onUploadProgress: (evt) => {
//           if (!evt.total) return
//           setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
//         },
//       })
//       toast.success('Posted 🎉')
//       navigate('/')
//     } catch (err) {
//       console.error(err)
//       toast.error(err.response?.data?.message || 'Failed to create post')
//     } finally {
//       setLoading(false)
//       setUploadProgress(0)
//     }
//   }
//   // ---- render ------------------------------------------------------
//   return (
//     <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
//       {/* Soft ambient glow that drifts — pure decoration, respects reduced motion via short cycle */}
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
//       {/* Glass top bar */}
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
//       {/* Full-screen upload overlay — visible while the request is actually in flight */}
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
//                   {uploadProgress < 100 ? 'Uploading…' : 'Almost done…'}
//                 </p>
//                 {mediaItems.length > 0 && (
//                   <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
//                     {mediaItems.length} media item{mediaItems.length > 1 ? 's' : ''}
//                   </p>
//                 )}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {/* Body */}
//       <motion.main
//         initial="hidden"
//         animate="show"
//         variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
//         className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
//       >
//         {/* Dropzone / preview grid */}
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
//                         {/* Play badge marks video items — preview is a captured frame, not a live video */}
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
//           {/* File input accepts images AND videos */}
//           <input
//             ref={fileRef}
//             type="file"
//             accept="image/*,video/*"
//             multiple
//             className="hidden"
//             onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
//           />
//         </motion.section>
//         {/* Title */}
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
//         {/* Content */}
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
//         {/* Footer hint */}
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
// // ---------- sub-components ------------------------------------------------
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










import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { FiImage, FiX, FiCamera, FiArrowLeft, FiClipboard, FiCheck, FiPlus, FiPlay } from 'react-icons/fi'
import { postsAPI, uploadAPI, uploadMediaDirect } from '../api'
import toast from 'react-hot-toast'

/**
 * CreatePostPage — refined compose screen
 * -------------------------------------------------
 * Design goals:
 *  • Editorial, calm layout — content first, chrome second
 *  • Warm amber accent (#f59e0b) used sparingly for focus + CTA
 *  • Framer Motion drives every state change (no CSS transitions)
 *  • Feels native on mobile (sticky glass top bar, big tap targets)
 *  • Feels premium on desktop (drag tilt, paste-from-clipboard, spring reveals)
 *  • Supports up to MAX_MEDIA photos/videos per post, freely mixed
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
// video previews behave exactly like image previews — no <video> tag needed,
// no risk of it rendering blank because autoplay never fired.
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
  // Holds the AbortController for whatever's currently in flight (Cloudinary
  // upload(s) or the final post-create call) so Cancel can actually stop it.
  const abortControllerRef = useRef(null)
  // Subtle tilt on the dropzone that follows the cursor — feels alive without being loud
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-40, 40], [4, -4])
  const rotateY = useTransform(mx, [-40, 40], [-4, 4])
  const remainingSlots = MAX_MEDIA - mediaItems.length
  const anyCompressing = mediaItems.some(item => item.compressing)

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
  }, [remainingSlots])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeMedia = (id, e) => {
    e?.stopPropagation()
    setMediaItems(prev => prev.filter(item => item.id !== id))
    if (fileRef.current) fileRef.current.value = ''
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
        const sigResponse = await uploadAPI.getSignature()
        const signatureData = sigResponse.data.data

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
      // AbortController firing surfaces here as axios's own cancellation
      // shape — name 'CanceledError' / code 'ERR_CANCELED' — regardless of
      // whether it came from uploadMediaDirect's plain axios.post or from
      // postsAPI.create. No need to import axios just to double-check via
      // axios.isCancel(); these two checks already cover it.
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
    }
  }

  // ---- render ------------------------------------------------------
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Soft ambient glow that drifts — pure decoration, respects reduced motion via short cycle */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 60%)' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 60%)' }}
        animate={{ x: [0, -20, 30, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Glass top bar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
        style={{
          background: 'color-mix(in oklab, var(--bg-primary) 72%, transparent)',
          borderColor: 'var(--border)',
        }}
      >
        <motion.button
          whileHover={{ scale: 1.06, x: -2 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-primary)' }}
        >
          <FiArrowLeft size={20} strokeWidth={2.4} />
        </motion.button>
        <div className="flex flex-col items-center leading-tight">
          <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New post</h1>
          <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
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
            className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-64 rounded-3xl px-6 py-6 flex flex-col items-center gap-4"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
            >
              <div className="relative w-16 h-16">
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <motion.circle
                    cx="32" cy="32" r="27" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 27}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - uploadProgress / 100) }}
                    transition={{ ease: 'linear', duration: 0.15 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
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
                className="px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
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
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {mediaItems.length} / {MAX_MEDIA} media
                    {anyCompressing && <span style={{ color: '#f59e0b' }}> · optimizing…</span>}
                  </span>
                  {justPasted && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.9 }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: '#f59e0b', color: 'white' }}
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
                        className="relative aspect-square rounded-2xl overflow-hidden group"
                        style={{
                          background: 'var(--bg-secondary)',
                          boxShadow: '0 12px 30px -14px rgba(0,0,0,0.35)',
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
                          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]" style={{ background: 'rgba(0,0,0,0.25)' }}>
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
                            <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.5)' }}>
                              <FiPlay size={16} color="white" fill="white" style={{ marginLeft: 2 }} />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => removeMedia(id, e)}
                          aria-label="Remove media"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
                          style={{ background: 'rgba(0,0,0,0.55)' }}
                        >
                          <FiX size={14} color="white" />
                        </motion.button>
                        {file && !compressing && (
                          <div
                            className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md"
                            style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
                          >
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {remainingSlots > 0 && (
                      <motion.button
                        key="add-more"
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => fileRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                      >
                        <FiPlus size={20} color="#f59e0b" />
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Add media
                        </span>
                      </motion.button>
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
                  borderColor: dragOver ? '#f59e0b' : 'var(--border)',
                  background: dragOver
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))'
                    : 'var(--bg-secondary)',
                  rotateX,
                  rotateY,
                  transformPerspective: 1000,
                }}
                className="relative rounded-[28px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer py-16 sm:py-20 px-6 text-center"
              >
                <motion.div
                  animate={{
                    scale: dragOver ? 1.15 : 1,
                    rotate: dragOver ? [0, -6, 6, 0] : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <FiImage size={28} color="#f59e0b" strokeWidth={2} />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {dragOver ? 'Drop it here' : 'Add photos & videos'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Drag & drop, click to browse, or <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>⌘V</kbd> to paste — up to {MAX_MEDIA}, mix photos and videos freely
                  </p>
                </div>
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
                      className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                      style={{ background: '#f59e0b', color: 'white' }}
                    >
                      <FiClipboard size={12} /> Pasted
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          {/* File input accepts images AND videos */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </motion.section>
        {/* Title */}
        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
              Title
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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
          className="mt-6"
        >
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: '#f59e0b' }}>
              Story
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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
          className="mt-10 flex items-center justify-center gap-2 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>⌘</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Enter</kbd>
          <span>to post</span>
        </motion.div>
      </motion.main>
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
      className="relative px-5 py-2 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: canPost
          ? 'linear-gradient(135deg, #f59e0b, #f97316)'
          : 'var(--bg-secondary)',
        color: 'white',
        boxShadow: canPost ? '0 8px 20px -8px rgba(245,158,11,0.6)' : 'none',
      }}
    >
      {canPost && (
        <motion.span
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent)' }}
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