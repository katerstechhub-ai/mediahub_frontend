import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList, FiX } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { postsAPI, commentsAPI } from '../api'
import { useAuthStore } from '../store'
import { Avatar } from '../components/ui'
import toast from 'react-hot-toast'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [commentCounts, setCommentCounts] = useState({})
  const [commentingPostId, setCommentingPostId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(null)
  const lastTapRef = useRef({})
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
    e?.stopPropagation()
    try {
      await postsAPI.like(postId)
      fetchPosts()
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  // Double tap handler for grid view
  const handleDoubleTapGrid = (e, postId) => {
    e.stopPropagation()
    
    const now = Date.now()
    const lastTap = lastTapRef.current[postId] || 0
    
    if (now - lastTap < 300) {
      // Double tap detected!
      handleLike(e, postId)
      // Show heart animation
      setShowHeartAnimation(postId)
      setTimeout(() => setShowHeartAnimation(null), 800)
      lastTapRef.current[postId] = 0
    } else {
      lastTapRef.current[postId] = now
      // Single tap - navigate to post detail after a small delay
      setTimeout(() => {
        // Only navigate if it wasn't a double tap
        if (lastTapRef.current[postId] === now) {
          navigate(`/posts/${postId}`)
        }
      }, 300)
    }
  }

  // Double tap handler for list view image
  const handleDoubleTapList = (e, postId) => {
    e.stopPropagation()
    
    const now = Date.now()
    const lastTap = lastTapRef.current[postId] || 0
    
    if (now - lastTap < 300) {
      // Double tap detected!
      handleLike(e, postId)
      // Show heart animation
      setShowHeartAnimation(postId)
      setTimeout(() => setShowHeartAnimation(null), 800)
      lastTapRef.current[postId] = 0
    } else {
      lastTapRef.current[postId] = now
    }
  }

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault()
    if (!commentText.trim()) return
    
    setSubmittingComment(true)
    try {
      await commentsAPI.create(postId, commentText.trim())
      toast.success('Comment added!')
      setCommentText('')
      setCommentingPostId(null)
      await fetchPosts()
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const toggleCommentInput = (e, postId) => {
    e.stopPropagation()
    if (commentingPostId === postId) {
      setCommentingPostId(null)
      setCommentText('')
    } else {
      setCommentingPostId(postId)
      setCommentText('')
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

  // Heart animation component
  const HeartAnimation = ({ postId }) => {
    if (showHeartAnimation !== postId) return null
    
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <FaHeart 
          size={80} 
          color="#ef4444"
          className="animate-like-heart"
          style={{
            animation: 'likeHeart 0.8s ease-out forwards'
          }}
        />
      </div>
    )
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
              const isLiked = post.likes?.includes(user?._id)
              const commentCount = commentCounts[post._id] ?? post.comments?.length ?? 0
              
              return (
                <div
                  key={post._id}
                  onClick={(e) => handleDoubleTapGrid(e, post._id)}
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

                  {/* Heart animation on double tap */}
                  <HeartAnimation postId={post._id} />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
                  
                  <div className="absolute bottom-3 right-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-white">
                      {isLiked ? (
                        <FaHeart size={16} color="#ef4444" />
                      ) : (
                        <FiHeart size={16} strokeWidth={2.5} className="drop-shadow-lg" />
                      )}
                      <span className="text-xs font-semibold drop-shadow-lg">{post.likes?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white">
                      <FiMessageCircle size={16} strokeWidth={2.5} className="drop-shadow-lg" />
                      <span className="text-xs font-semibold drop-shadow-lg">{commentCount}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post)
              const isLiked = post.likes?.includes(user?._id)
              const isCommenting = commentingPostId === post._id
              const commentCount = commentCounts[post._id] ?? post.comments?.length ?? 0
              
              return (
                <div
                  key={post._id}
                  className="border-b pb-4"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Image - with double tap */}
                  {imageUrl && (
                    <div 
                      className="w-full mb-3 relative cursor-pointer"
                      style={{ background: 'var(--bg-secondary)' }}
                      onClick={(e) => handleDoubleTapList(e, post._id)}
                    >
                      <img
                        src={imageUrl}
                        alt={post.title || 'Post'}
                        className="w-full h-auto"
                        style={{ maxHeight: 400, objectFit: 'cover' }}
                        loading="lazy"
                        onError={e => e.target.style.display = 'none'}
                      />
                      {/* Heart animation on double tap */}
                      <HeartAnimation postId={post._id} />
                    </div>
                  )}

                  {/* Content area - flat */}
                  <div className="px-1">
                    {/* Row with avatar, name/title, and icons */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar src={post.author?.avatar} name={post.author?.name} size={32} className="flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {post.author?.name || 'Unknown'}
                          </p>
                          {post.title && (
                            <h3 className="font-extrabold font-display text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
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
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2 self-center">
                        <button 
                          onClick={e => handleLike(e, post._id)} 
                          className="flex items-center gap-1"
                        >
                          {isLiked
                            ? <FaHeart size={16} color="#ef4444" />
                            : <FiHeart size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />}
                          <span className="text-xs font-bold" style={{ color: isLiked ? '#ef4444' : 'var(--text-muted)' }}>
                            {post.likes?.length || 0}
                          </span>
                        </button>
                        <button 
                          onClick={e => toggleCommentInput(e, post._id)}
                          className="flex items-center gap-1"
                        >
                          <FiMessageCircle size={16} strokeWidth={2.3} style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                            {commentCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Time stamp */}
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}
                    </p>

                    {/* Comment Input */}
                    {isCommenting && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <form onSubmit={e => handleCommentSubmit(e, post._id)} className="flex items-center gap-2">
                          <Avatar src={user?.avatar} name={user?.name} size={28} className="flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-input)] rounded-full border px-3 py-1 focus-within:border-amber-500 transition-all" style={{ borderColor: 'var(--border)' }}>
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              className="flex-1 bg-transparent outline-none text-sm py-1.5"
                              style={{ color: 'var(--text-primary)' }}
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={!commentText.trim() || submittingComment}
                              className="flex-shrink-0 text-xs font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {submittingComment ? 'Posting...' : 'Post'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={e => toggleCommentInput(e, post._id)}
                            className="flex-shrink-0"
                          >
                            <FiX size={16} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add CSS animation for heart */}
      <style>{`
        @keyframes likeHeart {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-like-heart {
          animation: likeHeart 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}