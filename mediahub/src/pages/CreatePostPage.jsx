import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { FiImage, FiX, FiCamera, FiArrowLeft, FiClipboard, FiCheck, FiPlus } from 'react-icons/fi'
import { postsAPI } from '../api'
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
 *  • Supports up to MAX_IMAGES photos per post
 */
const MAX_IMAGES = 5
let idSeq = 0
const nextId = () => `img_${Date.now()}_${idSeq++}`
export default function CreatePostPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const titleRef = useRef(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  // files/previews are parallel arrays, each entry keyed by a stable id
  const [images, setImages] = useState([]) // [{ id, file, preview }]
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState({})
  const [justPasted, setJustPasted] = useState(false)
  // Subtle tilt on the dropzone that follows the cursor — feels alive without being loud
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-40, 40], [4, -4])
  const rotateY = useTransform(mx, [-40, 40], [-4, 4])
  const remainingSlots = MAX_IMAGES - images.length
  // ---- validation --------------------------------------------------
  const validate = () => {
    const e = {}
    const t = title.trim()
    if (t && t.length < 3) e.title = 'Title must be at least 3 characters'
    else if (t.length > 100) e.title = 'Title must be under 100 characters'
    if (!content.trim() && images.length === 0) e.content = 'Add a photo or a few words'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  // ---- file handling -----------------------------------------------
  const handleFiles = useCallback((fileListLike) => {
    const incoming = Array.from(fileListLike || [])
    if (!incoming.length) return
    if (remainingSlots <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images`)
      return
    }
    const accepted = []
    for (const f of incoming) {
      if (accepted.length >= remainingSlots) {
        toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} allowed`)
        break
      }
      if (!f.type.startsWith('image/')) { toast.error(`${f.name || 'File'} isn't an image`); continue }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name || 'Image'} is too large. Max 10MB`); continue }
      accepted.push(f)
    }
    if (!accepted.length) return
    setErrors(prev => ({ ...prev, content: '' }))
    accepted.forEach((f) => {
      const id = nextId()
      // Add a placeholder immediately, then fill in the preview once read
      setImages(prev => [...prev, { id, file: f, preview: null }])
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, preview: reader.result } : img))
      }
      reader.readAsDataURL(f)
    })
  }, [remainingSlots])
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }
  const removeImage = (id, e) => {
    e?.stopPropagation()
    setImages(prev => prev.filter(img => img.id !== id))
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
  }, [title, content, images, loading])
  const canPost = Boolean((title.trim() || content.trim() || images.length > 0) && !loading)
  const handleSubmit = async () => {
    if (!canPost || !validate()) return
    setLoading(true)
    try {
      const fd = new FormData()
      if (title.trim()) fd.append('title', title.trim())
      if (content.trim()) fd.append('content', content.trim())
      else if (images.length) fd.append('content', ' ')
      images.forEach(({ file }) => fd.append('images', file))
      await postsAPI.create(fd)
      toast.success('Posted 🎉')
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
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
        <PostButton canPost={canPost} loading={loading} onClick={handleSubmit} />
      </motion.header>
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
            {images.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {images.length} / {MAX_IMAGES} photos
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
                    {images.map(({ id, preview, file }) => (
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => removeImage(id, e)}
                          aria-label="Remove image"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
                          style={{ background: 'rgba(0,0,0,0.55)' }}
                        >
                          <FiX size={14} color="white" />
                        </motion.button>
                        {file && (
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
                          Add photo
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
                    {dragOver ? 'Drop it here' : 'Add photos'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Drag & drop, click to browse, or <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>⌘V</kbd> to paste — up to {MAX_IMAGES}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  <span>PNG</span><span>·</span><span>JPG</span><span>·</span><span>WEBP</span><span>·</span><span>10MB each</span>
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
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
function PostButton({ canPost, loading, onClick }) {
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
            Posting
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