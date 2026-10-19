import { notificationsAPI } from '../api'

export const notifCache = { items: null, thumbs: {} }
let inflight = null

export function prefetchNotifications() {
  if (notifCache.items || inflight) return inflight
  inflight = notificationsAPI.getAll(1, 30)
    .then((r) => { notifCache.items = r.data?.data || [] })
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

// Call this in your logout handler so the next user never sees old items
export function clearNotificationsCache() {
  notifCache.items = null
  notifCache.thumbs = {}
}