import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api';

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
        
        if (!token) {
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            isLoading: false 
          });
          return;
        }

        try {
          // Validate token with backend using getMe
          const response = await authAPI.getMe();
          const user = response.data.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true,
            isLoading: false 
          });
          
          // Update stored user in case anything changed
          localStorage.setItem('auth_user', JSON.stringify(user));
          
        } catch (error) {
          console.error('Auth check failed:', error);
          // Token is invalid or expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            isLoading: false 
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;