/**
 * JWT Utilities
 * 
 * Provides JWT token creation, validation, and management utilities.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface JWTConfig {
  secret: string;
  algorithm?: string;
  issuer?: string;
  audience?: string;
  defaultExpiresIn?: number; // in seconds
}

export interface JWTSignOptions {
  expiresIn?: number; // in seconds
  issuer?: string;
  audience?: string;
  subject?: string;
  jwtId?: string;
}

export interface JWTVerifyOptions {
  issuer?: string;
  audience?: string;
  subject?: string;
  maxAge?: number; // in seconds
}

export class JWTUtils {
  private config: JWTConfig;
  private secretKey: Uint8Array;

  constructor(config: JWTConfig) {
    this.config = {
      algorithm: 'HS256',
      defaultExpiresIn: 3600, // 1 hour
      ...config
    };
    
    // Convert secret to Uint8Array for jose library
    this.secretKey = new TextEncoder().encode(this.config.secret);
  }

  /**
   * Sign JWT token
   */
  async sign(
    payload: Record<string, unknown>,
    options?: JWTSignOptions
  ): Promise<string> {
    const jwt = new SignJWT(payload);

    // Set standard claims
    if (options?.issuer || this.config.issuer) {
      jwt.setIssuer(options?.issuer || this.config.issuer!);
    }

    if (options?.audience || this.config.audience) {
      jwt.setAudience(options?.audience || this.config.audience!);
    }

    if (options?.subject) {
      jwt.setSubject(options.subject);
    }

    if (options?.jwtId) {
      jwt.setJti(options.jwtId);
    }

    // Set expiration
    const expiresIn = options?.expiresIn || this.config.defaultExpiresIn!;
    jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn);

    // Set issued at
    jwt.setIssuedAt();

    // Set not before (optional)
    jwt.setNotBefore(Math.floor(Date.now() / 1000));

    // Sign and return
    return jwt
      .setProtectedHeader({ alg: this.config.algorithm! })
      .sign(this.secretKey);
  }

  /**
   * Verify JWT token
   */
  async verify(
    token: string,
    options?: JWTVerifyOptions
  ): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: options?.issuer || this.config.issuer,
        audience: options?.audience || this.config.audience,
        subject: options?.subject,
        maxTokenAge: options?.maxAge ? `${options.maxAge}s` : undefined
      });

      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  decode(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8')
      );

      return decoded;
    } catch (error) {
      console.error('JWT decode failed:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isExpired(token: string): boolean {
    const payload = this.decode(token);
    if (!payload || !payload.exp) {
      return true;
    }

    return payload.exp < Math.floor(Date.now() / 1000);
  }

  /**
   * Get token expiration time
   */
  getExpirationTime(token: string): Date | null {
    const payload = this.decode(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  /**
   * Get token issued time
   */
  getIssuedTime(token: string): Date | null {
    const payload = this.decode(token);
    if (!payload || !payload.iat) {
      return null;
    }

    return new Date(payload.iat * 1000);
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeToExpiry(token: string): number | null {
    const expirationTime = this.getExpirationTime(token);
    if (!expirationTime) {
      return null;
    }

    const now = new Date();
    const timeToExpiry = Math.floor((expirationTime.getTime() - now.getTime()) / 1000);
    
    return Math.max(0, timeToExpiry);
  }

  /**
   * Refresh token if it's close to expiry
   */
  async refreshIfNeeded(
    token: string,
    refreshThreshold: number = 300, // 5 minutes
    refreshCallback: (payload: JWTPayload) => Promise<string>
  ): Promise<string> {
    const timeToExpiry = this.getTimeToExpiry(token);
    
    if (timeToExpiry === null || timeToExpiry <= refreshThreshold) {
      const payload = await this.verify(token);
      if (payload) {
        return refreshCallback(payload);
      }
    }

    return token;
  }

  /**
   * Create token with custom claims
   */
  async createAccessToken(
    userId: string,
    tenantId?: string,
    roles: string[] = [],
    permissions: string[] = [],
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const payload = {
      sub: userId,
      tenantId,
      roles,
      permissions,
      type: 'access',
      ...metadata
    };

    return this.sign(payload);
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(
    userId: string,
    sessionId?: string,
    expiresIn: number = 7 * 24 * 3600 // 7 days
  ): Promise<string> {
    const payload = {
      sub: userId,
      sessionId,
      type: 'refresh'
    };

    return this.sign(payload, { expiresIn });
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<{
    userId: string;
    tenantId?: string;
    roles: string[];
    permissions: string[];
    metadata?: Record<string, unknown>;
  } | null> {
    const payload = await this.verify(token);
    
    if (!payload || payload.type !== 'access' || !payload.sub) {
      return null;
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId as string | undefined,
      roles: (payload.roles as string[]) || [],
      permissions: (payload.permissions as string[]) || [],
      metadata: payload.metadata as Record<string, unknown> | undefined
    };
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{
    userId: string;
    sessionId?: string;
  } | null> {
    const payload = await this.verify(token);
    
    if (!payload || payload.type !== 'refresh' || !payload.sub) {
      return null;
    }

    return {
      userId: payload.sub,
      sessionId: payload.sessionId as string | undefined
    };
  }
}