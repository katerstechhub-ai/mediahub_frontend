import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiEdit2, FiSettings, FiShare2, FiDownload, FiLoader, FiPlay, FiLayers, FiPlus, FiHeart } from 'react-icons/fi'
import { useAuthStore, usePostStore } from '../store'
import { Avatar, EmptyState } from '../components/ui'
import { getImageUrls } from '../components/PostMedia'
import api, { authAPI, postsAPI, getDownloadUrl } from '../api'
import toast from 'react-hot-toast'
import Stack from '../components/ui/Stack'
import BounceCards from '../components/ui/BounceCards'
import MemoryVideo from '../components/ui/MemoryVideo'
import DomeGallery from '../components/ui/DomeGallery'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import AvatarCropper from '../components/ui/AvatarCropper'

function getPostMedia(post) {
  const images = getImageUrls(post).filter(Boolean)
  const videos = Array.isArray(post?.videos) ? post.videos : []
  const videoItems = videos.map((video) => ({
    url: video?.url,
    thumbnail: video?.thumbnail || video?.url,
  })).filter((item) => item.url)
  return { images, videos: videoItems }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const { myPosts: userPosts, isLoading, myPostsHasMore, fetchMyPosts } = usePostStore()
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarToCrop, setAvatarToCrop] = useState(null)
  const [downloadingMap, setDownloadingMap] = useState({})

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchMyPosts(true)
      setLoading(false)
    }
    loadData()
  }, [])

  const uploadAvatar = async (file) => {
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

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (file) setAvatarToCrop(file)
    event.target.value = ''
  }

  const handleDeletePost = async (postId, event) => {
    event.stopPropagation()
    if (!window.confirm('Delete this memory?')) return
    try {
      await postsAPI.delete(postId)
      toast.success('Memory deleted')
      await fetchMyPosts(true)
    } catch {
      toast.error('Failed to delete memory')
    }
  }

  const handleDownload = async (postId, url, filename) => {
    if (!url) return
    setDownloadingMap((current) => ({ ...current, [postId]: true }))
    const toastId = toast.loading('Preparing download…')
    try {
      const response = await api.get(getDownloadUrl(url, filename), { responseType: 'blob' })
      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
      toast.success('Download complete', { id: toastId })
    } catch {
      toast.error('Download failed', { id: toastId })
    } finally {
      setDownloadingMap((current) => ({ ...current, [postId]: false }))
    }
  }

  const handleShareProfile = async () => {
    const userId = user?._id || user?.id
    const shareUrl = `${window.location.origin}/profile/${userId}`
    try {
      if (navigator.share) await navigator.share({ title: user?.name || 'Profile', text: `Check out ${user?.name || 'this'}'s memories`, url: shareUrl })
      else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Profile link copied')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Failed to share profile')
    }
  }

  const memoryMedia = useMemo(() => {
    return userPosts.flatMap((post) => {
      const { images, videos } = getPostMedia(post)
      return [
        ...images.map((src) => ({ type: 'image', src, postId: post._id || post.id })),
        ...videos.map((video) => ({ type: 'video', src: video.url, poster: video.thumbnail, postId: post._id || post.id })),
      ]
    }).filter((item) => item.src).sort(() => Math.random() - 0.5).slice(0, 10)
  }, [userPosts])

  const featuredCards = memoryMedia.slice(0, 5).map((item, index) => (
    item.type === 'video' ? (
      <MemoryVideo key={`${item.src}-${index}`} src={item.src} poster={item.poster} className="h-full w-full object-cover" />
    ) : (
      <img key={`${item.src}-${index}`} src={item.src} alt={`Featured memory ${index + 1}`} className="h-full w-full object-cover" draggable={false} />
    )
  ))

  if (loading || isLoading) {
    return (
      <motion.div
        className="flex min-h-dvh flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-primary)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/25"
          animate={{ y: [0, -7, 0], rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
        >
          <FiHeart size={30} fill="currentColor" strokeWidth={1.8} />
          <motion.span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-200"
            animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        </motion.div>
        <div className="flex items-center gap-1.5" aria-label="Loading profile">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-2 w-2 rounded-full bg-amber-500"
              animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: dot * 0.14 }}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] fade-in" style={{ background: 'var(--bg-primary)' }}>
      <ThemeOverlay className="fixed right-4 top-20 z-40 sm:right-6 sm:top-6" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.05] shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={20} />
          </motion.button>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/[0.05] px-4 text-sm font-semibold shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <FiShare2 size={15} /> Share
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.05] shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <FiSettings size={19} />
            </motion.button>
          </div>
        </div>

        <section className="mt-6 flex flex-col items-start gap-5">
          <div className="relative">
            <div className="rounded-full p-1" style={{ background: 'linear-gradient(135deg, #fbbf24, #f3e8d7, #93a6d4)' }}>
              <Avatar src={user?.avatar} name={user?.name} size={72} />
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-white shadow-md"
              style={{ background: '#f59e0b', borderColor: 'var(--bg-primary)' }}
              aria-label="Change profile picture"
            >
              {uploadingAvatar ? <span className="animate-spin">…</span> : <FiEdit2 size={13} />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarChange} />
          </div>

          <div className="text-left">
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'Your memories'}
            </h1>
            {user?.bio && <p className="mt-1 max-w-md text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>}
          </div>

          {featuredCards.length > 0 && (
            <div className="h-[170px] w-[170px] self-start">
              <Stack cards={featuredCards} randomRotation sendToBackOnClick mobileClickOnly />
            </div>
          )}
        </section>

        {memoryMedia.length > 0 && (
          <section className="mt-10 overflow-hidden rounded-3xl border-y py-6" style={{ borderColor: 'var(--border)' }}>
            <div className="mb-2 flex items-center justify-between">
              <div>
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{userPosts.length} posts</span>
            </div>
            <BounceCards images={memoryMedia.slice(0, 5)} containerHeight={230} className="mt-3" />
          </section>
        )}

        {memoryMedia.length > 0 && <DomeGallery images={memoryMedia} onPostSelect={(item) => item.postId && navigate(`/posts/${item.postId}`)} />}

        {myPostsHasMore && userPosts.length > 0 && (
          <div className="flex justify-center py-8">
            <button onClick={() => fetchMyPosts(false)} disabled={isLoading} className="min-h-[44px] rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
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
              <FiLayers size={26} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: '#b45309' }}>A blank page for now</p>
            <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>Your next memory starts here.</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>Save the moments you will want to revisit—one photo, video, or thought at a time.</p>
            <button type="button" onClick={() => navigate('/create')} className="mt-7 flex min-h-[44px] items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-400">
              <FiPlus size={17} /> Make your first memory
            </button>
          </section>
        )}
      </main>
      {avatarToCrop && <AvatarCropper file={avatarToCrop} onCancel={() => setAvatarToCrop(null)} onConfirm={(file) => { setAvatarToCrop(null); uploadAvatar(file) }} />}
    </div>
  )
}
