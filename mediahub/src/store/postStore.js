import { create } from 'zustand';

export const usePostStore = create((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  
  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current user from auth store
      const { useAuthStore } = await import('./AuthStore');
      const user = useAuthStore.getState().user;
      
      let data = [];
      
      // Try to fetch from real API first
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('https://media-hub-bq9w.onrender.com/api/posts', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          data = result.posts || result.data || result || [];
          console.log('Fetched posts from API:', data);
        } else {
          throw new Error('API returned error');
        }
      } catch (error) {
        console.log('Using mock data because API failed:', error.message);
        
        // Use mock data if API fails
        const userId = user?._id || user?.id || 'user1';
        const userName = user?.name || 'You';
        
        data = [
          {
            _id: '1',
            caption: 'Beautiful sunset at the beach 🌅',
            media: [{ url: 'https://picsum.photos/seed/1/400/500' }],
            author: { _id: userId, name: userName },
            likes: [],
            comments: [],
            tags: ['sunset', 'beach', 'nature'],
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            caption: 'My new artwork! 🎨',
            media: [{ url: 'https://picsum.photos/seed/2/400/600' }],
            author: { _id: userId, name: userName },
            likes: [],
            comments: [],
            tags: ['art', 'painting', 'creative'],
            createdAt: new Date().toISOString()
          },
          {
            _id: '3',
            caption: 'Coffee time! ☕️',
            media: [{ url: 'https://picsum.photos/seed/3/400/400' }],
            author: { _id: 'user2', name: 'Jane Smith' },
            likes: [],
            comments: [],
            tags: ['coffee', 'morning'],
            createdAt: new Date().toISOString()
          },
          {
            _id: '4',
            caption: 'City lights at night 🌃',
            media: [{ url: 'https://picsum.photos/seed/4/400/700' }],
            author: { _id: 'user3', name: 'Mike Johnson' },
            likes: [],
            comments: [],
            tags: ['city', 'night', 'photography'],
            createdAt: new Date().toISOString()
          },
          {
            _id: '5',
            caption: 'Nature walk in the forest 🌲',
            media: [{ url: 'https://picsum.photos/seed/5/400/450' }],
            author: { _id: userId, name: userName },
            likes: [],
            comments: [],
            tags: ['nature', 'forest', 'walk'],
            createdAt: new Date().toISOString()
          }
        ];
      }
      
      set({ posts: data, isLoading: false });
    } catch (error) {
      console.error('Fetch posts error:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  createPost: async (postData) => {
    try {
      const { useAuthStore } = await import('./AuthStore');
      const user = useAuthStore.getState().user;
      const token = localStorage.getItem('auth_token');
      
      // Try to send to real API first
      try {
        const formData = new FormData();
        formData.append('caption', postData.caption);
        if (postData.tags) formData.append('tags', JSON.stringify(postData.tags));
        if (postData.media && postData.media.length > 0) {
          // If media is a File object
          if (postData.media[0] instanceof File) {
            formData.append('media', postData.media[0]);
          } else {
            // If media is a URL
            formData.append('mediaUrl', postData.media[0]);
          }
        }
        
        const response = await fetch('https://media-hub-bq9w.onrender.com/api/posts', {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: formData
        });
        
        if (response.ok) {
          const newPost = await response.json();
          set((state) => ({ posts: [newPost, ...state.posts] }));
          return newPost;
        } else {
          throw new Error('API returned error');
        }
      } catch (error) {
        console.log('Using mock post creation:', error.message);
        
        // Fallback to mock post
        const newPost = {
          _id: Date.now().toString(),
          ...postData,
          author: { _id: user?._id || 'user1', name: user?.name || 'You' },
          likes: [],
          comments: [],
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({ posts: [newPost, ...state.posts] }));
        return newPost;
      }
    } catch (error) {
      console.error('Create post error:', error);
      throw error;
    }
  },
}));