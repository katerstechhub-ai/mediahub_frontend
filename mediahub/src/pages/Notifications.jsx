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
        return <FiHeart size={18} color="#ef4444" />
      case 'dislike_post':
        return <FiThumbsDown size={18} color="#64748b" />
      case 'comment':
      case 'reply':
        return <FiMessageCircle size={18} color="#3b82f6" />
      case 'follow':
        return <FiUserPlus size={18} color="#8b5cf6" />
      default:
        return <FiBell size={18} style={{ color: 'var(--text-muted)' }} />
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 border-b backdrop-blur-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium transition-colors hover:text-amber-500"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="ml-auto text-xs font-medium transition-colors hover:text-amber-500"
              style={{ color: 'var(--text-muted)' }}
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {/* Notifications list or empty state */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <FiBell size={40} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No notifications yet
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              When someone likes, comments, or follows you, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => {
                  handleMarkAsRead(notification._id)
                  if (notification.post?._id) {
                    navigate(`/posts/${notification.post._id}`)
                  }
                }}
                className={`flex items-start gap-3 px-4 py-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${
                  !notification.read ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar src={notification.sender?.avatar} name={notification.sender?.name} size={44} />
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {getNotificationMessage(notification)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {notification.createdAt ? dayjs(notification.createdAt).fromNow() : 'Just now'}
                  </p>
                </div>

                {notification.post?.image?.url && (
                  <img
                    src={notification.post.image.url}
                    alt={notification.post.title || 'Post'}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border"
                    style={{ borderColor: 'var(--border)' }}
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}

                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}