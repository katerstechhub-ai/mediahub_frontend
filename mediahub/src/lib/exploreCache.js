import api from '../api'

export const exploreCache = { thoughts: [], nextCursor: null, hasMore: false, reel: [] }
let inflight = null

export function prefetchExplore() {
  if (exploreCache.thoughts.length || inflight) return inflight
  inflight = api.get('/api/thoughts', { params: { limit: 20 } })
    .then((res) => {
      const d = res.data
      const list =
        d?.data?.thoughts ||
        d?.thoughts ||
        (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [])
      exploreCache.thoughts = list
      exploreCache.nextCursor = d?.nextCursor || null
      exploreCache.hasMore = Boolean(d?.hasMore)
    })
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

export function clearExploreCache() {
  exploreCache.thoughts = []
  exploreCache.nextCursor = null
  exploreCache.hasMore = false
  exploreCache.reel = []
}