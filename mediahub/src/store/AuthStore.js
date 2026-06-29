import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      setAuth: (user, token) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          isLoading: false 
        });
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },

      // Use this when you only have an updated user object (e.g. after
      // changing avatar/name/bio) and don't have/need a new token.
      updateUser: (updatedUser) => {
        const merged = { ...get().user, ...updatedUser };
        set({ user: merged });
        localStorage.setItem('auth_user', JSON.stringify(merged));
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isLoading: false 
        });
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      },
      
      checkAuth: async () => {
        set({ isLoading: true });
        
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ 
              user, 
              token, 
              isAuthenticated: true,
              isLoading: false 
            });
            return;
          } catch (e) {
            localStorage.removeItem('auth_user');
          }
        }
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isLoading: false 
        });
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);

export default useAuthStore;