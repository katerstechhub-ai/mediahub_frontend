import { create } from 'zustand';
import { notificationsAPI } from '../api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  page: 1,
  totalPages: 1,

  fetchNotifications: async (page = 1, limit = 20) => {
    set({ isLoading: true });
    try {
      const res = await notificationsAPI.getAll(page, limit);
      const { data, unreadCount, totalPages } = res.data;
      set({
        notifications: page === 1 ? data : [...get().notifications, ...data],
        unreadCount,
        page,
        totalPages,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      set({
        notifications: get().notifications.map((n) =>
          n._id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsAPI.markAllAsRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (id) => {
    try {
      await notificationsAPI.delete(id);
      const notif = get().notifications.find((n) => n._id === id);
      set({
        notifications: get().notifications.filter((n) => n._id !== id),
        unreadCount: notif && !notif.read ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },
}));

export default useNotificationStore;