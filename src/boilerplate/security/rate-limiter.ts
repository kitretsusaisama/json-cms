import { NextRequest } from 'next/server';
import { RateLimitConfig, RateLimitInfo } from './interfaces';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getClientIP(req),
      ...config
    };

    this.store = new Map();
    this.startCleanupInterval();
  }

  /**
   * Get client IP address for rate limiting
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || 'unknown';
  }

  /**
   * Generate rate limit key
   */
  private generateKey(request: NextRequest): string {
    const baseKey = this.config.keyGenerator!(request);
    const path = request.nextUrl.pathname;
    const method = request.method;
    
    return `${baseKey}:${method}:${path}`;
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);

    // Initialize or reset if window expired
    if (!entry || entry.firstRequest < windowStart) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const allowed = entry.count <= this.config.maxRequests;

    const info: RateLimitInfo = {
      limit: this.config.maxRequests,
      remaining,
      reset: Math.ceil(entry.resetTime / 1000),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    };

    return { allowed, info };
  }

  /**
   * Record successful request (for skipSuccessfulRequests option)
   */
  recordSuccess(request: NextRequest): void {
    if (this.config.skipSuccessfulRequests) {
      const key = this.generateKey(request);
      const entry = this.store.get(key);
      
      if (entry && entry.count > 0) {
        entry.count--;
        this.store.set(key, entry);
      }
    }
  }

  /**
   * Record failed request (for skipFailedRequests option)
   */
  recordFailure(request: NextRequest): void {
    if (this.config.skipFailedRequests) {
      const key = this.generateKey(request);
      const entry = this.store.get(key);
      
      if (entry && entry.count > 0) {
        entry.count--;
        this.store.set(key, entry);
      }
    }
  }

  /**
   * Reset rate limit for specific key
   */
  reset(request: NextRequest): void {
    const key = this.generateKey(request);
    this.store.delete(key);
  }

  /**
   * Get current rate limit info without incrementing
   */
  getInfo(request: NextRequest): RateLimitInfo {
    const key = this.generateKey(request);
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || entry.firstRequest < now - this.config.windowMs) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: Math.ceil((now + this.config.windowMs) / 1000)
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      limit: this.config.maxRequests,
      remaining,
      reset: Math.ceil(entry.resetTime / 1000),
      retryAfter: remaining === 0 ? Math.ceil((entry.resetTime - now) / 1000) : undefined
    };
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      for (const [key, entry] of this.store.entries()) {
        if (entry.firstRequest < windowStart) {
          this.store.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Create rate limiter for API endpoints
   */
  static createAPIRateLimiter(): RateLimiter {
    return new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      keyGenerator: (req) => {
        const apiKey = req.headers.get('x-api-key');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        return apiKey ? `api:${apiKey}` : `ip:${ip}`;
      }
    });
  }

  /**
   * Create rate limiter for authentication endpoints
   */
  static createAuthRateLimiter(): RateLimiter {
    return new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // Strict limit for auth attempts
      keyGenerator: (req) => {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        return `auth:${ip}`;
      }
    });
  }

  /**
   * Create rate limiter for content operations
   */
  static createContentRateLimiter(): RateLimiter {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req) => {
        const userId = req.headers.get('x-user-id');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        return userId ? `user:${userId}` : `ip:${ip}`;
      }
    });
  }

  /**
   * Create rate limiter for file uploads
   */
  static createUploadRateLimiter(): RateLimiter {
    return new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: (req) => {
        const userId = req.headers.get('x-user-id');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        return `upload:${userId || ip}`;
      }
    });
  }

  /**
   * Create middleware for automatic rate limiting
   */
  createMiddleware() {
    return async (request: NextRequest, handler: () => Promise<Response>): Promise<Response> => {
      const { allowed, info } = await this.checkRateLimit(request);

      if (!allowed) {
        // Call onLimitReached callback if configured
        if (this.config.onLimitReached) {
          this.config.onLimitReached(request);
        }

        const response = new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${info.retryAfter} seconds.`,
            retryAfter: info.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': info.limit.toString(),
              'X-RateLimit-Remaining': info.remaining.toString(),
              'X-RateLimit-Reset': info.reset.toString(),
              'Retry-After': info.retryAfter?.toString() || '0'
            }
          }
        );

        return response;
      }

      try {
        const response = await handler();

        // Record success/failure based on status code
        if (response.status >= 200 && response.status < 400) {
          this.recordSuccess(request);
        } else if (response.status >= 400) {
          this.recordFailure(request);
        }

        // Add rate limit headers to response
        response.headers.set('X-RateLimit-Limit', info.limit.toString());
        response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
        response.headers.set('X-RateLimit-Reset', info.reset.toString());

        return response;
      } catch (error) {
        this.recordFailure(request);
        throw error;
      }
    };
  }
}

// Export singleton instances
export const apiRateLimiter = RateLimiter.createAPIRateLimiter();
export const authRateLimiter = RateLimiter.createAuthRateLimiter();
export const contentRateLimiter = RateLimiter.createContentRateLimiter();
export const uploadRateLimiter = RateLimiter.createUploadRateLimiter();