import axios from 'axios';

const API_URL = 'https://media-hub-bq9w.onrender.com/api';

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
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.data);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/me', data),
  updateAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.put('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Posts API
export const postsAPI = {
  getAll: () => api.get('/posts'),
  getOne: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  dislike: (id) => api.post(`/posts/${id}/dislike`),
  comment: (id, content) => api.post(`/comments/${id}`, { content }),
  getMyPosts: () => api.get('/posts/my-posts'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Comments API
export const commentsAPI = {
  getByPost: (postId) => api.get(`/comments/${postId}`),
  create: (postId, content) => api.post(`/comments/${postId}`, { content }),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
  like: (commentId) => api.post(`/comments/${commentId}/like`),
};

// Default export
export default api;