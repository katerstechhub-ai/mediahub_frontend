import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedPost, setSelectedPost] = useState(null)
  const [commentCounts, setCommentCounts] = useState({})
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
            {/* Grid/List toggle — fixed sizing so it never squishes */}
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

            {/* Create — plain text that reveals itself as a button on hover, no pill/fill */}
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
                          onClick={e => { e.stopPropagation(); navigate(`/posts/${post._id}`) }}
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
                    <div className="flex items-start justify-between">
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
                      
                      {/* Like and comment icons beside the heading */}
                      <div className="flex items-center gap-4 flex-shrink-0 ml-2 pt-0.5">
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
                          onClick={() => navigate(`/posts/${post._id}`)} 
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
    </div>
  )
}