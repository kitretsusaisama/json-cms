/**
 * UI store using Zustand for global state management
 * of UI-related state across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
  read: boolean;
  createdAt: Date;
}

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // Sidebar
  sidebarState: SidebarState;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  
  // Mobile menu
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme state
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
      },
      toggleTheme: () => {
        const currentTheme = get().theme;
        if (currentTheme === 'light') {
          set({ theme: 'dark' });
        } else if (currentTheme === 'dark') {
          set({ theme: 'system' });
        } else {
          set({ theme: 'light' });
        }
      },
      
      // Sidebar state
      sidebarState: 'expanded',
      setSidebarState: (sidebarState) => {
        set({ sidebarState });
      },
      toggleSidebar: () => {
        const currentState = get().sidebarState;
        if (currentState === 'expanded') {
          set({ sidebarState: 'collapsed' });
        } else if (currentState === 'collapsed') {
          set({ sidebarState: 'expanded' });
        }
      },
      
      // Mobile menu state
      isMobileMenuOpen: false,
      setMobileMenuOpen: (isMobileMenuOpen) => {
        set({ isMobileMenuOpen });
      },
      toggleMobileMenu: () => {
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
      },
      
      // Notifications state
      notifications: [],
      unreadCount: 0,
      
      // Add a new notification
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          read: false,
          createdAt: new Date(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Limit to 100 notifications
          unreadCount: state.unreadCount + 1,
        }));
      },
      
      // Mark a notification as read
      markNotificationAsRead: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          );
          
          return {
            notifications: updatedNotifications,
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },
      
      // Mark all notifications as read
      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            read: true,
          })),
          unreadCount: 0,
        }));
      },
      
      // Remove a notification
      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const unreadAdjustment = notification && !notification.read ? 1 : 0;
          
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: Math.max(0, state.unreadCount - unreadAdjustment),
          };
        });
      },
      
      // Clear all notifications
      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarState: state.sidebarState,
      }),
    }
  )
);
