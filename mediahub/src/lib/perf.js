// src/lib/perf.js
// Speed helpers for MediaHub: Cloudinary thumbnails, a saved feed snapshot
// (so the feed paints instantly while fresh data loads), and a backend wake-up ping.

import { API_URL } from '../api'

/* ─────────── 1. Cloudinary thumbnails ───────────
   Adds f_auto (best format), q_auto (smart quality) and a width to a Cloudinary
   URL so grid tiles download ~30-80 KB instead of the full original.
   Use for IMAGES and video POSTERS only, never for the <video src> itself.
   Leaves the URL alone if it isn't Cloudinary or already has transformations. */
export function thumb(url, width = 400) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  const after = url.split('/upload/')[1] || ''
  // A plain upload URL starts with a version segment like v1712345678/
  if (!/^v\d+\//.test(after)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}

/* ─────────── 2. Feed snapshot (saved first page of the feed) ───────────
   Stored per user (or "guest") so one person's feed never shows for another. */
const SNAPSHOT_PREFIX = 'feed-snapshot:v1:'
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000 // ignore snapshots older than 3 days

const keyFor = (userId) => SNAPSHOT_PREFIX + (userId || 'guest')

export function readFeedSnapshot(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const snap = JSON.parse(raw)
    if (!snap || !Array.isArray(snap.posts) || snap.posts.length === 0) return null
    if (Date.now() - (snap.savedAt || 0) > MAX_AGE_MS) return null
    return snap
  } catch {
    return null
  }
}

// Save ONLY the first page (posts + the cursor that belongs to that page).
export function saveFeedSnapshot(userId, { posts, nextCursor, hasMore }) {
  try {
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ savedAt: Date.now(), posts, nextCursor, hasMore })
    )
  } catch {
    // storage full or blocked (private mode): the feed just loads the normal way
  }
}

// Called when a post is deleted so it can't reappear from a saved snapshot.
export function removeFromFeedSnapshot(postId) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(SNAPSHOT_PREFIX)) continue
      const snap = JSON.parse(localStorage.getItem(key))
      if (!snap || !Array.isArray(snap.posts)) continue
      snap.posts = snap.posts.filter((p) => String(p._id || p.id) !== String(postId))
      localStorage.setItem(key, JSON.stringify(snap))
    }
  } catch {
    // ignore
  }
}

// Called on logout / expired session.
export function clearFeedSnapshots() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(SNAPSHOT_PREFIX)) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

/* ─────────── 3. Wake the Render backend early ───────────
   Render's free tier sleeps when idle. Firing a tiny request the moment the app
   loads starts the wake-up while the JS bundle and auth check are still running. */
export function warmBackend() {
  try {
    fetch(`${API_URL}/api/posts?limit=1`, { cache: 'no-store' }).catch(() => {})
  } catch {
    // ignore
  }
}

/* ─────────── 4. Lighter videos ───────────
   Phone videos are often big .mov files (iPhone HEVC) that many browsers can't
   play and that download at full size. This asks Cloudinary for a width-limited
   H.264 .mp4 copy instead. Use for the <video src> only. If Cloudinary can't
   produce that copy, the players fall back to the original file. */
export function videoSrc(url, width = 720) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return url
  const after = url.split('/video/upload/')[1] || ''
  // Only plain upload URLs (version segment first); leave transformed URLs alone
  if (!/^v\d+\//.test(after)) return url
  return url
    .replace('/video/upload/', `/video/upload/f_mp4,vc_h264,q_auto,c_limit,w_${width}/`)
    .replace(/\.\w+(\?.*)?$/, '.mp4')
}