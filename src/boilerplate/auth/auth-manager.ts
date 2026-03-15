/**
 * Authentication Manager
 * 
 * Central authentication manager that coordinates between different auth adapters
 * and provides a unified interface for authentication operations.
 */

import { NextRequest } from 'next/server';
import {
  AuthAdapter,
  AuthResult,
  AuthCredentials,
  User,
  Session,
  AuthContext,
  CreateUserData,
  UserFilters
} from '../interfaces/auth';
import { SessionManager } from './session-manager';
import { RBACManager } from './rbac-manager';

export interface AuthManagerConfig {
  adapter: AuthAdapter;
  sessionManager: SessionManager;
  rbacManager: RBACManager;
  defaultTenantId?: string;
  sessionCookieName?: string;
  authHeaderName?: string;
}

export class AuthManager {
  private adapter: AuthAdapter;
  private sessionManager: SessionManager;
  private rbacManager: RBACManager;
  private config: AuthManagerConfig;

  constructor(config: AuthManagerConfig) {
    this.adapter = config.adapter;
    this.sessionManager = config.sessionManager;
    this.rbacManager = config.rbacManager;
    this.config = config;
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const result = await this.adapter.authenticate(credentials);
      
      if (result.success && result.user) {
        // Update last login time
        await this.adapter.updateUser(result.user.id, {
          lastLoginAt: new Date().toISOString()
        });

        // Create session if not provided
        if (!result.session) {
          result.session = await this.adapter.createSession(result.user);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Get auth context from request
   */
  async getAuthContext(request: NextRequest): Promise<AuthContext | null> {
    try {
      const token = this.extractToken(request);
      if (!token) {
        return null;
      }

      const session = await this.sessionManager.validateSession(token);
      if (!session) {
        return null;
      }

      const user = await this.adapter.getUser(session.userId);
      if (!user || user.status !== 'active') {
        return null;
      }

      const permissions = await this.rbacManager.getUserPermissions(
        user.id,
        session.tenantId
      );
      const roles = await this.rbacManager.getUserRoles(
        user.id,
        session.tenantId
      );

      return {
        user,
        session,
        tenantId: session.tenantId,
        permissions,
        roles: roles.map(role => role.name)
      };
    } catch (error) {
      console.error('Failed to get auth context:', error);
      return null;
    }
  }

  /**
   * Create new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    return this.adapter.createUser(data);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.adapter.updateUser(userId, data);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    // First destroy all user sessions
    const user = await this.adapter.getUser(userId);
    if (user) {
      await this.sessionManager.destroyUserSessions(userId);
    }
    
    return this.adapter.deleteUser(userId);
  }

  /**
   * List users
   */
  async listUsers(filters?: UserFilters): Promise<User[]> {
    return this.adapter.listUsers(filters);
  }

  /**
   * Create session for user
   */
  async createSession(user: User, metadata?: Record<string, unknown>): Promise<Session> {
    return this.sessionManager.createSession(user, metadata);
  }

  /**
   * Validate session
   */
  async validateSession(token: string): Promise<Session | null> {
    return this.sessionManager.validateSession(token);
  }

  /**
   * Refresh session
   */
  async refreshSession(refreshToken: string): Promise<Session | null> {
    return this.sessionManager.refreshSession(refreshToken);
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    return this.sessionManager.destroySession(sessionId);
  }

  /**
   * Check if user has permission
   */
  async checkPermission(
    userId: string,
    permission: string,
    context?: unknown
  ): Promise<boolean> {
    return this.rbacManager.checkPermission(userId, permission, context);
  }

  /**
   * Check if auth context has permission
   */
  async checkContextPermission(
    authContext: AuthContext,
    permission: string,
    context?: unknown
  ): Promise<boolean> {
    if (!authContext.user) {
      return false;
    }

    return this.rbacManager.checkPermission(
      authContext.user.id,
      permission,
      context
    );
  }

  /**
   * Extract token from request
   */
  private extractToken(request: NextRequest): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get(
      this.config.authHeaderName || 'authorization'
    );
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookie
    const cookieName = this.config.sessionCookieName || 'auth-token';
    const cookie = request.cookies.get(cookieName);
    if (cookie) {
      return cookie.value;
    }

    return null;
  }

  /**
   * Get adapter instance
   */
  getAdapter(): AuthAdapter {
    return this.adapter;
  }

  /**
   * Get RBAC manager instance
   */
  getRBACManager(): RBACManager {
    return this.rbacManager;
  }

  /**
   * Get session manager instance
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}