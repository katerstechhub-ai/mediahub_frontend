import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiX, FiTag, FiUploadCloud, FiFile, FiArrowLeft } from 'react-icons/fi'
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
    <div className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-14" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-lg">

        {/* Back link above the card */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold mb-4 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          <FiArrowLeft size={16} /> Back
        </button>

        <div
          className="w-full rounded-3xl border shadow-sm overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3.5 px-7 sm:px-8 pt-7 sm:pt-8 pb-6">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              <FiImage size={20} color="white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>
                Add new post
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Share something with your community
              </p>
            </div>
          </div>

          <div className="px-7 sm:px-8 pb-8 flex flex-col gap-6">

            {/* Title field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Title</label>
              <input
                type="text"
                placeholder="Give your post a title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
                maxLength={100}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none border-2 focus:border-amber-500 transition-all"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.title ? '#ef4444' : 'var(--border)' }}
              />
              <div className="flex justify-between">
                {errors.title ? <p className="text-xs font-medium text-red-500">{errors.title}</p> : <span />}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
              </div>
            </div>

            {/* Content field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Post</label>
              <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => { setContent(e.target.value); if (errors.content) setErrors(p => ({ ...p, content: '' })) }}
                rows={5}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none border-2 focus:border-amber-500 transition-all resize-none leading-relaxed"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.content ? '#ef4444' : 'var(--border)' }}
              />
              {errors.content && <p className="text-xs font-medium text-red-500">{errors.content}</p>}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <FiTag size={12} /> Tags
                <span className="font-normal normal-case opacity-70">· optional, max 10</span>
              </label>
              <input
                type="text"
                placeholder="travel, nature, food"
                value={tags}
                onChange={(e) => { setTags(e.target.value); if (errors.tags) setErrors(p => ({ ...p, tags: '' })) }}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none border-2 focus:border-amber-500 transition-all"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.tags ? '#ef4444' : 'var(--border)' }}
              />
              {errors.tags && <p className="text-xs font-medium text-red-500">{errors.tags}</p>}
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tagList.map(tag => (
                    <span
                      key={tag}
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'var(--bg-primary)', color: '#f59e0b' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Image upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Image <span className="font-normal normal-case opacity-70">· optional</span>
              </label>
              {preview ? (
                <div className="relative rounded-2xl overflow-hidden border-2" style={{ aspectRatio: '16/9', borderColor: 'var(--border)' }}>
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors shadow-lg"
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
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors py-9 px-6"
                  style={{
                    borderColor: dragOver ? '#f59e0b' : 'var(--border)',
                    background: dragOver ? 'rgba(245,158,11,0.07)' : 'var(--bg-input)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: dragOver ? 'rgba(245,158,11,0.15)' : 'var(--bg-primary)' }}
                  >
                    <FiUploadCloud size={18} color="#f59e0b" strokeWidth={2.2} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Click or drag &amp; drop to upload
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-500/30"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Publishing...
                  </>
                ) : 'Publish'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}