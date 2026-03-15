/**
 * JWT Authentication Adapter
 * 
 * Simple JWT-based authentication adapter for username/password auth.
 */

import {
  AuthResult,
  AuthCredentials,
  User,
  JWTAdapter as IJWTAdapter
} from '../../interfaces/auth';
import { BaseAuthAdapter, UserStorage } from './base-adapter';
import { SessionManager } from '../session-manager';

export interface JWTAdapterConfig {
  secret: string;
  algorithm: string;
  expiresIn: string;
  allowRegistration?: boolean;
  requireEmailVerification?: boolean;
}

export class JWTAdapter extends BaseAuthAdapter implements IJWTAdapter {
  public secret: string;
  public algorithm: string;
  public expiresIn: string;
  private config: JWTAdapterConfig;

  constructor(
    config: JWTAdapterConfig,
    userStorage: UserStorage,
    sessionManager?: SessionManager
  ) {
    super(userStorage, sessionManager);
    this.secret = config.secret;
    this.algorithm = config.algorithm;
    this.expiresIn = config.expiresIn;
    this.config = {
      allowRegistration: true,
      requireEmailVerification: false,
      ...config
    };
  }

  /**
   * Authenticate user with email/password
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'email':
          return this.authenticateWithEmail(credentials);
        case 'token':
          return this.authenticateWithToken(credentials);
        default:
          return this.createAuthResult(
            false,
            undefined,
            undefined,
            `Unsupported credential type: ${credentials.type}`
          );
      }
    } catch (error) {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Authentication failed'
      );
    }
  }

  /**
   * Authenticate with email and password
   */
  private async authenticateWithEmail(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    if (!credentials.password) {
      return this.createAuthResult(false, undefined, undefined, 'Password required');
    }

    if (!this.isValidEmail(credentials.identifier)) {
      return this.createAuthResult(false, undefined, undefined, 'Invalid email format');
    }

    // Find user by email
    let user = await this.getUserByEmail(credentials.identifier);

    // If user doesn't exist and registration is allowed, create new user
    if (!user && this.config.allowRegistration) {
      user = await this.createUser({
        email: credentials.identifier,
        name: credentials.metadata?.name as string || credentials.identifier,
        password: credentials.password,
        tenantId: credentials.metadata?.tenantId as string,
        metadata: credentials.metadata || {}
      });
    }

    if (!user) {
      return this.createAuthResult(false, undefined, undefined, 'User not found');
    }

    // Check if user is active
    if (user.status !== 'active') {
      return this.createAuthResult(
        false,
        undefined,
        undefined,
        `Account is ${user.status}`
      );
    }

    // Validate password (in real implementation, compare with hashed password)
    const storedPassword = user.metadata.password as string;
    if (!storedPassword || !await this.validatePassword(credentials.password, storedPassword)) {
      return this.createAuthResult(false, undefined, undefined, 'Invalid credentials');
    }

    // Create session
    const session = await this.createSession(user, {
      loginMethod: 'email',
      userAgent: credentials.metadata?.userAgent,
      ipAddress: credentials.metadata?.ipAddress
    });

    return this.createAuthResult(true, user, session);
  }

  /**
   * Authenticate with JWT token
   */
  private async authenticateWithToken(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    if (!credentials.token) {
      return this.createAuthResult(false, undefined, undefined, 'Token required');
    }

    // Validate session token
    const session = await this.validateSession(credentials.token);
    if (!session) {
      return this.createAuthResult(false, undefined, undefined, 'Invalid or expired token');
    }

    // Get user
    const user = await this.getUser(session.userId);
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

    return this.createAuthResult(true, user, session);
  }

  /**
   * Create user with password
   */
  async createUser(data: any): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    
    const userData = {
      email: data.email,
      name: data.name,
      roles: data.roles || ['viewer'], // Default role
      permissions: [],
      tenantId: data.tenantId,
      metadata: {
        ...data.metadata,
        password: hashedPassword,
        emailVerified: !this.config.requireEmailVerification
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active' as const
    };

    return this.userStorage.create(userData);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const storedPassword = user.metadata.password as string;
    if (!await this.validatePassword(currentPassword, storedPassword)) {
      throw new Error('Current password is incorrect');
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.updateUser(userId, {
      metadata: {
        ...user.metadata,
        password: hashedNewPassword
      },
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Reset password (admin function)
   */
  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.updateUser(userId, {
      metadata: {
        ...user.metadata,
        password: hashedNewPassword,
        passwordResetAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    // Destroy all existing sessions to force re-login
    if (this.sessionManager) {
      await this.sessionManager.destroyUserSessions(userId);
    }

    return true;
  }

  /**
   * Verify email (if email verification is enabled)
   */
  async verifyEmail(userId: string, verificationToken: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, you would validate the verification token
    // For demo purposes, we'll just mark the email as verified
    await this.updateUser(userId, {
      metadata: {
        ...user.metadata,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(user: User): boolean {
    return user.metadata.emailVerified === true;
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    // In a real implementation, generate a secure token and store it
    // For demo purposes, we'll return a simple token
    const token = `reset_${user.id}_${Date.now()}`;
    
    await this.updateUser(user.id, {
      metadata: {
        ...user.metadata,
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 3600000).toISOString() // 1 hour
      }
    });

    return token;
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<User | null> {
    // In a real implementation, you would query by the token
    // For demo purposes, we'll extract the user ID from the token
    const parts = token.split('_');
    if (parts.length !== 3 || parts[0] !== 'reset') {
      return null;
    }

    const userId = parts[1];
    const user = await this.getUser(userId);
    
    if (!user || user.metadata.passwordResetToken !== token) {
      return null;
    }

    const expires = new Date(user.metadata.passwordResetExpires as string);
    if (expires < new Date()) {
      return null;
    }

    return user;
  }
}