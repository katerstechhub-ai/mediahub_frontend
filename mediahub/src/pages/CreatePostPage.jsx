import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiImage, FiX, FiCamera } from 'react-icons/fi'
import { postsAPI } from '../api'
import toast from 'react-hot-toast'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (title.trim() && title.trim().length < 3) {
      e.title = 'Title must be at least 3 characters'
    } else if (title.trim() && title.trim().length > 100) {
      e.title = 'Title must be under 100 characters'
    }
    if (!content.trim() && !file) {
      e.content = 'Add a photo or a few words'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Images only please'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('Image too large. Max 10MB'); return }
    setFile(f)
    if (errors.content) setErrors(prev => ({ ...prev, content: '' }))
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const removeImage = (e) => {
    e?.stopPropagation()
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const canPost = (title.trim() || content.trim() || file) && !loading

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const fd = new FormData()
      if (title.trim()) fd.append('title', title.trim())
      if (content.trim()) {
        fd.append('content', content.trim())
      } else if (file) {
        fd.append('content', ' ')
      }
      if (file) fd.append('image', file)

      await postsAPI.create(fd)
      toast.success('Posted! 🎉')
      navigate('/')
    } catch (err) {
      console.error('Error:', err.response?.data)
      toast.error(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar — close / title / post, sticky like a real compose screen */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-lg"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)]"
        >
          <FiX size={20} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
        </motion.button>
        <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New post</h1>
        <motion.button
          whileHover={canPost ? { scale: 1.04 } : {}}
          whileTap={canPost ? { scale: 0.95 } : {}}
          onClick={handleSubmit}
          disabled={!canPost}
          className="px-5 py-2 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#f59e0b', color: 'white' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  className="rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent block"
                />
                Posting
              </motion.span>
            ) : (
              <motion.span key="post" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Post
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Image dropzone — the hero of the compose screen */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="relative rounded-3xl overflow-hidden shadow-sm"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 420 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={removeImage}
                  aria-label="Remove image"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                >
                  <FiX size={18} color="white" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
                >
                  <FiCamera size={14} /> Change
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                className="rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer py-14"
                style={{
                  borderColor: dragOver ? '#f59e0b' : 'var(--border)',
                  background: dragOver ? 'rgba(245,158,11,0.06)' : 'var(--bg-secondary)',
                }}
              >
                <motion.div
                  animate={{ scale: dragOver ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                >
                  <FiImage size={26} color="#f59e0b" strokeWidth={2} />
                </motion.div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add a photo</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Drag & drop or click to browse · Max 10MB</span>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {/* Title — borderless, large, feels like part of the page not a form field */}
        <div className="mb-1">
          <input
            type="text"
            placeholder="Add a title"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
            maxLength={100}
            className="w-full bg-transparent outline-none text-xl font-extrabold font-display"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <AnimatePresence>
          {(errors.title || title.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between mb-2 overflow-hidden"
            >
              {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : <span />}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content — borderless textarea, same treatment */}
        <div className="mb-2">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => { setContent(e.target.value); if (errors.content) setErrors(p => ({ ...p, content: '' })) }}
            rows={5}
            className="w-full bg-transparent outline-none text-[15px] resize-none leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
        <AnimatePresence>
          {errors.content && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-red-500 mb-2"
            >
              {errors.content}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="h-px my-4" style={{ background: 'var(--border)' }} />

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          A photo or a few words — either works
        </p>
      </div>
    </div>
  )
}