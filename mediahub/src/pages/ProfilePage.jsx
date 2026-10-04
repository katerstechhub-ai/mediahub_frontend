import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiEdit2, FiSettings, FiShare2, FiDownload, FiLoader, FiPlay, FiLayers, FiPlus, FiUser } from 'react-icons/fi'
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
import EmptyMemoryWall from '../components/ui/EmptyMemoryWall'

// Same chip style used by the Explore header
const glassChip = {
  background: 'var(--bg-secondary)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid var(--border)',
  boxShadow: 'none',
}

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
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-primary)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] border border-sky-300/40 bg-[var(--bg-secondary)] text-sky-500 shadow-[0_12px_34px_rgba(14,165,233,0.16)]"
          animate={{ y: [0, -7, 0], rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
        >
          <span aria-hidden="true" className="relative block h-9 w-9 rounded-xl border-2 border-current/70"><span className="absolute -left-1 -top-1 h-6 w-6 rounded-lg border-2 border-current/55" /><span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg border-2 border-current/55" /></span>
          <motion.span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sky-200"
            animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        </motion.div>
        <div className="flex items-center gap-1.5" aria-label="Loading memories">
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
      {/* Sticky header — same liquid-glass bar as the Explore page */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-5 pb-2"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div
          className="relative mx-auto flex max-w-5xl items-center gap-2 sm:gap-3"
          style={{
            height: 58,
            padding: 6,
            borderRadius: 29,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), color-mix(in srgb, var(--bg-primary) 68%, transparent)',
            border: '1px solid color-mix(in srgb, var(--border) 65%, transparent)',
            boxShadow: '0 10px 28px rgba(15,23,42,0.09), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.24)',
            backdropFilter: 'saturate(180%) blur(24px)',
            WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          }}
        >
          <span
            aria-hidden="true"
            style={{ position: 'absolute', left: '18%', right: '18%', bottom: -1, height: 1, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)' }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ ...glassChip, color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={20} strokeWidth={2.5} />
          </motion.button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="hidden sm:flex"
              style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)', boxShadow: '0 6px 16px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.12)' }}
            >
              <FiUser size={20} strokeWidth={2.3} />
            </div>
            <div style={{ lineHeight: 1.15, minWidth: 0 }}>
              <p className="font-display truncate" style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--text-primary)' }}>{user?.name || 'Profile'}</p>
              <p style={{ margin: 0, marginTop: 2, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{userPosts.length} posts</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold sm:px-4"
              style={{ ...glassChip, color: 'var(--text-primary)' }}
            >
              <FiShare2 size={15} strokeWidth={2.5} /> <span className="hidden sm:inline">Share</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ ...glassChip, color: 'var(--text-primary)' }}
            >
              <FiSettings size={19} strokeWidth={2.5} />
            </motion.button>
            <ThemeOverlay className="relative flex h-11 w-11 items-center justify-center rounded-full" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6" style={{ paddingTop: 20 }}>
        <section className="mt-2 flex flex-col items-start gap-5">
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

        {userPosts.length === 0 && <EmptyMemoryWall variant="own" onCreate={() => navigate('/create')} />}
      </main>
      {avatarToCrop && <AvatarCropper file={avatarToCrop} onCancel={() => setAvatarToCrop(null)} onConfirm={(file) => { setAvatarToCrop(null); uploadAvatar(file) }} />}
    </div>
  )
}