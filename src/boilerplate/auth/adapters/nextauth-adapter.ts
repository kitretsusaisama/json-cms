/**
 * NextAuth.js Adapter
 * 
 * Integration adapter for NextAuth.js authentication.
 */

import {
  AuthResult,
  AuthCredentials,
  User,
  Session,
  NextAuthAdapter as INextAuthAdapter
} from '../../interfaces/auth';
import { BaseAuthAdapter, UserStorage } from './base-adapter';
import { SessionManager } from '../session-manager';

export interface NextAuthConfig {
  providers: any[];
  callbacks?: {
    jwt?: (params: any) => Promise<any>;
    session?: (params: any) => Promise<any>;
    signIn?: (params: any) => Promise<boolean>;
  };
  pages?: {
    signIn?: string;
    signOut?: string;
    error?: string;
  };
  session?: {
    strategy?: 'jwt' | 'database';
    maxAge?: number;
  };
  jwt?: {
    secret?: string;
    maxAge?: number;
  };
}

export class NextAuthAdapter extends BaseAuthAdapter implements INextAuthAdapter {
  private nextAuthConfig: NextAuthConfig;

  constructor(
    config: NextAuthConfig,
    userStorage: UserStorage,
    sessionManager?: SessionManager
  ) {
    super(userStorage, sessionManager);
    this.nextAuthConfig = config;
  }

  /**
   * Authenticate using NextAuth.js session
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'token':
          return this.authenticateWithNextAuthToken(credentials);
        case 'oauth':
          return this.authenticateWithOAuth(credentials);
        default:
          return this.createAuthResult(
            false,
            undefined,
            undefined,
            `Unsupported credential type for NextAuth: ${credentials.type}`
          );
      }
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'NextAuth authentication failed'
      );
    }
  }

  /**
   * Get NextAuth.js configuration
   */
  getNextAuthConfig(): any {
    return {
      ...this.nextAuthConfig,
      callbacks: {
        ...this.nextAuthConfig.callbacks,
        
        // JWT callback - customize JWT token
        jwt: async ({ token, user, account, profile }) => {
          // Call custom JWT callback if provided
          if (this.nextAuthConfig.callbacks?.jwt) {
            token = await this.nextAuthConfig.callbacks.jwt({
              token,
              user,
              account,
              profile
            });
          }

          // Add custom claims
          if (user) {
            const cmsUser = await this.syncUserFromNextAuth(user, account, profile);
            token.userId = cmsUser.id;
            token.tenantId = cmsUser.tenantId;
            token.roles = cmsUser.roles;
            token.permissions = cmsUser.permissions;
          }

          return token;
        },

        // Session callback - customize session object
        session: async ({ session, token }) => {
          // Call custom session callback if provided
          if (this.nextAuthConfig.callbacks?.session) {
            session = await this.nextAuthConfig.callbacks.session({
              session,
              token
            });
          }

          // Add CMS user data to session
          if (token.userId) {
            const user = await this.getUser(token.userId as string);
            if (user) {
              session.user = {
                ...session.user,
                id: user.id,
                tenantId: user.tenantId,
                roles: user.roles,
                permissions: user.permissions,
                status: user.status
              };
            }
          }

          return session;
        },

        // Sign in callback - control who can sign in
        signIn: async ({ user, account, profile, email, credentials }) => {
          // Call custom signIn callback if provided
          if (this.nextAuthConfig.callbacks?.signIn) {
            const allowed = await this.nextAuthConfig.callbacks.signIn({
              user,
              account,
              profile,
              email,
              credentials
            });
            if (!allowed) return false;
          }

          // Sync user with CMS
          try {
            await this.syncUserFromNextAuth(user, account, profile);
            return true;
          } catch (error) {
            console.error('Failed to sync NextAuth user:', error);
            return false;
          }
        }
      }
    };
  }

  /**
   * Authenticate with NextAuth token
   */
  private async authenticateWithNextAuthToken(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    if (!credentials.token) {
      return this.createAuthResult(false, undefined, undefined, 'Token required');
    }

    // In a real implementation, you would decode and validate the NextAuth JWT
    // For demo purposes, we'll assume the token contains user information
    try {
      const tokenData = JSON.parse(
        Buffer.from(credentials.token.split('.')[1], 'base64').toString()
      );

      if (!tokenData.userId) {
        return this.createAuthResult(false, undefined, undefined, 'Invalid token format');
      }

      const user = await this.getUser(tokenData.userId);
      if (!user) {
        return this.createAuthResult(false, undefined, undefined, 'User not found');
      }

      if (user.status !== 'active') {
        return this.createAuthResult(
          false,
          undefined,
          undefined,
          `Account is ${user.status}`
        );
      }

      // Create or validate session
      let session: Session;
      if (this.sessionManager) {
        session = await this.createSession(user, {
          provider: 'nextauth',
          tokenData
        });
      } else {
        // Create a mock session for NextAuth
        session = {
          id: `nextauth_${user.id}`,
          userId: user.id,
          tenantId: user.tenantId,
          token: credentials.token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          metadata: { provider: 'nextauth' }
        };
      }

      return this.createAuthResult(true, user, session);
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        'Failed to decode NextAuth token'
      );
    }
  }

  /**
   * Authenticate with OAuth provider
   */
  private async authenticateWithOAuth(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    // This would typically be handled by NextAuth.js OAuth flow
    // We'll return a placeholder implementation
    return this.createAuthResult(
      false,
      undefined,
      undefined,
      'OAuth authentication should be handled by NextAuth.js'
    );
  }

  /**
   * Sync user from NextAuth to CMS user storage
   */
  private async syncUserFromNextAuth(
    nextAuthUser: any,
    account?: any,
    profile?: any
  ): Promise<User> {
    // Try to find existing user by email
    let user = await this.getUserByEmail(nextAuthUser.email);

    if (user) {
      // Update existing user
      user = await this.updateUser(user.id, {
        name: nextAuthUser.name || user.name,
        avatar: nextAuthUser.image || user.avatar,
        lastLoginAt: new Date().toISOString(),
        metadata: {
          ...user.metadata,
          nextAuthId: nextAuthUser.id,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          profile: profile
        }
      });
    } else {
      // Create new user
      user = await this.createUser({
        email: nextAuthUser.email,
        name: nextAuthUser.name || nextAuthUser.email,
        roles: ['viewer'], // Default role
        metadata: {
          nextAuthId: nextAuthUser.id,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          profile: profile,
          avatar: nextAuthUser.image
        }
      });
    }

    return user;
  }

  /**
   * Get NextAuth.js user from CMS user
   */
  async getNextAuthUser(userId: string): Promise<any | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    return {
      id: user.metadata.nextAuthId || user.id,
      email: user.email,
      name: user.name,
      image: user.avatar || user.metadata.avatar
    };
  }

  /**
   * Handle NextAuth.js sign out
   */
  async handleSignOut(userId: string): Promise<void> {
    // Destroy all CMS sessions for the user
    if (this.sessionManager) {
      await this.sessionManager.destroyUserSessions(userId);
    }
  }

  /**
   * Create NextAuth.js compatible session
   */
  async createNextAuthSession(user: User): Promise<any> {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar,
        tenantId: user.tenantId,
        roles: user.roles,
        permissions: user.permissions
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }

  /**
   * Validate NextAuth.js session
   */
  async validateNextAuthSession(session: any): Promise<User | null> {
    if (!session?.user?.id) return null;

    const user = await this.getUser(session.user.id);
    if (!user || user.status !== 'active') return null;

    return user;
  }
}