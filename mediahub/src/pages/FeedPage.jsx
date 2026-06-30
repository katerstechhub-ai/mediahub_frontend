import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList, FiSend, FiX } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedPost, setSelectedPost] = useState(null)
  const [commentCounts, setCommentCounts] = useState({})
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedPostForComment, setSelectedPostForComment] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => { fetchPosts() }, [])

  const fetchPosts = async () => {
    try {
      const response = await postsAPI.getAll()
      const data = response.data
      let arr = []
      if (data?.data?.posts) arr = data.data.posts
      else if (data?.posts) arr = data.posts
      else if (Array.isArray(data?.data)) arr = data.data
      else if (Array.isArray(data)) arr = data
      setPosts(arr)

      const counts = {}
      await Promise.all(arr.map(async (post) => {
        try {
          const r = await commentsAPI.getByPost(post._id)
          counts[post._id] = (r.data?.data || []).length
        } catch {
          counts[post._id] = post.comments?.length || 0
        }
      }))
      setCommentCounts(counts)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (e, postId) => {
    e.stopPropagation()
    try {
      await postsAPI.like(postId)
      fetchPosts()
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedPostForComment) return
    
    setSubmittingComment(true)
    try {
      await commentsAPI.create(selectedPostForComment._id, commentText.trim())
      toast.success('Comment added!')
      setCommentText('')
      setShowCommentModal(false)
      setSelectedPostForComment(null)
      // Refresh comments count
      await fetchPosts()
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const openCommentModal = (e, post) => {
    e.stopPropagation()
    setSelectedPostForComment(post)
    setShowCommentModal(true)
  }

  const getImageUrl = (post) => {
    if (!post) return null
    if (post.image?.url) return post.image.url
    if (post.image && typeof post.image === 'string') return post.image
    if (post.media?.[0]) return post.media[0].url || post.media[0]
    if (post.imageUrl) return post.imageUrl
    if (post.thumbnail) return post.thumbnail
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <FiImage size={40} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-2xl font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-muted)' }}>Share something with the world</p>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full transition-colors text-sm shadow-lg shadow-amber-500/30"
        >
          <FiPlusSquare size={20} strokeWidth={2.5} /> Create Post
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 sm:px-6 py-4"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              MediaHub
            </h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{posts.length} posts</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Grid/List toggle */}
            <div className="flex items-center rounded-full p-1 flex-shrink-0 shadow-sm" style={{ background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0"
                style={{
                  background: viewMode === 'grid' ? '#f59e0b' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <FiGrid size={19} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0"
                style={{
                  background: viewMode === 'list' ? '#f59e0b' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <FiList size={19} strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={() => navigate('/create')}
              aria-label="Create post"
              className="flex-shrink-0 flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg transition-colors font-bold text-sm whitespace-nowrap hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <FiPlusSquare size={19} strokeWidth={2.5} className="flex-shrink-0" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-5 pb-3">
        <div className="h-6" />
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post)
              const isSelected = selectedPost?._id === post._id
              return (
                <div
                  key={post._id}
                  onClick={() => setSelectedPost(isSelected ? null : post)}
                  className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-lg transition-shadow"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={post.title || 'Post'}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      onError={e => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiImage size={26} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 bg-black/70 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                    <FiHeart size={12} strokeWidth={2.5} className="text-white" />
                    <span className="text-white text-xs font-bold">{post.likes?.length || 0}</span>
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-3">
                      <h3 className="text-white font-bold text-xs text-center line-clamp-2 mb-1">
                        {post.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={e => { e.stopPropagation(); handleLike(e, post._id) }}
                          className="flex items-center gap-1 text-white"
                        >
                          {post.likes?.includes(user?._id)
                            ? <FaHeart size={14} className="text-red-400" />
                            : <FiHeart size={14} strokeWidth={2.5} />}
                          <span className="text-[11px] font-bold">{post.likes?.length || 0}</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); openCommentModal(e, post) }}
                          className="flex items-center gap-1 text-white"
                        >
                          <FiMessageCircle size={14} strokeWidth={2.5} />
                          <span className="text-[11px] font-bold">{commentCounts[post._id] ?? post.comments?.length ?? 0}</span>
                        </button>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/posts/${post._id}`) }}
                        className="mt-3 text-amber-400 text-xs font-bold hover:underline px-4 py-1.5 rounded-full border border-amber-400/40"
                      >
                        View post →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post)
              const isLiked = post.likes?.includes(user?._id)
              return (
                <div
                  key={post._id}
                  className="rounded-3xl overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                >
                  {/* Image */}
                  <div className="relative" style={{ background: 'var(--bg-secondary)' }}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={post.title || 'Post'}
                        className="w-full h-auto"
                        style={{ maxHeight: 360, objectFit: 'cover' }}
                        loading="lazy"
                        onError={e => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center">
                        <FiImage size={28} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}

                    <button
                      onClick={e => handleLike(e, post._id)}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                    >
                      {isLiked
                        ? <FaHeart size={18} color="#ef4444" />
                        : <FiHeart size={18} strokeWidth={2.5} color="white" />}
                    </button>
                  </div>

                  {/* Content area */}
                  <div className="px-4 py-4">
                    {/* Row with avatar and like/comment icons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar src={post.author?.avatar} name={post.author?.name} size={40} className="flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {post.author?.name || 'Unknown'}
                          </p>
                          {post.title && (
                            <h3 className="font-extrabold font-display text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {post.title}
                            </h3>
                          )}
                          {post.content && post.content.trim() !== ' ' && post.content !== post.title && (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {post.content}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Like and comment icons */}
                      <div className="flex items-center gap-4 flex-shrink-0 ml-2 self-center">
                        <button 
                          onClick={e => handleLike(e, post._id)} 
                          className="flex items-center gap-1.5"
                        >
                          {isLiked
                            ? <FaHeart size={18} color="#ef4444" />
                            : <FiHeart size={18} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
                          <span className="text-sm font-bold" style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>
                            {post.likes?.length || 0}
                          </span>
                        </button>
                        <button 
                          onClick={e => openCommentModal(e, post)}
                          className="flex items-center gap-1.5"
                        >
                          <FiMessageCircle size={18} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
                          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                            {commentCounts[post._id] ?? post.comments?.length ?? 0}
                          </span>
                        </button>
                      </div>
                    </div>

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedPostForComment && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowCommentModal(false)}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCommentModal(false)}
          />
          
          {/* Modal */}
          <div 
            className="relative w-full max-w-md bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={selectedPostForComment.author?.avatar} name={selectedPostForComment.author?.name} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {selectedPostForComment.author?.name || 'Unknown'}
                  </p>
                  {selectedPostForComment.title && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {selectedPostForComment.title}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
              >
                <FiX size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Comment Input */}
            <div className="p-4">
              <form onSubmit={handleCommentSubmit} className="flex gap-3 items-start">
                <Avatar src={user?.avatar} name={user?.name} size={36} className="flex-shrink-0" />
                <div className="flex-1 relative">
                  <textarea
                    placeholder={`Comment as ${user?.name || 'Anonymous'}...`}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none border focus:border-amber-500 transition-all resize-none"
                    style={{ 
                      background: 'var(--bg-input)', 
                      color: 'var(--text-primary)', 
                      borderColor: 'var(--border)',
                      minHeight: '80px',
                      maxHeight: '200px'
                    }}
                    autoFocus
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="absolute right-3 bottom-3 disabled:opacity-30 transition-opacity"
                  >
                    <FiSend size={20} color="#f59e0b" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}