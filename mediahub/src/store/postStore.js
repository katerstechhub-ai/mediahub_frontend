import { create } from 'zustand';
import { postsAPI } from '../api';

// Normalizes whatever shape the API returns into a plain array of posts.
// Mirrors the parsing FeedPage already does, so both pages agree on shape.
function extractPosts(responseData) {
  if (responseData?.data?.posts) return responseData.data.posts;
  if (responseData?.posts) return responseData.posts;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
}

export const usePostStore = create((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Uses the shared axios instance (postsAPI) so this respects the same
      // baseURL, auth token injection, and error handling as the rest of the
      // app — no separate fetch(), and NO mock-data fallback. If the request
      // fails, we surface that instead of silently showing fake posts.
      const response = await postsAPI.getAll();
      const data = extractPosts(response.data);
      set({ posts: data, isLoading: false, error: null });
    } catch (error) {
      console.error('Fetch posts error:', error);
      set({ error: error.message, isLoading: false });
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
      set((state) => ({ posts: [newPost, ...state.posts] }));
      return newPost;
    } catch (error) {
      console.error('Create post error:', error);
      throw error;
    }
  },
}));