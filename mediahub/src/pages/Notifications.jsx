import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, animate } from 'framer-motion'
import { FiBell, FiArrowLeft, FiHeart, FiMessageCircle, FiUserPlus, FiThumbsDown, FiTrash2, FiLayers } from 'react-icons/fi'
import { notificationsAPI } from '../api'
import { Avatar } from '../components/ui'
import { getImageUrls } from '../components/PostMedia'
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
            // Suppress the row's onClick if this was actually a drag, not a tap
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

  React.useEffect(() => {
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
    // Optimistically remove from UI first
    const previous = notifications
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId))
    try {
      await notificationsAPI.delete(notificationId)
    } catch (error) {
      console.error('Error deleting notification:', error)
      // Roll back on failure
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
    switch (notification.type) {
      case 'like_post':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' liked your post '}
            <span className="font-medium">{notification.post?.title || ''}</span>
          </span>
        )
      case 'dislike_post':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' disliked your post '}
            <span className="font-medium">{notification.post?.title || ''}</span>
          </span>
        )
      case 'comment':
        return (
          <span>
            <span className="font-semibold">{userName}</span>
            {' commented: '}
            <span className="font-medium">"{notification.comment?.content || ''}"</span>
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
            {' interacted with your post'}
          </span>
        )
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
      {/* Sticky header — matches Feed/Explore header treatment: plain
          background, no border/blur, consistent px-4 sm:px-6 py-3 rhythm */}
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
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'var(--bg-secondary)' }}
            >
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
              const postImages = getImageUrls(notification.post)
              const thumbnailUrl = postImages[0]
              const hasMultiple = postImages.length > 1

              return (
                <SwipeableRow
                  key={notification._id}
                  notificationId={notification._id}
                  onDelete={handleDeleteNotification}
                >
                  <div
                    onClick={() => {
                      handleMarkAsRead(notification._id)
                      if (notification.post?._id) {
                        navigate(`/posts/${notification.post._id}`)
                      }
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

                    {thumbnailUrl && (
                      <div className="relative flex-shrink-0">
                        <img
                          src={thumbnailUrl}
                          alt={notification.post?.title || 'Post'}
                          className="w-12 h-12 rounded-xl object-cover"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                        {hasMultiple && (
                          <div
                            className="absolute -top-1 -right-1 bg-black/70 backdrop-blur-sm rounded-full p-0.5"
                            aria-label={`${postImages.length} photos`}
                          >
                            <FiLayers size={10} strokeWidth={2.5} color="#fff" />
                          </div>
                        )}
                      </div>
                    )}

                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
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