import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiGrid, FiArrowLeft, FiHeart, FiMessageCircle, FiUser } from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { commentsAPI } from '../api'

export default function UserProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { posts, isLoading, fetchPosts } = usePostStore()

  const [profileUser, setProfileUser] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [commentCounts, setCommentCounts] = useState({})
  const [loading, setLoading] = useState(true)

  // If someone lands on their own id, bounce to the real profile page
  useEffect(() => {
    const myId = currentUser?._id || currentUser?.id
    if (myId && String(myId) === String(userId)) {
      navigate('/profile', { replace: true })
    }
  }, [userId, currentUser])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchPosts()
      setLoading(false)
    }
    loadData()
  }, [userId])

  useEffect(() => {
    const filtered = posts.filter(p => {
      const authorId = p.author?._id || p.author?.id || p.author
      return String(authorId) === String(userId)
    })
    setUserPosts(filtered)

    if (filtered.length > 0) {
      setProfileUser(filtered[0].author)
    }

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
  }, [posts, userId])

  const getImageUrl = (post) => {
    if (!post) return null
    if (post.image?.url) return post.image.url
    if (post.image && typeof post.image === 'string') return post.image
    if (post.media?.[0]) return post.media[0].url || post.media[0]
    if (post.imageUrl) return post.imageUrl
    if (post.thumbnail) return post.thumbnail
    return null
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
      <div className="max-w-3xl mx-auto">
        {/* Header with soft gradient backdrop */}
        <div
          className="relative px-4 pt-5 pb-16"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 55%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <FiArrowLeft size={18} />
            </button>
          </div>
        </div>

        {/* Profile card — overlaps the gradient header */}
        <div className="px-4 -mt-12">
          <div
            className="rounded-3xl shadow-sm px-6 py-7 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <Avatar src={profileUser?.avatar} name={profileUser?.name} size={84} ring />

            <h2 className="text-xl font-extrabold font-display mt-4" style={{ color: 'var(--text-primary)' }}>
              {profileUser?.name || 'Unknown User'}
            </h2>
            {profileUser?.email && (
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{profileUser.email}</p>
            )}
            {profileUser?.bio && (
              <p className="text-sm mt-2 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{profileUser.bio}</p>
            )}

            <div className="flex gap-10 mt-5 mb-1">
              {[
                { label: 'Posts', value: userPosts.length },
                { label: 'Likes', value: totalLikes },
                { label: 'Comments', value: totalComments },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Posts grid — view only, no delete */}
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <FiGrid size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Posts</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {userPosts.length}
            </span>
          </div>

          {userPosts.length === 0 ? (
            <EmptyState
              icon={FiUser}
              title="No posts yet"
              description={`${profileUser?.name || 'This user'} hasn't shared anything yet.`}
            />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {userPosts.map(post => {
                const imageUrl = getImageUrl(post)
                return (
                  <div
                    key={post._id || post.id}
                    onClick={() => navigate(`/posts/${post._id || post.id}`)}
                    className="cursor-pointer rounded-xl overflow-hidden group relative"
                    style={{ aspectRatio: '1/1', background: 'var(--bg-secondary)' }}
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={post.title || 'Post'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={e => e.target.style.display = 'none'}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-semibold">
                          <span className="flex items-center gap-1"><FiHeart size={12} /> {post.likes?.length || 0}</span>
                          <span className="flex items-center gap-1"><FiMessageCircle size={12} /> {commentCounts[post._id] ?? 0}</span>
                        </div>
                      </>
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