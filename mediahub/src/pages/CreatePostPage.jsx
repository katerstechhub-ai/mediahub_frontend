import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiX } from 'react-icons/fi'
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
    
    // Title is now optional - only validate if provided
    if (title.trim() && title.trim().length < 3) {
      e.title = 'Title must be at least 3 characters'
    } else if (title.trim() && title.trim().length > 100) {
      e.title = 'Title must be under 100 characters'
    }
    
    // Content is now optional - only validate if provided
    // Allow post with just image, or image + content, or just content
    if (!content.trim() && !file) {
      e.content = 'Add some content or upload an image'
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

  const removeImage = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const fd = new FormData()
      
      // Only append title if it has content
      if (title.trim()) {
        fd.append('title', title.trim())
      }
      
      // Only append content if it has content
      if (content.trim()) {
        fd.append('content', content.trim())
      } else {
        // If no content but has image, send a placeholder
        if (file) {
          fd.append('content', ' ')
        }
      }
      
      // Always append image if exists
      if (file) {
        fd.append('image', file)
      }
      
      await postsAPI.create(fd)
      toast.success('Post created successfully! 🎉')
      navigate('/')
    } catch (err) {
      console.error('Error:', err.response?.data)
      toast.error(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create Post</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Share something with the community</p>
        </div>

        {/* Main Form Card */}
        <div className="rounded-lg border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

          {/* Upload Section */}
          <div className="mb-6">
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Upload File <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optional but recommended)</span>
            </label>
            {preview ? (
              <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-primary)' }}>
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  onClick={removeImage}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
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
                className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors py-12"
                style={{ 
                  borderColor: dragOver ? '#f59e0b' : 'var(--border)', 
                  background: dragOver ? 'rgba(245,158,11,0.05)' : 'var(--bg-input)' 
                }}
              >
                <FiImage size={36} color="#f59e0b" />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Click or drag to upload</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>PNG, JPEG · Max 10MB</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {/* Title - Now optional */}
          <div className="mb-4">
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Title <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Enter post title (optional)"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
              maxLength={100}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all"
              style={{ 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)', 
                borderColor: errors.title ? '#ef4444' : 'var(--border)',
                height: '48px'
              }}
            />
            <div className="flex justify-between mt-1">
              {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : <span />}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
            </div>
          </div>

          {/* Content - Now optional */}
          <div className="mb-4">
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Content <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              placeholder="What's on your mind? (optional)"
              value={content}
              onChange={(e) => { setContent(e.target.value); if (errors.content) setErrors(p => ({ ...p, content: '' })) }}
              rows={6}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all resize-none"
              style={{ 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)', 
                borderColor: errors.content ? '#ef4444' : 'var(--border)',
                minHeight: '120px'
              }}
            />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[var(--bg-primary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#f59e0b', color: 'white' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Publishing...
                </span>
              ) : 'Create Post'}
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            You need at least an image or some content to create a post
          </p>
        </div>
      </div>
    </div>
  )
}