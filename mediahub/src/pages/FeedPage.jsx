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
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <FiImage size={36} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-muted)' }}>Share something with the world</p>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <FiPlusSquare size={18} /> Create Post
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 py-5"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>MediaHub</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{posts.length} posts</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl p-0.5" style={{ background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'grid' ? 'var(--bg-primary)' : 'transparent',
                  color: viewMode === 'grid' ? '#f59e0b' : 'var(--text-muted)',
                }}
              >
                <FiGrid size={17} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 rounded-xl transition-all"
                style={{
                  background: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                  color: viewMode === 'list' ? '#f59e0b' : 'var(--text-muted)',
                }}
              >
                <FiList size={17} />
              </button>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="p-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl transition-colors"
            >
              <FiPlusSquare size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 pb-3">
        <div className="h-10" />
        {viewMode === 'grid' ? (
          // ✅ 2 columns on mobile, scales up on larger screens
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post)
              const isSelected = selectedPost?._id === post._id
              return (
                <div
                  key={post._id}
                  onClick={() => setSelectedPost(isSelected ? null : post)}
                  className="relative group cursor-pointer rounded-xl overflow-hidden aspect-square"
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
                      <FiImage size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  {/* Like count badge */}
                  <div className="absolute bottom-1.5 right-1.5 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                    <FiHeart size={10} className="text-white" />
                    <span className="text-white text-[10px] font-medium">{post.likes?.length || 0}</span>
                  </div>

                  {/* Selected overlay */}
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
                            ? <FaHeart size={13} className="text-red-400" />
                            : <FiHeart size={13} />}
                          <span className="text-[11px]">{post.likes?.length || 0}</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/posts/${post._id}`) }}
                          className="flex items-center gap-1 text-white"
                        >
                          <FiMessageCircle size={13} />
                          <span className="text-[11px]">{commentCounts[post._id] ?? post.comments?.length ?? 0}</span>
                        </button>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/posts/${post._id}`) }}
                        className="mt-2 text-amber-400 text-[11px] font-medium hover:underline"
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
          <div className="max-w-xl mx-auto space-y-4">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post)
              const isLiked = post.likes?.includes(user?._id)
              return (
                <div
                  key={post._id}
                  className="rounded-2xl overflow-hidden border"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <Avatar src={post.author?.avatar} name={post.author?.name} size={38} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {post.author?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Image */}
                  {imageUrl && (
                    <div style={{ background: 'var(--bg-secondary)' }}>
                      <img
                        src={imageUrl}
                        alt={post.title || 'Post'}
                        className="w-full h-auto"
                        style={{ maxHeight: 320, objectFit: 'cover' }}
                        loading="lazy"
                        onError={e => e.target.style.display = 'none'}
                      />
                    </div>
                  )}

                  <div className="px-4 py-3">
                    {post.title && (
                      <h3 className="font-bold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {post.title}
                      </h3>
                    )}
                    {post.content && post.content.trim() !== ' ' && (
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {post.content}
                      </p>
                    )}

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <button onClick={e => handleLike(e, post._id)} className="flex items-center gap-1.5">
                        {isLiked
                          ? <FaHeart size={17} color="#ef4444" />
                          : <FiHeart size={17} style={{ color: 'var(--text-muted)' }} />}
                        <span className="text-sm" style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>
                          {post.likes?.length || 0}
                        </span>
                      </button>
                      <button onClick={() => navigate(`/posts/${post._id}`)} className="flex items-center gap-1.5">
                        <FiMessageCircle size={17} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {commentCounts[post._id] ?? post.comments?.length ?? 0}
                        </span>
                      </button>
                    </div>
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