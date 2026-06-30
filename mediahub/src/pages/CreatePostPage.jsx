import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiX, FiTag } from 'react-icons/fi'
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

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-lg rounded-2xl border p-6 flex flex-col gap-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

        {/* Heading */}
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add new post</h2>

        {/* Title field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Title</label>
          <input
            type="text"
            placeholder="This is the title"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
            maxLength={100}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.title ? '#ef4444' : 'var(--border)' }}
          />
          <div className="flex justify-between">
            {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : <span />}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{title.length}/100</span>
          </div>
        </div>

        {/* Content field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Post</label>
          <textarea
            placeholder="Type post here"
            value={content}
            onChange={(e) => { setContent(e.target.value); if (errors.content) setErrors(p => ({ ...p, content: '' })) }}
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all resize-none"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.content ? '#ef4444' : 'var(--border)' }}
          />
          {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <FiTag size={13} /> Tags
            <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>optional · max 10</span>
          </label>
          <input
            type="text"
            placeholder="travel, nature, food"
            value={tags}
            onChange={(e) => { setTags(e.target.value); if (errors.tags) setErrors(p => ({ ...p, tags: '' })) }}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border focus:border-amber-500 transition-all"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: errors.tags ? '#ef4444' : 'var(--border)' }}
          />
          {errors.tags && <p className="text-xs text-red-500">{errors.tags}</p>}
          {tags && (
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Image upload */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Image <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>optional</span>
          </label>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <FiX size={15} color="white" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className="rounded-xl border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-colors py-6"
              style={{ borderColor: dragOver ? '#f59e0b' : 'var(--border)', background: dragOver ? 'rgba(245,158,11,0.05)' : 'var(--bg-input)' }}
            >
              <FiImage size={20} color="#f59e0b" />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Click or drag to upload · max 10MB</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-[var(--bg-primary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Publishing...
              </span>
            ) : 'Publish'}
          </button>
        </div>

      </div>
    </div>
  )
}