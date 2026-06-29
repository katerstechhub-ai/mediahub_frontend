import axios from 'axios';

// ✅ Remove /api from the base URL
const API_URL = 'https://media-hub-bq9w.onrender.com/api';

console.log('🔍 API_URL:', API_URL); // Should show: https://media-hub-bq9w.onrender.com

const api = axios.create({
  baseURL: API_URL,
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

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.config?.url, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Auth API - Now uses /api/auth/login (full path: https://media-hub-bq9w.onrender.com/api/auth/login)
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  updateProfile: (data) => api.put('/api/auth/me', data),
  updateAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.put('/api/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Posts API
export const postsAPI = {
  getAll: () => api.get('/api/posts'),
  getOne: (id) => api.get(`/api/posts/${id}`),
  create: (data) => api.post('/api/posts', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, data) => api.put(`/api/posts/${id}`, data),
  delete: (id) => api.delete(`/api/posts/${id}`),
  like: (id) => api.post(`/api/posts/${id}/like`),
  dislike: (id) => api.post(`/api/posts/${id}/dislike`),
  comment: (id, content) => api.post(`/api/comments/${id}`, { content }),
  getMyPosts: () => api.get('/api/posts/my-posts'),
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