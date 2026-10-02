import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiDownload, FiLayers, FiLoader, FiPlay, FiShare2, FiUser } from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { getImageUrls } from '../components/PostMedia'
import api, { authAPI, getDownloadUrl } from '../api'
import toast from 'react-hot-toast'
import Stack from '../components/ui/Stack'
import BounceCards from '../components/ui/BounceCards'
import MemoryVideo from '../components/ui/MemoryVideo'
import DomeGallery from '../components/ui/DomeGallery'
import ThemeOverlay from '../components/ui/ThemeOverlay'

function getPostMedia(post) {
  const images = getImageUrls(post).filter(Boolean)
  const videos = (Array.isArray(post?.videos) ? post.videos : []).map((video) => ({
    url: video?.url,
    thumbnail: video?.thumbnail || video?.url,
  })).filter((item) => item.url)
  return { images, videos }
}

export default function UserProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { authorPosts: userPosts, isAuthorLoading: isLoading, authorPostsHasMore, fetchAuthorPosts } = usePostStore()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadingMap, setDownloadingMap] = useState({})

  useEffect(() => {
    const myId = currentUser?._id || currentUser?.id
    if (myId && String(myId) === String(userId)) navigate('/profile', { replace: true })
  }, [userId, currentUser])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await authAPI.getUserProfile(userId)
        setProfileUser(response.data?.data || null)
      } catch {
        setProfileUser(null)
      }
      await fetchAuthorPosts(userId, true)
      setLoading(false)
    }
    loadData()
  }, [userId])

  useEffect(() => {
    if (!profileUser && userPosts.length > 0) setProfileUser(userPosts[0].author)
  }, [userPosts, profileUser])

  const memoryMedia = useMemo(() => userPosts.flatMap((post) => {
    const { images, videos } = getPostMedia(post)
    return [
      ...images.map((src) => ({ type: 'image', src, postId: post._id || post.id })),
      ...videos.map((video) => ({ type: 'video', src: video.url, poster: video.thumbnail, postId: post._id || post.id })),
    ]
  }).filter((item) => item.src).sort(() => Math.random() - 0.5).slice(0, 10), [userPosts])

  const featuredCards = memoryMedia.slice(0, 5).map((item, index) => (
    item.type === 'video' ? (
      <MemoryVideo key={`${item.src}-${index}`} src={item.src} poster={item.poster} className="h-full w-full object-cover" />
    ) : (
      <img key={`${item.src}-${index}`} src={item.src} alt={`Featured memory ${index + 1}`} className="h-full w-full object-cover" draggable={false} />
    )
  ))

  const handleDownload = async (postId, url, filename) => {
    if (!url) return
    setDownloadingMap((current) => ({ ...current, [postId]: true }))
    const toastId = toast.loading('Preparing download…')
    try {
      const response = await api.get(getDownloadUrl(url, filename), { responseType: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([response.data]))
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download complete', { id: toastId })
    } catch {
      toast.error('Download failed', { id: toastId })
    } finally {
      setDownloadingMap((current) => ({ ...current, [postId]: false }))
    }
  }

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/users/${userId}`
    try {
      if (navigator.share) await navigator.share({ title: profileUser?.name || 'Profile', text: `Check out ${profileUser?.name || 'this'}'s memories`, url: shareUrl })
      else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Profile link copied')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Failed to share profile')
    }
  }

  if (loading || isLoading) {
    return <div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--bg-primary)' }}><div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
  }

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] fade-in" style={{ background: 'var(--bg-primary)' }}>
      <ThemeOverlay className="fixed right-4 top-20 z-40 sm:right-6 sm:top-6" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.05] shadow-[0_6px_18px_rgba(15,23,42,0.06)]" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <FiArrowLeft size={20} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleShareProfile} aria-label="Share profile" className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/[0.05] px-4 text-sm font-semibold shadow-[0_6px_18px_rgba(15,23,42,0.06)]" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <FiShare2 size={15} /> Share
          </motion.button>
        </div>

        <section className="mt-6 flex flex-col items-start gap-5">
          <div className="rounded-full p-1" style={{ background: 'linear-gradient(135deg, #fbbf24, #f3e8d7, #93a6d4)' }}>
            <Avatar src={profileUser?.avatar} name={profileUser?.name} size={72} />
          </div>
          <div className="text-left">
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>{profileUser?.name || 'Unknown User'}</h1>
            {profileUser?.bio && <p className="mt-1 max-w-md text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profileUser.bio}</p>}
          </div>
          {featuredCards.length > 0 && <div className="h-[170px] w-[170px] self-start"><Stack cards={featuredCards} randomRotation sendToBackOnClick mobileClickOnly /></div>}
        </section>

        {memoryMedia.length > 0 && (
          <section className="mt-10 overflow-hidden rounded-3xl border-y py-6" style={{ borderColor: 'var(--border)' }}>
            <BounceCards images={memoryMedia.slice(0, 5)} containerHeight={230} className="mt-3" />
          </section>
        )}

        {memoryMedia.length > 0 && <DomeGallery images={memoryMedia} onPostSelect={(item) => item.postId && navigate(`/posts/${item.postId}`)} />}

        {authorPostsHasMore && userPosts.length > 0 && (
          <div className="flex justify-center py-8">
            <button onClick={() => fetchAuthorPosts(userId, false)} disabled={isLoading} className="min-h-[44px] rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {isLoading ? 'Loading…' : 'Load more memories'}
            </button>
          </div>
        )}

        {userPosts.length === 0 && (
          <section className="mt-12 flex flex-col items-center border-y py-14 text-center sm:mt-16 sm:py-20">
            <div
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: '#f59e0b' }}
            >
              <FiUser size={25} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: '#b45309' }}>Memory wall not started</p>
            <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>{profileUser?.name || 'This person'} has no memories yet.</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>There is nothing here yet—but the next chapter can start with a single shared moment.</p>
          </section>
        )}
      </main>
    </div>
  )
}
