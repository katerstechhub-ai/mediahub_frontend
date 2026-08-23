import { create } from 'zustand';
import { postsAPI } from '../api';

// Normalizes whatever shape the API returns into { posts, nextCursor, hasMore }.
function extractPage(responseData) {
  const posts = Array.isArray(responseData?.data) ? responseData.data : [];
  return {
    posts,
    nextCursor: responseData?.nextCursor ?? null,
    hasMore: !!responseData?.hasMore,
  };
}

// This store is for posts scoped to ONE author at a time — the logged-in
// user's own posts (ProfilePage, CommentsPage, LikesPage) or another user's
// posts (UserProfilePage). It is NOT the global feed — FeedPage/ExplorePage
// page through postsAPI.getAll() themselves with their own local state,
// since that list is unbounded and independent of any single author.
//
// myPosts and authorPosts are kept as separate slices (not shared) so that
// visiting someone else's profile never clobbers your own cached post list,
// and vice versa.
export const usePostStore = create((set, get) => ({
  myPosts: [],
  myPostsCursor: null,
  myPostsHasMore: true,
  isLoading: false,
  error: null,

  authorId: null,
  authorPosts: [],
  authorPostsCursor: null,
  authorPostsHasMore: true,
  isAuthorLoading: false,
  authorError: null,

  // reset=true (default) replaces the list — use for the initial load or a
  // hard refresh (e.g. after deleting a post). reset=false appends the next
  // page, for "load more" / infinite scroll.
  fetchMyPosts: async (reset = true) => {
    if (reset) {
      set({ isLoading: true, error: null, myPosts: [], myPostsCursor: null, myPostsHasMore: true });
    } else {
      if (!get().myPostsHasMore || get().isLoading) return;
      set({ isLoading: true, error: null });
    }
    try {
      const before = reset ? undefined : get().myPostsCursor;
      const response = await postsAPI.getMyPosts(before ? { before } : {});
      const { posts, nextCursor, hasMore } = extractPage(response.data);
      set((state) => ({
        myPosts: reset ? posts : [...state.myPosts, ...posts],
        myPostsCursor: nextCursor,
        myPostsHasMore: hasMore,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Fetch my posts error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAuthorPosts: async (authorId, reset = true) => {
    // Switching to a different author always starts a fresh list.
    const switchingAuthor = get().authorId !== authorId;
    if (reset || switchingAuthor) {
      set({
        isAuthorLoading: true,
        authorError: null,
        authorId,
        authorPosts: [],
        authorPostsCursor: null,
        authorPostsHasMore: true,
      });
    } else {
      if (!get().authorPostsHasMore || get().isAuthorLoading) return;
      set({ isAuthorLoading: true, authorError: null });
    }
    try {
      const before = (reset || switchingAuthor) ? undefined : get().authorPostsCursor;
      const response = await postsAPI.getByAuthor(authorId, before ? { before } : {});
      const { posts, nextCursor, hasMore } = extractPage(response.data);
      set((state) => ({
        authorPosts: (reset || switchingAuthor) ? posts : [...state.authorPosts, ...posts],
        authorPostsCursor: nextCursor,
        authorPostsHasMore: hasMore,
        isAuthorLoading: false,
      }));
    } catch (error) {
      console.error('Fetch author posts error:', error);
      set({ authorError: error.message, isAuthorLoading: false });
    }
  },

  createPost: async (postData) => {
    try {
      const formData = new FormData();
      if (postData.title) formData.append('title', postData.title);
      // Backend expects "content"; accept "caption" too for backward compatibility
      const content = postData.content ?? postData.caption;
      if (content) formData.append('content', content);
      if (postData.tags) formData.append('tags', JSON.stringify(postData.tags));
      // Backend expects the field name "images" and accepts up to 5 files
      const files = (postData.images || postData.media || []).filter(m => m instanceof File);
      files.forEach(file => formData.append('images', file));

      const response = await postsAPI.create(formData);
      const newPost = response.data?.data || response.data;
      set((state) => ({ myPosts: [newPost, ...state.myPosts] }));
      return newPost;
    } catch (error) {
      console.error('Create post error:', error);
      throw error;
    }
  },
}));