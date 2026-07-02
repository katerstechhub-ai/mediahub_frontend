import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiMessageCircle, FiUser, FiTrash2, FiMoreHorizontal, FiX } from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { commentsAPI } from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export default function CommentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posts, fetchPosts } = usePostStore()
  const [commentedPosts, setCommentedPosts] = useState([]) // [{ post, comments }]
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { postIndex, commentId }
  const [deleting, setDeleting] = useState(false)

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
      return String(authorId) === String(userId)
    })

    const loadComments = async () => {
      const results = await Promise.all(
        myPosts.map(async (post) => {
          try {
            const res = await commentsAPI.getByPost(post._id)
            return { post, comments: res.data?.data || [] }
          } catch {
            return { post, comments: [] }
          }
        })
      )
      // Only keep posts that actually have comments
      setCommentedPosts(results.filter(r => r.comments.length > 0))
    }

    loadComments()
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

  const requestDelete = (postIndex, commentId) => {
    setOpenMenuId(null)
    setDeleteTarget({ postIndex, commentId })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await commentsAPI.delete(deleteTarget.commentId)
      toast.success('Comment deleted')
      setCommentedPosts(prev => {
        const next = [...prev]
        const entry = next[deleteTarget.postIndex]
        const remaining = entry.comments.filter(c => c._id !== deleteTarget.commentId)
        if (remaining.length === 0) {
          next.splice(deleteTarget.postIndex, 1)
        } else {
          next[deleteTarget.postIndex] = { ...entry, comments: remaining }
        }
        return next
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
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
    <>
      <div className="min-h-screen pb-20 fade-in" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b backdrop-blur-lg px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
              <FiArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>Comments</h1>
          </div>

          <div className="px-4 py-5">
            {commentedPosts.length === 0 ? (
              <EmptyState
                icon={FiMessageCircle}
                title="No comments yet"
                description="When someone comments on your posts, they'll show up here."
              />
            ) : (
              <div className="space-y-6">
                {commentedPosts.map(({ post, comments }, postIndex) => {
                  const imageUrl = getImageUrl(post)
                  return (
                    <div key={post._id} className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      {/* Post header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          onClick={() => navigate(`/posts/${post._id}`)}
                          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                          style={{ background: 'var(--bg-primary)' }}
                        >
                          {imageUrl ? (
                            <img src={imageUrl} alt={post.title || 'Post'} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiUser size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            onClick={() => navigate(`/posts/${post._id}`)}
                            className="text-sm font-bold truncate cursor-pointer hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {post.title || 'Untitled post'}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {comments.length} comment{comments.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Comments on this post */}
                      <div className="space-y-3 pl-1">
                        {comments.map(c => (
                          <div key={c._id} className="flex gap-2.5 items-start">
                            <div onClick={() => goToProfile(c.author)} className="cursor-pointer flex-shrink-0">
                              <Avatar src={c.author?.avatar} name={c.author?.name} size={28} className="mt-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm leading-snug flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                                  <span
                                    onClick={() => goToProfile(c.author)}
                                    className="font-bold mr-1.5 cursor-pointer hover:underline"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {c.author?.name || 'Unknown'}
                                  </span>
                                  {c.content || c.text || ''}
                                </p>
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={() => setOpenMenuId(openMenuId === c._id ? null : c._id)}
                                    className="p-1 rounded-full hover:bg-[var(--bg-primary)] transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <FiMoreHorizontal size={15} />
                                  </button>
                                  {openMenuId === c._id && (
                                    <div className="absolute right-0 top-6 rounded-xl shadow-lg border py-1 w-32 z-10" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                                      <button
                                        onClick={() => requestDelete(postIndex, c._id)}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                                      >
                                        <FiTrash2 size={13} /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {c.createdAt ? dayjs(c.createdAt).fromNow() : 'Just now'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal — same style as PostDetailPage/FeedPage */}
      <div
        className="fixed inset-0 flex items-center justify-center px-4 transition-opacity duration-200"
        style={{
          zIndex: 10000,
          background: 'rgba(0,0,0,0.6)',
          opacity: deleteTarget ? 1 : 0,
          pointerEvents: deleteTarget ? 'all' : 'none',
        }}
        onClick={() => !deleting && setDeleteTarget(null)}
      >
        <div
          className="relative h-40 w-full max-w-sm rounded-3xl px-8 flex flex-col items-center justify-center transition-transform duration-200"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            transform: deleteTarget ? 'scale(1)' : 'scale(0.95)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => !deleting && setDeleteTarget(null)}
            disabled={deleting}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>

          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <FiTrash2 size={28} color="#ef4444" strokeWidth={2.5} />
          </div>

          <h3 className="text-base font-extrabold text-center font-display px-2" style={{ color: 'var(--text-primary)' }}>
            Are you sure you want to delete this comment?
          </h3>

          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full font-bold text-sm border transition-colors disabled:opacity-50"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              No, cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="font-bold text-sm transition-colors disabled:opacity-60"
              style={{ color: '#ef4444' }}
            >
              {deleting ? 'Deleting…' : "Yes, I'm sure"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}