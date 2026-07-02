import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGrid, FiArrowLeft, FiUser } from 'react-icons/fi'
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent"
        />
      </div>
    )
  }

  const stats = [
    { label: 'Posts', value: userPosts.length },
    { label: 'Likes', value: totalLikes },
    { label: 'Comments', value: totalComments },
  ]

  return (
    <div className="min-h-screen pb-20 fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 pt-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
            <FiArrowLeft size={20} />
          </motion.button>
        </div>

        {/* Avatar + name + stats, side by side, flat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-4"
        >
          <div className="shrink-0">
            <Avatar src={profileUser?.avatar} name={profileUser?.name} size={72} />
          </div>

          <div className="pt-1 flex-1">
            <h2 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>
              {profileUser?.name || 'Unknown User'}
            </h2>
            {profileUser?.email && (
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{profileUser.email}</p>
            )}
            {profileUser?.bio && (
              <p className="text-xs mb-2.5 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{profileUser.bio}</p>
            )}

            <div className="flex gap-5">
              {stats.map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                >
                  <p className="text-base font-extrabold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Posts */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiGrid size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Posts</span>
            </div>
          </div>

          {userPosts.length === 0 ? (
            <EmptyState
              icon={FiUser}
              title="No posts yet"
              description={`${profileUser?.name || 'This user'} hasn't shared anything yet.`}
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
              className="grid grid-cols-3 sm:grid-cols-4 gap-1.5"
            >
              <AnimatePresence>
                {userPosts.map(post => {
                  const imageUrl = getImageUrl(post)
                  return (
                    <motion.div
                      key={post._id || post.id}
                      layout
                      variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      onClick={() => navigate(`/posts/${post._id || post.id}`)}
                      className="cursor-pointer rounded-lg overflow-hidden group relative"
                      style={{ aspectRatio: '1/1', background: 'var(--bg-secondary)' }}
                    >
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
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}