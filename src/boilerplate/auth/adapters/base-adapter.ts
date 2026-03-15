/**
 * Base Auth Adapter
 *
 * FIXED:
 *  - BUG-AUTH-001: Plaintext password storage replaced with proper bcrypt
 *  - BUG-AUTH-002: hashPassword was returning password as-is (catastrophic security hole)
 *  - Note: bcrypt dynamically imported to avoid edge runtime incompatibility
 */

import { AuthUser, AuthSession, AuthAdapter, AdapterConfig } from './index';

export abstract class BaseAuthAdapter implements AuthAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract getUser(id: string): Promise<AuthUser | null>;
  abstract getUserByEmail(email: string): Promise<AuthUser | null>;
  abstract createUser(data: Partial<AuthUser>): Promise<AuthUser>;
  abstract updateUser(id: string, data: Partial<AuthUser>): Promise<AuthUser>;
  abstract deleteUser(id: string): Promise<void>;
  abstract createSession(userId: string): Promise<AuthSession>;
  abstract getSession(token: string): Promise<AuthSession | null>;
  abstract deleteSession(token: string): Promise<void>;
  abstract validateCredentials(email: string, password: string): Promise<AuthUser | null>;

  /**
   * Validate user credentials against a bcrypt hash.
   * FIXED: was `return password === hashedPassword` (plaintext comparison — critical security bug)
   */
  protected async validatePassword(
    plaintext: string,
    hashedPassword: string,
  ): Promise<boolean> {
    if (!plaintext || !hashedPassword) return false;
    try {
      // Dynamic import: keeps edge runtime happy, pulls bcrypt only when needed
      const bcrypt = await import('bcryptjs');
      return bcrypt.compare(plaintext, hashedPassword);
    } catch {
      // bcryptjs not installed — fall back to timing-safe comparison (dev only)
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[Auth] bcryptjs is required in production. Run: npm install bcryptjs');
      }
      const { timingSafeEqual } = await import('crypto');
      const a = Buffer.from(plaintext);
      const b = Buffer.from(hashedPassword);
      return a.length === b.length && timingSafeEqual(a, b);
    }
  }

  /**
   * Hash a password with bcrypt (cost factor 12).
   * FIXED: was returning password as-is — critical security hole.
   */
  protected async hashPassword(password: string): Promise<string> {
    if (!password) throw new Error('Password cannot be empty');
    try {
      const bcrypt = await import('bcryptjs');
      return bcrypt.hash(password, 12);
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[Auth] bcryptjs is required in production. Run: npm install bcryptjs');
      }
      throw new Error('[Auth] Cannot hash password in development without bcryptjs');
    }
  }

  /**
   * Sanitize user object before returning to consumers.
   * Strips internal fields that should never be exposed.
   */
  protected sanitizeUser(user: AuthUser & { passwordHash?: string }): AuthUser {
    const { passwordHash: _ph, ...clean } = user;
    return clean;
  }
}
