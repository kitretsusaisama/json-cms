/**
 * Authentication Middleware
 * 
 * Provides middleware functions for protecting routes and API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from './auth-manager';
import {
  AuthContext,
  AuthMiddleware as IAuthMiddleware,
  AuthMiddlewareOptions
} from '../interfaces/auth';

export interface MiddlewareConfig {
  authManager: AuthManager;
  unauthorizedRedirect?: string;
  forbiddenRedirect?: string;
  loginPath?: string;
}

export class AuthMiddleware implements IAuthMiddleware {
  private authManager: AuthManager;
  private config: MiddlewareConfig;

  constructor(config: MiddlewareConfig) {
    this.authManager = config.authManager;
    this.config = {
      unauthorizedRedirect: '/login',
      forbiddenRedirect: '/forbidden',
      loginPath: '/login',
      ...config
    };
  }

  /**
   * Require authentication
   */
  requireAuth(options?: AuthMiddlewareOptions) {
    return async (req: NextRequest, res: NextResponse, next?: () => void) => {
      try {
        // Skip authentication for excluded paths
        if (this.shouldSkipPath(req.nextUrl.pathname, options?.skipPaths)) {
          return next?.();
        }

        const authContext = await this.authManager.getAuthContext(req);
        
        if (!authContext || !authContext.user) {
          return this.handleUnauthorized(req, options);
        }

        // Check tenant requirement
        if (options?.tenantRequired && !authContext.tenantId) {
          return this.handleForbidden(req, 'Tenant access required', options);
        }

        // Add auth context to request
        (req as any).authContext = authContext;
        
        return next?.();
      } catch (error) {
        console.error('Auth middleware error:', error);
        return this.handleError(req, error, options);
      }
    };
  }

  /**
   * Require specific permission
   */
  requirePermission(permission: string, options?: AuthMiddlewareOptions) {
    return async (req: NextRequest, res: NextResponse, next?: () => void) => {
      try {
        // First check authentication
        const authCheck = this.requireAuth(options);
        const authResult = await authCheck(req, res);
        
        if (authResult instanceof NextResponse) {
          return authResult; // Authentication failed
        }

        const authContext = (req as any).authContext as AuthContext;
        
        // Check permission
        const hasPermission = await this.authManager.checkContextPermission(
          authContext,
          permission,
          this.extractPermissionContext(req)
        );

        if (!hasPermission) {
          return this.handleForbidden(
            req,
            `Permission '${permission}' required`,
            options
          );
        }

        return next?.();
      } catch (error) {
        console.error('Permission middleware error:', error);
        return this.handleError(req, error, options);
      }
    };
  }

  /**
   * Require specific role
   */
  requireRole(role: string, options?: AuthMiddlewareOptions) {
    return async (req: NextRequest, res: NextResponse, next?: () => void) => {
      try {
        // First check authentication
        const authCheck = this.requireAuth(options);
        const authResult = await authCheck(req, res);
        
        if (authResult instanceof NextResponse) {
          return authResult; // Authentication failed
        }

        const authContext = (req as any).authContext as AuthContext;
        
        // Check role
        if (!authContext.roles.includes(role)) {
          return this.handleForbidden(
            req,
            `Role '${role}' required`,
            options
          );
        }

        return next?.();
      } catch (error) {
        console.error('Role middleware error:', error);
        return this.handleError(req, error, options);
      }
    };
  }

  /**
   * Optional authentication (sets auth context if available)
   */
  optionalAuth(options?: AuthMiddlewareOptions) {
    return async (req: NextRequest, res: NextResponse, next?: () => void) => {
      try {
        const authContext = await this.authManager.getAuthContext(req);
        (req as any).authContext = authContext;
        return next?.();
      } catch (error) {
        console.error('Optional auth middleware error:', error);
        // Continue without auth context
        (req as any).authContext = null;
        return next?.();
      }
    };
  }

  /**
   * Create API route middleware
   */
  createAPIMiddleware() {
    return {
      requireAuth: (options?: AuthMiddlewareOptions) => {
        return async (req: NextRequest) => {
          const authContext = await this.authManager.getAuthContext(req);
          
          if (!authContext || !authContext.user) {
            return NextResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            );
          }

          if (options?.tenantRequired && !authContext.tenantId) {
            return NextResponse.json(
              { error: 'Tenant access required' },
              { status: 403 }
            );
          }

          return authContext;
        };
      },

      requirePermission: (permission: string, options?: AuthMiddlewareOptions) => {
        return async (req: NextRequest) => {
          const authContext = await this.authManager.getAuthContext(req);
          
          if (!authContext || !authContext.user) {
            return NextResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            );
          }

          const hasPermission = await this.authManager.checkContextPermission(
            authContext,
            permission,
            this.extractPermissionContext(req)
          );

          if (!hasPermission) {
            return NextResponse.json(
              { error: `Permission '${permission}' required` },
              { status: 403 }
            );
          }

          return authContext;
        };
      },

      requireRole: (role: string, options?: AuthMiddlewareOptions) => {
        return async (req: NextRequest) => {
          const authContext = await this.authManager.getAuthContext(req);
          
          if (!authContext || !authContext.user) {
            return NextResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            );
          }

          if (!authContext.roles.includes(role)) {
            return NextResponse.json(
              { error: `Role '${role}' required` },
              { status: 403 }
            );
          }

          return authContext;
        };
      }
    };
  }

  /**
   * Handle unauthorized access
   */
  private handleUnauthorized(
    req: NextRequest,
    options?: AuthMiddlewareOptions
  ): NextResponse {
    const redirectUrl = options?.redirectUrl || this.config.unauthorizedRedirect!;
    
    // For API routes, return JSON error
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: options?.errorMessage || 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // For pages, redirect to login
    const loginUrl = new URL(redirectUrl, req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  /**
   * Handle forbidden access
   */
  private handleForbidden(
    req: NextRequest,
    message: string,
    options?: AuthMiddlewareOptions
  ): NextResponse {
    const redirectUrl = options?.redirectUrl || this.config.forbiddenRedirect!;
    
    // For API routes, return JSON error
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: options?.errorMessage || message,
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // For pages, redirect to forbidden page
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  /**
   * Handle middleware errors
   */
  private handleError(
    req: NextRequest,
    error: unknown,
    options?: AuthMiddlewareOptions
  ): NextResponse {
    console.error('Auth middleware error:', error);
    
    // For API routes, return JSON error
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }

    // For pages, redirect to error page
    return NextResponse.redirect(new URL('/error', req.url));
  }

  /**
   * Check if path should be skipped
   */
  private shouldSkipPath(pathname: string, skipPaths?: string[]): boolean {
    if (!skipPaths) return false;
    
    return skipPaths.some(path => {
      if (path.includes('*')) {
        const regex = new RegExp('^' + path.replace(/\*/g, '.*') + '$');
        return regex.test(pathname);
      }
      return pathname === path || pathname.startsWith(path + '/');
    });
  }

  /**
   * Extract permission context from request
   */
  private extractPermissionContext(req: NextRequest): Record<string, unknown> {
    const context: Record<string, unknown> = {};
    
    // Add URL parameters
    const url = new URL(req.url);
    for (const [key, value] of url.searchParams.entries()) {
      context[`param_${key}`] = value;
    }
    
    // Add path segments
    const pathSegments = url.pathname.split('/').filter(Boolean);
    pathSegments.forEach((segment, index) => {
      context[`path_${index}`] = segment;
    });
    
    // Add method
    context.method = req.method;
    
    // Add headers (selected ones)
    context.userAgent = req.headers.get('user-agent');
    context.origin = req.headers.get('origin');
    
    return context;
  }
}

/**
 * Helper function to create auth middleware for Next.js middleware.ts
 */
export function createNextMiddleware(authManager: AuthManager) {
  const middleware = new AuthMiddleware({ authManager });
  
  return {
    middleware,
    
    // Convenience function for protecting routes
    protect: (
      matcher: string | string[],
      options?: AuthMiddlewareOptions
    ) => {
      return async (req: NextRequest) => {
        const patterns = Array.isArray(matcher) ? matcher : [matcher];
        const shouldProtect = patterns.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(req.nextUrl.pathname);
          }
          return req.nextUrl.pathname.startsWith(pattern);
        });

        if (!shouldProtect) {
          return NextResponse.next();
        }

        const authContext = await authManager.getAuthContext(req);
        if (!authContext || !authContext.user) {
          return middleware['handleUnauthorized'](req, options);
        }

        // Add auth context to headers for API routes
        const response = NextResponse.next();
        response.headers.set('x-user-id', authContext.user.id);
        if (authContext.tenantId) {
          response.headers.set('x-tenant-id', authContext.tenantId);
        }
        
        return response;
      };
    }
  };
}