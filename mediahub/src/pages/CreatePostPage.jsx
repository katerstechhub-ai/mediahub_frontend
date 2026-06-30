import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUploadCloud, FiX, FiTag, FiFile, FiImage } from 'react-icons/fi'
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
      fd.append('title', title.trim())
      fd.append('content', content.trim() || ' ')
      if (file) fd.append('image', file)
      if (tags) {
        tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags', t))
      }
      await postsAPI.create(fd)
      toast.success('Post created!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12" style={{ background: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-xl my-auto">

        <div
          className="rounded-3xl border shadow-sm overflow-hidden"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          {/* Header — icon badge + title/subtitle + close, like the reference */}
          <div className="flex items-start gap-3.5 px-6 sm:px-7 pt-6 sm:pt-7 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              <FiImage size={19} color="white" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Add new post
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Share something with your community
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-[var(--bg-secondary)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="px-6 sm:px-7 py-6 flex flex-col gap-6">
            {/* Image upload — dashed dropzone matching the reference */}
            <div className="flex flex-col gap-2">
              {preview ? (
                <div className="relative rounded-2xl overflow-hidden border" style={{ aspectRatio: '16/9', borderColor: 'var(--border)' }}>
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
                  >
                    <FiX size={15} strokeWidth={2.5} color="white" />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2">
                    <FiFile size={14} color="white" className="flex-shrink-0" />
                    <span className="text-xs font-medium text-white truncate">{file?.name}</span>
                    <span className="text-xs text-white/70 ml-auto flex-shrink-0">
                      {file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  className="rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors py-10 px-6"
                  style={{
                    borderColor: dragOver ? '#f59e0b' : 'var(--border)',
                    background: dragOver ? 'rgba(245,158,11,0.06)' : 'var(--bg-secondary)',
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border shadow-sm"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  >
                    <FiUploadCloud size={15} strokeWidth={2.2} />
                    Upload
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Choose a file or drag &amp; drop it here
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Maximum 10MB file size
                    </p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </div>

            {/* Title field — flat, subtle, low-key label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Title</label>
              <input
                type="text"
                placeholder="Give your post a title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
                maxLength={100}
                className="w-full rounded-xl text-sm outline-none border focus:border-amber-500 transition-all h-11 px-3.5"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: errors.title ? '#ef4444' : 'var(--border)' }}
              />
              <div className="flex justify-between">
                {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : <span />}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
              </div>
            </div>

            {/* Content field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Post</label>
              <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => { setContent(e.target.value); if (errors.content) setErrors(p => ({ ...p, content: '' })) }}
                rows={5}
                className="w-full rounded-xl text-sm outline-none border focus:border-amber-500 transition-all resize-none px-3.5 py-3"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: errors.content ? '#ef4444' : 'var(--border)' }}
              />
              {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <FiTag size={12} /> Tags <span className="opacity-70">· optional, max 10</span>
              </label>
              <input
                type="text"
                placeholder="travel, nature, food"
                value={tags}
                onChange={(e) => { setTags(e.target.value); if (errors.tags) setErrors(p => ({ ...p, tags: '' })) }}
                className="w-full rounded-xl text-sm outline-none border focus:border-amber-500 transition-all h-11 px-3.5"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: errors.tags ? '#ef4444' : 'var(--border)' }}
              />
              {errors.tags && <p className="text-xs text-red-500">{errors.tags}</p>}
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tagList.map(tag => (
                    <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions — Cancel stays plain text, Publish is the only filled action so they're never confused */}
          <div className="flex items-center justify-end gap-3 px-6 sm:px-7 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <button
              onClick={() => navigate(-1)}
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-28 py-2 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}