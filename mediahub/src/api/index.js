import axios from 'axios';

const API_URL = 'https://media-hub-bq9w.onrender.com';

console.log('🔍 API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // fail fast instead of hanging forever on a dropped/hung connection
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 Request:', config.method.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle cold starts, then 401/403 errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    const config = error.config;

    // Render free-tier cold starts show up as either a dropped connection
    // (no error.response, e.g. ECONNABORTED/network error) or a 502/503/504
    // from the edge proxy while the container is still spinning up.
    // Retry once, after a short delay, for idempotent GET requests only.
    const isColdStartError =
      !error.response || [502, 503, 504].includes(error.response?.status);

    if (isColdStartError && config && !config._retried && config.method === 'get') {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    console.error('❌ API Error:', error.config?.url, error.response?.status, error.response?.data);

    // If 401 or 403, only treat it as a session expiry if we actually had a token.
    // Guests hitting a protected endpoint (e.g. liking a post while logged out)
    // also get a 401/403, but that's not a session expiry — don't yank them
    // off the page they're on.
    if (error.response?.status === 401 || error.response?.status === 403) {
      const hadToken = !!localStorage.getItem('auth_token');
      if (hadToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => api.get('/api/auth/me'),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  updateProfile: (data) => api.put('/api/auth/me', data),
  updateAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.put('/api/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (data) => api.put('/api/auth/me/password', data), // { currentPassword, newPassword }
  deleteAccount: () => api.delete('/api/auth/me'),
};

// Posts API
export const postsAPI = {
  getAll: () => api.get('/api/posts'),
  getOne: (id) => api.get(`/api/posts/${id}`),
  // `config` lets callers pass extra axios options (e.g. onUploadProgress) through
  // without clobbering the multipart header below.
  create: (data, config = {}) => api.post('/api/posts', data, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(config.headers || {}),
    },
  }),
  update: (id, data) => api.put(`/api/posts/${id}`, data),
  delete: (id) => api.delete(`/api/posts/${id}`),
  like: (id) => api.post(`/api/posts/${id}/like`),
  dislike: (id) => api.post(`/api/posts/${id}/dislike`),
  comment: (id, content) => api.post(`/api/comments/${id}`, { content }),
  getMyPosts: () => api.get('/api/posts/my-posts'),
  getLikers: (postId) => api.get(`/api/posts/${postId}/likes`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/api/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

// Comments API
export const commentsAPI = {
  getByPost: (postId) => api.get(`/api/comments/${postId}`),
  create: (postId, content) => api.post(`/api/comments/${postId}`, { content }),
  delete: (commentId) => api.delete(`/api/comments/${commentId}`),
  like: (commentId) => api.post(`/api/comments/${commentId}/like`),
};

export default api;