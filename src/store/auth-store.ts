/**
 * Authentication store using Zustand for global state management
 * of user authentication state across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { AuthError, handleError } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { User as AuthUser } from '@/types/auth';

export type User = AuthUser;

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      /**
       * Login user with email and password
       */
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await api.post<{ user: User; token: string }>('/auth/login', credentials);

          // Store token in localStorage for API requests
          localStorage.setItem('auth_token', response.token);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          logger.info({
            message: 'User logged in successfully',
            userId: response.user.id,
          });
        } catch (error: unknown) {
          const appError = handleError(error, false);
          set({
            isLoading: false,
            error: appError.message,
            isAuthenticated: false,
          });
          throw appError;
        }
      },

      /**
       * Logout user
       */
      logout: async () => {
        try {
          set({ isLoading: true });

          // Call logout API endpoint to invalidate token on server
          await api.post('/auth/logout', {}, { skipErrorToast: true }).catch(() => {
            // Ignore errors during logout
          });

          // Remove token from localStorage
          localStorage.removeItem('auth_token');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          logger.info({ message: 'User logged out successfully' });
        } catch (error) {
          set({ isLoading: false });
          handleError(error, true);
        }
      },

      /**
       * Register new user
       */
      register: async (userData: Omit<User, 'id'>) => {
        try {
          set({ isLoading: true, error: null });

          const response = await api.post<{ user: User; token: string }>('/auth/register', userData);

          // Store token in localStorage for API requests
          localStorage.setItem('auth_token', response.token);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          logger.info({
            message: 'User registered successfully',
            userId: response.user.id,
          });
        } catch (error) {
          const appError = handleError(error, false);
          set({
            isLoading: false,
            error: appError.message,
            isAuthenticated: false,
          });
          throw appError;
        }
      },

      /**
       * Refresh user data
       */
      refreshUser: async () => {
        const { token } = get();
        if (!token) {
          return;
        }

        try {
          set({ isLoading: true });

          const user = await api.get<User>('/auth/me');

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // If unauthorized, clear auth state
          if (error instanceof AuthError && error.status === 401) {
            localStorage.removeItem('auth_token');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            handleError(error, true);
          }
        }
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);