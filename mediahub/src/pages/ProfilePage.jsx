import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiGrid, FiArrowLeft, FiHeart, FiMessageCircle, FiUser, FiEdit2, FiSettings
} from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { authAPI, postsAPI, commentsAPI } from '../api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const { posts, isLoading, fetchPosts } = usePostStore()
  const [userPosts, setUserPosts] = useState([])
  const [commentCounts, setCommentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchPosts()
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!user) return
    const userId = user._id || user.id
    const filtered = posts.filter(p => {
      const authorId = p.author?._id || p.author?.id || p.author
      return authorId === userId
    })
    setUserPosts(filtered)

    const fetchCounts = async () => {
      const counts = {}
      await Promise.all(filtered.map(async (post) => {
        try {
          const r = await commentsAPI.getByPost(post._id)
          counts[post._id] = (r.data?.data || []).length
        } catch {
          counts[post._id] = post.comments?.length || 0
        }
      }))
      setCommentCounts(counts)
    }
    if (filtered.length > 0) fetchCounts()
  }, [posts, user])

  const getImageUrl = (post) => {
    if (!post) return null
    if (post.image?.url) return post.image.url
    if (post.image && typeof post.image === 'string') return post.image
    if (post.media?.[0]) return post.media[0].url || post.media[0]
    if (post.imageUrl) return post.imageUrl
    if (post.thumbnail) return post.thumbnail
    return null
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const response = await authAPI.updateAvatar(file)
      updateUser(response.data.data)
      toast.success('Profile picture updated')
    } catch {
      toast.error('Failed to update profile picture')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDeletePost = async (postId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this post?')) return
    try {
      await postsAPI.delete(postId)
      toast.success('Post deleted')
      await fetchPosts()
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const totalLikes = userPosts.reduce((a, p) => a + (p.likes?.length || 0), 0)
  const totalComments = Object.values(commentCounts).reduce((a, c) => a + c, 0)

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 pt-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
            <FiArrowLeft size={20} />
          </button>
          <button onClick={() => navigate('/settings')} style={{ color: 'var(--text-primary)' }}>
            <FiSettings size={20} />
          </button>
        </div>

        {/* Avatar + name + stats, side by side, flat */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar src={user?.avatar} name={user?.name} size={72} />
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-white shadow-sm"
              style={{ background: '#f59e0b' }}
            >
              {uploadingAvatar ? '…' : <FiEdit2 size={11} />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarChange} />
          </div>

          <div className="pt-1 flex-1">
            <h2 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </h2>
            <p className="text-xs mb-2.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>

            <div className="flex gap-5">
              {[
                { label: 'Posts', value: userPosts.length, onClick: null },
                { label: 'Likes', value: totalLikes, onClick: () => navigate('/likes') },
                { label: 'Comments', value: totalComments, onClick: () => navigate('/comments') },
              ].map(({ label, value, onClick }) => (
                <div
                  key={label}
                  onClick={onClick || undefined}
                  className={onClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}
                >
                  <p className="text-base font-extrabold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiGrid size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>My Posts</span>
            </div>
          </div>

          {userPosts.length === 0 ? (
            <EmptyState
              icon={FiUser}
              title="No posts yet"
              description="Share your first post with the community!"
              action={
                <button onClick={() => navigate('/create')} className="text-sm font-semibold hover:text-amber-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                  Create Post
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {userPosts.map(post => {
                const imageUrl = getImageUrl(post)
                return (
                  <div
                    key={post._id || post.id}
                    onClick={() => navigate(`/posts/${post._id || post.id}`)}
                    className="cursor-pointer rounded-lg overflow-hidden group relative"
                    style={{ aspectRatio: '1/1', background: 'var(--bg-secondary)' }}
                  >
                    <button
                      onClick={e => handleDeletePost(post._id || post.id, e)}
                      className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                    >
                      ✕
                    </button>

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={post.title || 'Post'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={e => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-[11px] text-center line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                          {post.title || post.content || 'Untitled'}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}