import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiArrowLeft, FiHeart, FiMessageCircle, FiUserPlus, FiThumbsDown } from 'react-icons/fi'
import { notificationsAPI } from '../api'
import { Avatar } from '../components/ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

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
      <div className="max-w-2xl mx-auto">
        {/* Header — matches FeedPage/Explore header weight and spacing */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 py-4 border-b backdrop-blur-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-[var(--bg-secondary)] transition-colors"
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

        {/* Notifications list or empty state */}
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
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => {
                  handleMarkAsRead(notification._id)
                  if (notification.post?._id) {
                    navigate(`/posts/${notification.post._id}`)
                  }
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer relative"
                style={{ background: !notification.read ? 'rgba(245,158,11,0.07)' : 'transparent' }}
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

                {notification.post?.image?.url && (
                  <img
                    src={notification.post.image.url}
                    alt={notification.post.title || 'Post'}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}

                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}