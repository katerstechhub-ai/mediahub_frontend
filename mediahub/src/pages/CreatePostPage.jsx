import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiX, FiArrowLeft, FiTag } from 'react-icons/fi'
import { postsAPI } from '../api'
import toast from 'react-hot-toast'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!title.trim()) {
      e.title = 'Title is required'
    } else if (title.trim().length < 3) {
      e.title = 'Title must be at least 3 characters'
    } else if (title.trim().length > 100) {
      e.title = 'Title must be under 100 characters'
    }
    if (!content.trim() && !file) {
      e.content = 'Add some content or upload an image'
    }
    if (tags) {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
      if (tagArr.length > 10) e.tags = 'Maximum 10 tags allowed'
      if (tagArr.some(t => t.length > 30)) e.tags = 'Each tag must be under 30 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Images only please')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Max 10MB')
      return
    }
    setFile(f)
    // clear content error if image is now provided
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

  const removeImage = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('content', content.trim() || ' ')
      if (file) fd.append('image', file)
      if (tags) {
        const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
        tagArr.forEach(t => fd.append('tags', t))
      }

      await postsAPI.create(fd)
      toast.success('Post created successfully!')
      navigate('/')
    } catch (err) {
      console.error('Create post error:', err.response?.data)
      toast.error(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b backdrop-blur-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <FiArrowLeft size={22} style={{ color: 'var(--text-primary)' }} />
          </button>
          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>New Post</span>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sharing...
              </span>
            ) : 'Share'}
          </button>
        </div>

        <div className="py-6 flex flex-col gap-5">
          {/* Image upload */}
          <div>
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', background: 'var(--bg-secondary)' }}>
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <FiX size={18} color="white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors py-16 gap-3"
                style={{
                  borderColor: dragOver ? '#f59e0b' : 'var(--border)',
                  background: dragOver ? 'rgba(245,158,11,0.05)' : 'var(--bg-secondary)',
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <FiImage size={28} color="#f59e0b" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Drop a photo here</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>or click to browse · max 10MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Give your post a title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
              }}
              maxLength={100}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: errors.title ? '#ef4444' : 'var(--border)',
              }}
            />
            <div className="flex justify-between items-center">
              {errors.title
                ? <p className="text-xs text-red-500">{errors.title}</p>
                : <span />}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Content
            </label>
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (errors.content) setErrors(prev => ({ ...prev, content: '' }))
              }}
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all resize-none"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: errors.content ? '#ef4444' : 'var(--border)',
              }}
            />
            {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <FiTag size={14} /> Tags
              <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>optional · max 10</span>
            </label>
            <input
              type="text"
              placeholder="travel, nature, food (comma separated)"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value)
                if (errors.tags) setErrors(prev => ({ ...prev, tags: '' }))
              }}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: errors.tags ? '#ef4444' : 'var(--border)',
              }}
            />
            {errors.tags && <p className="text-xs text-red-500">{errors.tags}</p>}
            {tags && (
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold text-base hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Creating...
              </span>
            ) : 'Share Post'}
          </button>
        </div>
      </div>
    </div>
  )
}