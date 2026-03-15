'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CookieConsentTwo as CookieConsent } from '@/components/atoms/CookiesModel';
type Theme = 'light' | 'dark' | 'system';

interface LayoutContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  isLanguageMenuOpen: boolean;
  setLanguageMenuOpen: (isOpen: boolean) => void;
  toggleLanguageMenu: () => void;
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(undefined);

export const useLayout = (): LayoutContextType => {
  const context = React.useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  // State management
  const [theme, setThemeState] = useState<Theme>('system');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);
  const pathname = usePathname();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Ensure we're running on the client side
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme | null;
      if (storedTheme) {
        setThemeState(storedTheme);
      } else {
        // Check system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeState(systemPrefersDark ? 'dark' : 'light');
      }
    }
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    // Ensure we're running on the client side
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemPrefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }

      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Set theme with localStorage persistence
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      if (prevTheme === 'light') {
        return 'dark';
      }
      if (prevTheme === 'dark') {
        return 'system';
      }
      return 'light';
    });
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    // Close language menu when mobile menu is toggled
    if (isLanguageMenuOpen) {
      setLanguageMenuOpen(false);
    }
  };

  // Toggle language menu
  const toggleLanguageMenu = () => {
    setLanguageMenuOpen((prev) => !prev);
    // Close mobile menu when language menu is toggled
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isMobileMenuOpen,
    setMobileMenuOpen,
    toggleMobileMenu,
    isLanguageMenuOpen,
    setLanguageMenuOpen,
    toggleLanguageMenu,
  };

  // Lazy load the Header component
  const Header = React.lazy(() => import('../../organisms/Header').then(module => ({ default: module.Header })))

  return (
    <LayoutContext.Provider value={value}>
      <div className="flex min-h-screen flex-col">
        {/* Use Suspense for Header component */}
        <React.Suspense fallback={<div className="h-16 border-b" />}>
          <Header />
        </React.Suspense>
        <div className="flex-1">{children}</div>
      </div>
      <CookieConsent />
    </LayoutContext.Provider>
  );
};