import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, animate } from 'framer-motion'
import { FiBell, FiArrowLeft, FiHeart, FiMessageCircle, FiUserPlus, FiThumbsDown, FiTrash2, FiLayers, FiPlay } from 'react-icons/fi'
import { notificationsAPI, postsAPI } from '../api'
import { Avatar } from '../components/ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const DELETE_THRESHOLD = -80

function SwipeableRow({ notificationId, onDelete, children }) {
  const x = useMotionValue(0)
  const [dragging, setDragging] = useState(false)

  const handleDragEnd = (event, info) => {
    setDragging(false)
    if (info.offset.x < DELETE_THRESHOLD) {
      animate(x, -400, {
        duration: 0.2,
        onComplete: () => onDelete(notificationId),
      })
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 })
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-2xl">
        <FiTrash2 size={20} color="#fff" />
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.15}
        style={{ x }}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {React.cloneElement(children, {
          onClickCapture: (e) => {
            if (dragging) {
              e.stopPropagation()
              e.preventDefault()
            }
          },
        })}
      </motion.div>
    </div>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbnailsMap, setThumbnailsMap] = useState({}) // cache fetched thumbnails
  const [fetchingMap, setFetchingMap] = useState({}) // track which posts are being fetched

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll()
      setNotifications(response.data?.data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    const previous = notifications
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId))
    try {
      await notificationsAPI.delete(notificationId)
    } catch (error) {
      console.error('Error deleting notification:', error)
      setNotifications(previous)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return <FiHeart size={14} color="#ef4444" />
      case 'dislike_post':
        return <FiThumbsDown size={14} color="#64748b" />
      case 'comment':
      case 'reply':
        return <FiMessageCircle size={14} color="#3b82f6" />
      case 'follow':
        return <FiUserPlus size={14} color="#8b5cf6" />
      default:
        return <FiBell size={14} style={{ color: 'var(--text-muted)' }} />
    }
  }

  const getNotificationMessage = (notification) => {
    const userName = notification.sender?.name || 'Someone'
    const postTitle = notification.post?.title || 'your post'
    switch (notification.type) {
      case 'like_post':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' liked '}
            <span className="font-medium">{postTitle}</span>
          </span>
        )
      case 'dislike_post':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' disliked '}
            <span className="font-medium">{postTitle}</span>
          </span>
        )
      case 'comment':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' commented: '}
            <span className="font-medium">"{notification.comment?.content || ''}"</span>
            {' on '}
            <span className="font-medium">{postTitle}</span>
          </span>
        )
      case 'reply':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' replied: '}
            <span className="font-medium">"{notification.comment?.content || ''}"</span>
          </span>
        )
      case 'like_comment':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' liked your comment'}
          </span>
        )
      case 'follow':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' started following you'}
          </span>
        )
      default:
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' interacted with '}
            <span className="font-medium">{postTitle}</span>
          </span>
        )
    }
  }

  // ── Extract thumbnail from a post object ──
  const extractThumbnail = (post) => {
    if (!post) return null

    // Videos
    if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
      const video = post.videos[0]
      const url = video?.thumbnail || video?.url || null
      if (url) return { url, isVideo: true, multiple: false }
    }

    // Images array
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      const first = post.images[0]
      const url = typeof first === 'string' ? first : first?.url
      if (url) return { url, isVideo: false, multiple: post.images.length > 1 }
    }

    // media array (legacy)
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      const first = post.media[0]
      const url = typeof first === 'string' ? first : first?.url
      if (url) return { url, isVideo: first?.resource_type === 'video', multiple: post.media.length > 1 }
    }

    // Single image fields
    const singleFields = [
      post.image?.url,
      post.image,
      post.imageUrl,
      post.thumbnail,
      post.coverImage,
      post.cover,
      post.preview,
      post.previewImage,
    ]
    for (const val of singleFields) {
      if (typeof val === 'string' && val.startsWith('http')) {
        return { url: val, isVideo: false, multiple: false }
      }
    }

    // Brute‑force: scan all keys for URL strings
    for (const key in post) {
      const val = post[key]
      if (typeof val === 'string' && val.startsWith('http')) {
        return { url: val, isVideo: false, multiple: false }
      }
      if (val && typeof val === 'object' && val.url && typeof val.url === 'string' && val.url.startsWith('http')) {
        return { url: val.url, isVideo: false, multiple: false }
      }
    }

    return null
  }

  // ── Fetch full post data for a given post ID ──
  const fetchFullPostThumbnail = async (postId) => {
    if (!postId) return
    if (fetchingMap[postId]) return // already fetching
    if (thumbnailsMap[postId]) return // already cached

    setFetchingMap((prev) => ({ ...prev, [postId]: true }))
    try {
      const response = await postsAPI.getOne(postId)
      const fullPost = response.data?.data || response.data?.post || response.data || null
      if (fullPost) {
        const thumb = extractThumbnail(fullPost)
        if (thumb) {
          setThumbnailsMap((prev) => ({ ...prev, [postId]: thumb }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch post for thumbnail:', error)
    } finally {
      setFetchingMap((prev) => ({ ...prev, [postId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 hover:bg-[var(--bg-secondary)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={19} />
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Mark all read · {unreadCount}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--bg-secondary)' }}>
              <FiBell size={40} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-xl font-extrabold font-display mb-2" style={{ color: 'var(--text-primary)' }}>
              No notifications yet
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              When someone likes, comments, or follows you, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-3 flex flex-col gap-1.5">
            {notifications.map((notification) => {
              const post = notification.post
              // First, check if we have a cached thumbnail from a full fetch
              let thumbnail = post ? thumbnailsMap[post._id] || null : null
              // If not cached, try to extract from the current post object
              if (!thumbnail && post) {
                thumbnail = extractThumbnail(post)
                // If still null and we have a post ID, trigger a full fetch
                if (!thumbnail && post._id && !fetchingMap[post._id] && !thumbnailsMap[post._id]) {
                  fetchFullPostThumbnail(post._id)
                }
              }

              const fallbackColor = post?._id
                ? `hsl(${parseInt(post._id.slice(-6), 16) % 360}, 70%, 55%)`
                : 'var(--bg-secondary)'
              const initial = post?.title?.[0]?.toUpperCase() || '📄'

              return (
                <SwipeableRow
                  key={notification._id}
                  notificationId={notification._id}
                  onDelete={handleDeleteNotification}
                >
                  <div
                    onClick={() => {
                      handleMarkAsRead(notification._id)
                      if (post?._id) navigate(`/posts/${post._id}`)
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                    style={{ background: !notification.read ? 'rgba(245,158,11,0.07)' : 'var(--bg-primary)' }}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={notification.sender?.avatar} name={notification.sender?.name} size={44} ring={!notification.read} />
                      <div
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
                        style={{ background: 'var(--bg-primary)', borderColor: 'var(--bg-primary)' }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                        {notification.createdAt ? dayjs(notification.createdAt).fromNow() : 'Just now'}
                      </p>
                    </div>

                    {thumbnail?.url ? (
                      <div className="relative flex-shrink-0">
                        <img
                          src={thumbnail.url}
                          alt={post?.title || 'Post'}
                          className="w-12 h-12 rounded-xl object-cover"
                          onError={(e) => {
                            console.error('❌ Image failed to load:', thumbnail.url)
                            e.target.style.display = 'none'
                          }}
                        />
                        {thumbnail.isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                            <FiPlay size={14} color="#fff" className="drop-shadow" />
                          </div>
                        )}
                        {thumbnail.multiple && !thumbnail.isVideo && (
                          <div className="absolute -top-1 -right-1 bg-black/70 backdrop-blur-sm rounded-full p-0.5">
                            <FiLayers size={10} strokeWidth={2.5} color="#fff" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                        style={{ background: fallbackColor }}
                      >
                        {initial}
                      </div>
                    )}

                    {!notification.read && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                  </div>
                </SwipeableRow>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}