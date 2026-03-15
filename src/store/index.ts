import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the store state type
interface AppState {
  // User state
  user: {
    isAuthenticated: boolean;
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
  };
  
  // UI state
  ui: {
    isDarkMode: boolean;
    isSidebarOpen: boolean;
    notifications: Notification[];
  };
  
  // Actions
  login: (userData: Omit<AppState['user'], 'isAuthenticated'>) => void;
  logout: () => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Notification type
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  read: boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: {
        isAuthenticated: false,
      },
      ui: {
        isDarkMode: false,
        isSidebarOpen: true,
        notifications: [],
      },
      
      // Actions
      login: (userData) => set((_state) => ({
        user: {
          ...userData,
          isAuthenticated: true,
        },
      })),
      
      logout: () => set((_state) => ({
        user: {
          isAuthenticated: false,
        },
      })),
      
      toggleDarkMode: () => set((state) => ({
        ui: {
          ...state.ui,
          isDarkMode: !state.ui.isDarkMode,
        },
      })),
      
      toggleSidebar: () => set((state) => ({
        ui: {
          ...state.ui,
          isSidebarOpen: !state.ui.isSidebarOpen,
        },
      })),
      
      addNotification: (notification) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            notification,
          ],
        },
      })),
      
      removeNotification: (id) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            (notification) => notification.id !== id
          ),
        },
      })),
      
      clearNotifications: () => set((state) => ({
        ui: {
          ...state.ui,
          notifications: [],
        },
      })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: { isAuthenticated: state.user.isAuthenticated },
        ui: { isDarkMode: state.ui.isDarkMode },
      }),
    }
  )
);