import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHeart, FiUser } from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { postsAPI } from '../api'

export default function LikesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posts, fetchPosts } = usePostStore()
  const [likedPosts, setLikedPosts] = useState([]) // [{ post, likers }]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchPosts()
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!user || posts.length === 0) return

    const userId = user._id || user.id
    const myPosts = posts.filter(p => {
      const authorId = p.author?._id || p.author?.id || p.author
      return String(authorId) === String(userId) && (p.likes?.length || 0) > 0
    })

    const loadLikers = async () => {
      const results = await Promise.all(
        myPosts.map(async (post) => {
          try {
            const res = await postsAPI.getLikers(post._id)
            return { post, likers: res.data?.data || [], failed: false }
          } catch {
            // Backend endpoint may not be live yet — fall back gracefully
            return { post, likers: [], failed: true }
          }
        })
      )
      setLikedPosts(results)
    }

    loadLikers()
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

  const goToProfile = (author) => {
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    if (String(authorId) === String(myId)) {
      navigate('/profile')
    } else {
      navigate(`/users/${authorId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
            <FiArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>Likes</h1>
        </div>

        <div className="px-4 py-5">
          {likedPosts.length === 0 ? (
            <EmptyState
              icon={FiHeart}
              title="No likes yet"
              description="When someone likes your posts, they'll show up here."
            />
          ) : (
            <div className="space-y-5">
              {likedPosts.map(({ post, likers, failed }) => {
                const imageUrl = getImageUrl(post)
                return (
                  <div
                    key={post._id}
                    className="rounded-2xl p-3 flex gap-3"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    {/* Post thumbnail */}
                    <div
                      onClick={() => navigate(`/posts/${post._id}`)}
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                      style={{ background: 'var(--bg-primary)' }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={post.title || 'Post'} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiUser size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => navigate(`/posts/${post._id}`)}
                        className="text-sm font-bold truncate cursor-pointer hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {post.title || 'Untitled post'}
                      </p>
                      <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: '#ef4444' }}>
                        <FiHeart size={12} style={{ fill: '#ef4444' }} /> {post.likes?.length || 0} like{(post.likes?.length || 0) !== 1 ? 's' : ''}
                      </p>

                      {failed ? (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Couldn't load who liked this yet</p>
                      ) : likers.length === 0 ? (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>No details available</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {likers.map(liker => (
                            <button
                              key={liker._id}
                              onClick={() => goToProfile(liker)}
                              className="flex items-center gap-1.5 pr-2.5 pl-1 py-1 rounded-full hover:bg-[var(--bg-primary)] transition-colors"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              <Avatar src={liker.avatar} name={liker.name} size={20} />
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{liker.name}</span>
                            </button>
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
    </div>
  )
}