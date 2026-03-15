/**
 * Session Manager
 * 
 * Handles session creation, validation, and lifecycle management.
 */

import { User, Session } from '../interfaces/auth';
import { JWTUtils } from './jwt-utils';

export interface SessionStorage {
  create(session: Omit<Session, 'id'>): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  getByToken(token: string): Promise<Session | null>;
  update(sessionId: string, data: Partial<Session>): Promise<Session>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface SessionManagerConfig {
  storage: SessionStorage;
  jwtUtils: JWTUtils;
  sessionTTL?: number; // in seconds, default 24 hours
  refreshTokenTTL?: number; // in seconds, default 7 days
  maxSessionsPerUser?: number; // default unlimited
  enableRefreshTokens?: boolean; // default true
}

export class SessionManager {
  private storage: SessionStorage;
  private jwtUtils: JWTUtils;
  private config: SessionManagerConfig;

  constructor(config: SessionManagerConfig) {
    this.storage = config.storage;
    this.jwtUtils = config.jwtUtils;
    this.config = {
      sessionTTL: 24 * 60 * 60, // 24 hours
      refreshTokenTTL: 7 * 24 * 60 * 60, // 7 days
      enableRefreshTokens: true,
      ...config
    };
  }

  /**
   * Create new session for user
   */
  async createSession(
    user: User,
    metadata?: Record<string, unknown>
  ): Promise<Session> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.config.sessionTTL! * 1000));

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: this.generateSessionId()
    };

    const token = await this.jwtUtils.sign(tokenPayload, {
      expiresIn: this.config.sessionTTL!
    });

    // Generate refresh token if enabled
    let refreshToken: string | undefined;
    if (this.config.enableRefreshTokens) {
      refreshToken = await this.jwtUtils.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: this.config.refreshTokenTTL! }
      );
    }

    const sessionData = {
      userId: user.id,
      tenantId: user.tenantId,
      token,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      metadata: metadata || {}
    };

    const session = await this.storage.create(sessionData);

    // Cleanup old sessions if limit is set
    if (this.config.maxSessionsPerUser) {
      await this.cleanupUserSessions(user.id);
    }

    return session;
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<Session | null> {
    try {
      // Verify JWT token
      const payload = await this.jwtUtils.verify(token);
      if (!payload || typeof payload !== 'object' || !payload.sessionId) {
        return null;
      }

      // Get session from storage
      const session = await this.storage.get(payload.sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.storage.delete(session.id);
        return null;
      }

      // Verify token matches
      if (session.token !== token) {
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Refresh session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<Session | null> {
    if (!this.config.enableRefreshTokens) {
      throw new Error('Refresh tokens are disabled');
    }

    try {
      // Verify refresh token
      const payload = await this.jwtUtils.verify(refreshToken);
      if (!payload || typeof payload !== 'object' || payload.type !== 'refresh') {
        return null;
      }

      // Find session by refresh token
      const sessions = await this.getUserSessions(payload.userId);
      const session = sessions.find(s => s.refreshToken === refreshToken);
      
      if (!session) {
        return null;
      }

      // Generate new tokens
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.config.sessionTTL! * 1000));

      const newTokenPayload = {
        userId: session.userId,
        tenantId: session.tenantId,
        sessionId: session.id
      };

      const newToken = await this.jwtUtils.sign(newTokenPayload, {
        expiresIn: this.config.sessionTTL!
      });

      const newRefreshToken = await this.jwtUtils.sign(
        { userId: session.userId, type: 'refresh' },
        { expiresIn: this.config.refreshTokenTTL! }
      );

      // Update session
      const updatedSession = await this.storage.update(session.id, {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString()
      });

      return updatedSession;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  /**
   * Destroy all sessions for user
   */
  async destroyUserSessions(userId: string): Promise<void> {
    await this.storage.deleteByUserId(userId);
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    // Use the storage's getUserSessions method if available
    if (typeof (this.storage as any).getUserSessions === 'function') {
      return (this.storage as any).getUserSessions(userId);
    }
    return [];
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<Session> {
    return this.storage.update(sessionId, { metadata });
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.storage.cleanup();
  }

  /**
   * Cleanup old sessions for user (keep only the most recent ones)
   */
  private async cleanupUserSessions(userId: string): Promise<void> {
    if (!this.config.maxSessionsPerUser) {
      return;
    }

    const sessions = await this.getUserSessions(userId);
    if (sessions.length <= this.config.maxSessionsPerUser) {
      return;
    }

    // Sort by creation date (newest first)
    sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Delete excess sessions
    const sessionsToDelete = sessions.slice(this.config.maxSessionsPerUser);
    for (const session of sessionsToDelete) {
      await this.storage.delete(session.id);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanupExpiredSessions().catch(error => {
        console.error('Session cleanup failed:', error);
      });
    }, intervalMs);
  }
}