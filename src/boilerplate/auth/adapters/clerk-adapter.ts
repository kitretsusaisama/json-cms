/**
 * Clerk Adapter
 * 
 * Integration adapter for Clerk authentication service.
 */

import {
  AuthResult,
  AuthCredentials,
  User,
  Session,
  ClerkAdapter as IClerkAdapter
} from '../../interfaces/auth';
import { BaseAuthAdapter, UserStorage } from './base-adapter';
import { SessionManager } from '../session-manager';

export interface ClerkConfig {
  publishableKey: string;
  secretKey: string;
  apiUrl?: string;
  jwtKey?: string;
}

export class ClerkAdapter extends BaseAuthAdapter implements IClerkAdapter {
  public publishableKey: string;
  public secretKey: string;
  private config: ClerkConfig;

  constructor(
    config: ClerkConfig,
    userStorage: UserStorage,
    sessionManager?: SessionManager
  ) {
    super(userStorage, sessionManager);
    this.publishableKey = config.publishableKey;
    this.secretKey = config.secretKey;
    this.config = {
      apiUrl: 'https://api.clerk.dev/v1',
      ...config
    };
  }

  /**
   * Authenticate using Clerk
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'token':
          return this.authenticateWithClerkToken(credentials);
        case 'oauth':
          return this.authenticateWithClerkOAuth(credentials);
        default:
          return this.createAuthResult(
            false,
            undefined,
            undefined,
            `Unsupported credential type for Clerk: ${credentials.type}`
          );
      }
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Clerk authentication failed'
      );
    }
  }

  /**
   * Authenticate with Clerk session token
   */
  private async authenticateWithClerkToken(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    if (!credentials.token) {
      return this.createAuthResult(false, undefined, undefined, 'Token required');
    }

    try {
      // Validate token with Clerk
      const clerkSession = await this.validateClerkToken(credentials.token);
      if (!clerkSession) {
        return this.createAuthResult(false, undefined, undefined, 'Invalid Clerk token');
      }

      // Get Clerk user
      const clerkUser = await this.getClerkUser(clerkSession.user_id);
      if (!clerkUser) {
        return this.createAuthResult(false, undefined, undefined, 'Clerk user not found');
      }

      // Sync user with CMS
      const user = await this.syncUserFromClerk(clerkUser);
      
      if (user.status !== 'active') {
        return this.createAuthResult(
          false,
          undefined,
          undefined,
          `Account is ${user.status}`
        );
      }

      // Create session
      const session = await this.createSession(user, {
        provider: 'clerk',
        clerkUserId: clerkUser.id,
        clerkSessionId: clerkSession.id,
        sessionToken: credentials.token
      });

      return this.createAuthResult(true, user, session);
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        'Failed to validate Clerk token'
      );
    }
  }

  /**
   * Authenticate with Clerk OAuth
   */
  private async authenticateWithClerkOAuth(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    // Clerk OAuth is typically handled client-side
    return this.createAuthResult(
      false,
      undefined,
      undefined,
      'Clerk OAuth should be handled client-side'
    );
  }

  /**
   * Validate Clerk session token
   */
  private async validateClerkToken(sessionToken: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/sessions/${sessionToken}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          return null; // Invalid or expired token
        }
        throw new Error(`Clerk API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clerk token validation failed:', error);
      return null;
    }
  }

  /**
   * Get Clerk user by ID
   */
  private async getClerkUser(userId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Clerk API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clerk user fetch failed:', error);
      return null;
    }
  }

  /**
   * Sync user from Clerk to CMS user storage
   */
  private async syncUserFromClerk(clerkUser: any): Promise<User> {
    // Try to find existing user by Clerk ID or email
    let user = await this.findUserByClerkId(clerkUser.id);
    
    if (!user && clerkUser.email_addresses?.length > 0) {
      const primaryEmail = clerkUser.email_addresses.find((email: any) => email.id === clerkUser.primary_email_address_id);
      if (primaryEmail) {
        user = await this.getUserByEmail(primaryEmail.email_address);
      }
    }

    const primaryEmail = clerkUser.email_addresses?.find((email: any) => email.id === clerkUser.primary_email_address_id);
    const email = primaryEmail?.email_address || '';
    const name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || email;

    if (user) {
      // Update existing user
      user = await this.updateUser(user.id, {
        name,
        avatar: clerkUser.profile_image_url || user.avatar,
        lastLoginAt: new Date().toISOString(),
        metadata: {
          ...user.metadata,
          clerkId: clerkUser.id,
          clerkProfile: clerkUser
        }
      });
    } else {
      // Create new user
      user = await this.createUser({
        email,
        name,
        roles: ['viewer'], // Default role
        metadata: {
          clerkId: clerkUser.id,
          clerkProfile: clerkUser,
          avatar: clerkUser.profile_image_url,
          emailVerified: primaryEmail?.verification?.status === 'verified'
        }
      });
    }

    return user;
  }

  /**
   * Find user by Clerk ID
   */
  private async findUserByClerkId(clerkId: string): Promise<User | null> {
    // This would require a more sophisticated query in the user storage
    // For demo purposes, we'll iterate through users
    const users = await this.listUsers();
    return users.find(user => user.metadata.clerkId === clerkId) || null;
  }

  /**
   * Create Clerk user
   */
  async createClerkUser(userData: {
    emailAddress: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email_address: [userData.emailAddress],
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          public_metadata: userData.metadata?.public || {},
          private_metadata: userData.metadata?.private || {},
          unsafe_metadata: userData.metadata?.unsafe || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Clerk user creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clerk user creation failed:', error);
      throw error;
    }
  }

  /**
   * Update Clerk user
   */
  async updateClerkUser(
    userId: string,
    userData: {
      firstName?: string;
      lastName?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: userData.firstName,
          last_name: userData.lastName,
          public_metadata: userData.metadata?.public || {},
          private_metadata: userData.metadata?.private || {},
          unsafe_metadata: userData.metadata?.unsafe || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Clerk user update failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clerk user update failed:', error);
      throw error;
    }
  }

  /**
   * Delete Clerk user
   */
  async deleteClerkUser(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Clerk user deletion failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Clerk user deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get Clerk sessions for user
   */
  async getClerkUserSessions(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}/sessions`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Clerk sessions fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clerk sessions fetch failed:', error);
      return [];
    }
  }

  /**
   * Revoke Clerk session
   */
  async revokeClerkSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Clerk session revocation failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Clerk session revocation failed:', error);
      throw error;
    }
  }

  /**
   * Verify Clerk JWT token
   */
  async verifyClerkJWT(token: string): Promise<any | null> {
    if (!this.config.jwtKey) {
      throw new Error('Clerk JWT key not configured');
    }

    try {
      // In a real implementation, you would use a JWT library to verify the token
      // with Clerk's public key. For demo purposes, we'll decode without verification.
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      // Basic validation
      if (payload.iss !== `https://clerk.${this.publishableKey.split('_')[1]}.lcl.dev`) {
        return null;
      }

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Clerk JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Handle Clerk webhook
   */
  async handleWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    // Verify webhook signature (implementation depends on Clerk's webhook setup)
    
    switch (payload.type) {
      case 'user.created':
        await this.handleUserCreated(payload.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(payload.data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(payload.data);
        break;
      case 'session.created':
        await this.handleSessionCreated(payload.data);
        break;
      case 'session.ended':
        await this.handleSessionEnded(payload.data);
        break;
      default:
        console.log(`Unhandled Clerk webhook event: ${payload.type}`);
    }
  }

  /**
   * Handle user created webhook
   */
  private async handleUserCreated(clerkUser: any): Promise<void> {
    try {
      await this.syncUserFromClerk(clerkUser);
    } catch (error) {
      console.error('Failed to handle Clerk user created:', error);
    }
  }

  /**
   * Handle user updated webhook
   */
  private async handleUserUpdated(clerkUser: any): Promise<void> {
    try {
      await this.syncUserFromClerk(clerkUser);
    } catch (error) {
      console.error('Failed to handle Clerk user updated:', error);
    }
  }

  /**
   * Handle user deleted webhook
   */
  private async handleUserDeleted(clerkUser: any): Promise<void> {
    try {
      const user = await this.findUserByClerkId(clerkUser.id);
      if (user) {
        await this.deleteUser(user.id);
      }
    } catch (error) {
      console.error('Failed to handle Clerk user deleted:', error);
    }
  }

  /**
   * Handle session created webhook
   */
  private async handleSessionCreated(clerkSession: any): Promise<void> {
    // Optional: sync session data if needed
    console.log('Clerk session created:', clerkSession.id);
  }

  /**
   * Handle session ended webhook
   */
  private async handleSessionEnded(clerkSession: any): Promise<void> {
    // Optional: cleanup CMS sessions if needed
    console.log('Clerk session ended:', clerkSession.id);
  }
}