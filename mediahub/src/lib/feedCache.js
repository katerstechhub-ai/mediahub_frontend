/* Feed state cache
   Lives at module level, so it survives FeedPage unmounting when you open a
   post / profile and come back with Back. FeedPage restores the loaded posts,
   view mode, filters and scroll position from here. Kept in its own file so
   other pages (e.g. PostDetailPage) can update it — for example removing a
   post that was just deleted, so it doesn't reappear when you go back. */

export const feedCache = {
  posts: null,
  nextCursor: null,
  hasMore: false,
  viewMode: 'grid',
  query: '',
  selectedMonth: 'all',
  scrollY: 0,
}

export function removePostFromFeedCache(postId) {
  if (!Array.isArray(feedCache.posts)) return
  feedCache.posts = feedCache.posts.filter((p) => String(p._id || p.id) !== String(postId))
}