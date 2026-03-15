/**
 * Authentication API Routes
 * 
 * API route handlers for authentication and authorization operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '../auth/auth-manager';
import { createAPIEnvelope, createErrorResponse } from './envelope';
import { z } from 'zod';

// Validation schemas
const LoginSchema = z.object({
  type: z.enum(['email', 'username', 'phone', 'oauth', 'token']),
  identifier: z.string().min(1),
  password: z.string().optional(),
  token: z.string().optional(),
  provider: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  roles: z.array(z.string()).optional(),
  tenantId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  roles: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  metadata: z.record(z.unknown()).optional()
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export interface AuthRoutesConfig {
  authManager: AuthManager;
  enableRegistration?: boolean;
  requireEmailVerification?: boolean;
  sessionCookieName?: string;
  secureCookies?: boolean;
}

export class AuthRoutes {
  private authManager: AuthManager;
  private config: AuthRoutesConfig;

  constructor(config: AuthRoutesConfig) {
    this.authManager = config.authManager;
    this.config = {
      enableRegistration: true,
      requireEmailVerification: false,
      sessionCookieName: 'auth-token',
      secureCookies: process.env.NODE_ENV === 'production',
      ...config
    };
  }

  /**
   * POST /api/auth/login
   */
  async login(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const credentials = LoginSchema.parse(body);

      const result = await this.authManager.authenticate(credentials);

      if (!result.success) {
        return createErrorResponse(
          result.error || 'Authentication failed',
          401,
          'AUTH_FAILED'
        );
      }

      // Set session cookie
      const response = NextResponse.json(
        createAPIEnvelope({
          user: result.user,
          session: {
            id: result.session!.id,
            expiresAt: result.session!.expiresAt,
            createdAt: result.session!.createdAt
          },
          message: 'Login successful'
        })
      );

      this.setSessionCookie(response, result.session!.token);

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Login error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * POST /api/auth/register
   */
  async register(request: NextRequest): Promise<NextResponse> {
    try {
      if (!this.config.enableRegistration) {
        return createErrorResponse(
          'Registration is disabled',
          403,
          'REGISTRATION_DISABLED'
        );
      }

      const body = await request.json();
      const userData = RegisterSchema.parse(body);

      // Check if user already exists
      const existingUser = await this.authManager.getAdapter().getUserByEmail(userData.email);
      if (existingUser) {
        return createErrorResponse(
          'User already exists',
          409,
          'USER_EXISTS'
        );
      }

      // Create user
      const user = await this.authManager.createUser(userData);

      // Create session
      const session = await this.authManager.createSession(user, {
        registrationMethod: 'email'
      });

      const response = NextResponse.json(
        createAPIEnvelope({
          user,
          session: {
            id: session.id,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt
          },
          message: 'Registration successful'
        })
      );

      this.setSessionCookie(response, session.token);

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Registration error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (authContext?.session) {
        await this.authManager.destroySession(authContext.session.id);
      }

      const response = NextResponse.json(
        createAPIEnvelope({ message: 'Logout successful' })
      );

      this.clearSessionCookie(response);

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { refreshToken } = RefreshTokenSchema.parse(body);

      const session = await this.authManager.refreshSession(refreshToken);
      
      if (!session) {
        return createErrorResponse(
          'Invalid or expired refresh token',
          401,
          'INVALID_REFRESH_TOKEN'
        );
      }

      const user = await this.authManager.getAdapter().getUser(session.userId);
      if (!user) {
        return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
      }

      const response = NextResponse.json(
        createAPIEnvelope({
          user,
          session: {
            id: session.id,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt
          },
          message: 'Token refreshed successfully'
        })
      );

      this.setSessionCookie(response, session.token);

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Refresh error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (!authContext?.user) {
        return createErrorResponse(
          'Authentication required',
          401,
          'AUTH_REQUIRED'
        );
      }

      return NextResponse.json(
        createAPIEnvelope({
          user: authContext.user,
          session: authContext.session ? {
            id: authContext.session.id,
            expiresAt: authContext.session.expiresAt,
            createdAt: authContext.session.createdAt
          } : undefined,
          permissions: authContext.permissions,
          roles: authContext.roles,
          tenantId: authContext.tenantId
        })
      );
    } catch (error) {
      console.error('Me endpoint error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * PUT /api/auth/me
   */
  async updateMe(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (!authContext?.user) {
        return createErrorResponse(
          'Authentication required',
          401,
          'AUTH_REQUIRED'
        );
      }

      const body = await request.json();
      const updateData = UpdateUserSchema.parse(body);

      // Users can only update certain fields about themselves
      const allowedUpdates = {
        name: updateData.name,
        avatar: updateData.avatar,
        metadata: updateData.metadata
      };

      const updatedUser = await this.authManager.updateUser(
        authContext.user.id,
        allowedUpdates
      );

      return NextResponse.json(
        createAPIEnvelope({
          user: updatedUser,
          message: 'Profile updated successfully'
        })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Update profile error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * POST /api/auth/change-password
   */
  async changePassword(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (!authContext?.user) {
        return createErrorResponse(
          'Authentication required',
          401,
          'AUTH_REQUIRED'
        );
      }

      const body = await request.json();
      const { currentPassword, newPassword } = ChangePasswordSchema.parse(body);

      const adapter = this.authManager.getAdapter();
      
      // Check if adapter supports password changes
      if (typeof (adapter as any).changePassword !== 'function') {
        return createErrorResponse(
          'Password change not supported by current auth provider',
          400,
          'NOT_SUPPORTED'
        );
      }

      const success = await (adapter as any).changePassword(
        authContext.user.id,
        currentPassword,
        newPassword
      );

      if (!success) {
        return createErrorResponse(
          'Current password is incorrect',
          400,
          'INVALID_PASSWORD'
        );
      }

      return NextResponse.json(
        createAPIEnvelope({ message: 'Password changed successfully' })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Change password error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * GET /api/auth/permissions
   */
  async getPermissions(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (!authContext?.user) {
        return createErrorResponse(
          'Authentication required',
          401,
          'AUTH_REQUIRED'
        );
      }

      const rbacManager = this.authManager.getRBACManager();
      const permissions = await rbacManager.getUserPermissions(
        authContext.user.id,
        authContext.tenantId
      );
      const roles = await rbacManager.getUserRoles(
        authContext.user.id,
        authContext.tenantId
      );

      return NextResponse.json(
        createAPIEnvelope({
          permissions,
          roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions
          }))
        })
      );
    } catch (error) {
      console.error('Get permissions error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * POST /api/auth/check-permission
   */
  async checkPermission(request: NextRequest): Promise<NextResponse> {
    try {
      const authContext = await this.authManager.getAuthContext(request);
      
      if (!authContext?.user) {
        return createErrorResponse(
          'Authentication required',
          401,
          'AUTH_REQUIRED'
        );
      }

      const body = await request.json();
      const { permission, context } = z.object({
        permission: z.string().min(1),
        context: z.record(z.unknown()).optional()
      }).parse(body);

      const hasPermission = await this.authManager.checkContextPermission(
        authContext,
        permission,
        context
      );

      return NextResponse.json(
        createAPIEnvelope({
          permission,
          hasPermission,
          context
        })
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'Invalid request data',
          400,
          'VALIDATION_ERROR',
          error.errors
        );
      }

      console.error('Check permission error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * Set session cookie
   */
  private setSessionCookie(response: NextResponse, token: string): void {
    response.cookies.set(this.config.sessionCookieName!, token, {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
  }

  /**
   * Clear session cookie
   */
  private clearSessionCookie(response: NextResponse): void {
    response.cookies.delete(this.config.sessionCookieName!);
  }

  /**
   * Create route handlers for Next.js API routes
   */
  createRouteHandlers() {
    return {
      login: (request: NextRequest) => this.login(request),
      register: (request: NextRequest) => this.register(request),
      logout: (request: NextRequest) => this.logout(request),
      refresh: (request: NextRequest) => this.refresh(request),
      me: (request: NextRequest) => this.me(request),
      updateMe: (request: NextRequest) => this.updateMe(request),
      changePassword: (request: NextRequest) => this.changePassword(request),
      getPermissions: (request: NextRequest) => this.getPermissions(request),
      checkPermission: (request: NextRequest) => this.checkPermission(request)
    };
  }
}