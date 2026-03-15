/**
 * Custom hook for authentication functionality
 * Provides a convenient way to access auth state and methods
 */

import { useCallback, useEffect } from 'react';
import { User, LoginCredentials, RegisterData } from '@/types/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/lib/logger';

interface UseAuthOptions {
  /** Redirect to login page if user is not authenticated */
  requireAuth?: boolean;
  /** Redirect to home page if user is already authenticated */
  redirectIfAuthenticated?: boolean;
  /** Required permissions for the current page */
  requiredPermissions?: string[];
  /** Whether all permissions are required (AND) or any permission is sufficient (OR) */
  requireAllPermissions?: boolean;
}

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  hasRequiredPermissions: () => boolean;
  clearError: () => void;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    requireAuth = false,
    redirectIfAuthenticated = false,
    requiredPermissions = [],
    requireAllPermissions = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    refreshUser,
    clearError,
  } = useAuthStore();

  // Check if user has required permissions
  const hasRequiredPermissions = useCallback(() => {
    if (!user || !isAuthenticated) return false;
    if (requiredPermissions.length === 0) { return true; }
    if (user.role === 'admin') { return true; }

    if (requireAllPermissions) {
      return requiredPermissions.every((permission) =>
        user.permissions.includes(permission)
      );
    } else {
      return requiredPermissions.some((permission) =>
        user.permissions.includes(permission)
      );
    }
  }, [
    user,
    isAuthenticated,
    requiredPermissions,
    requireAllPermissions,
  ]);

  // Handle authentication redirects and permission checks
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

    // Skip if loading
    if (isLoading) {
      return;
    }

    // If authentication is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // If user is authenticated but should be redirected
    if (redirectIfAuthenticated && isAuthenticated) {
      router.push('/');
      return;
    }

    // If user doesn't have required permissions
    if (
      requireAuth &&
      isAuthenticated &&
      requiredPermissions.length > 0 &&
      !hasRequiredPermissions()
    ) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectIfAuthenticated, pathname, router, hasRequiredPermissions, requiredPermissions.length]);

  // Refresh user data on initial load
  useEffect(() => {
    if (token && !user && !isLoading) {
      refreshUser().catch((error) => {
        logger.error({
          message: 'Failed to refresh user',
          error,
          context: {
            token,
            user,
            isLoading,
            requiredPermissionsLength: requiredPermissions.length,
          },
        });
      });
    }
  }, [token, user, isLoading, refreshUser, requiredPermissions.length]);

  const registerUser = async (userData: RegisterData) => {
    try {
      const userToRegister: Omit<User, "id"> = {
        ...userData,
        role: "user", // default role
        permissions: [], // default permissions
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      await register(userToRegister); // call store's register
    } catch (error) {
      logger.error({
        message: "Failed to register user",
        error,
        context: { userData },
      });
      throw error;
    }
  };
  

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register: registerUser,
    hasRequiredPermissions,
    clearError,
  };
}