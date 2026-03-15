import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rate-limiter';

// Mock NextRequest
const createMockRequest = (ip: string = '127.0.0.1', path: string = '/api/test') => {
  return {
    method: 'GET',
    headers: new Map([
      ['x-forwarded-for', ip]
    ]),
    nextUrl: {
      pathname: path
    }
  } as any;
};

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const request = createMockRequest();
      
      const result1 = await rateLimiter.checkRateLimit(request);
      expect(result1.allowed).toBe(true);
      expect(result1.info.remaining).toBe(2);

      const result2 = await rateLimiter.checkRateLimit(request);
      expect(result2.allowed).toBe(true);
      expect(result2.info.remaining).toBe(1);

      const result3 = await rateLimiter.checkRateLimit(request);
      expect(result3.allowed).toBe(true);
      expect(result3.info.remaining).toBe(0);
    });

    it('should block requests exceeding limit', async () => {
      const request = createMockRequest();
      
      // Use up the limit
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);

      // This should be blocked
      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(false);
      expect(result.info.remaining).toBe(0);
      expect(result.info.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', async () => {
      const request = createMockRequest();
      
      // Use up the limit
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(2);
    });

    it('should handle different IPs separately', async () => {
      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      
      // Use up limit for first IP
      await rateLimiter.checkRateLimit(request1);
      await rateLimiter.checkRateLimit(request1);
      await rateLimiter.checkRateLimit(request1);

      // Second IP should still be allowed
      const result = await rateLimiter.checkRateLimit(request2);
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(2);
    });

    it('should handle different paths separately', async () => {
      const request1 = createMockRequest('127.0.0.1', '/api/test1');
      const request2 = createMockRequest('127.0.0.1', '/api/test2');
      
      // Use up limit for first path
      await rateLimiter.checkRateLimit(request1);
      await rateLimiter.checkRateLimit(request1);
      await rateLimiter.checkRateLimit(request1);

      // Second path should still be allowed
      const result = await rateLimiter.checkRateLimit(request2);
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(2);
    });
  });

  describe('recordSuccess', () => {
    it('should decrement count when skipSuccessfulRequests is enabled', async () => {
      const limiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        skipSuccessfulRequests: true
      });

      const request = createMockRequest();
      
      await limiter.checkRateLimit(request);
      await limiter.checkRateLimit(request);
      
      // Record success - should decrement count
      limiter.recordSuccess(request);
      
      const info = limiter.getInfo(request);
      expect(info.remaining).toBe(2); // Should have more remaining after success

      limiter.destroy();
    });
  });

  describe('recordFailure', () => {
    it('should decrement count when skipFailedRequests is enabled', async () => {
      const limiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        skipFailedRequests: true
      });

      const request = createMockRequest();
      
      await limiter.checkRateLimit(request);
      await limiter.checkRateLimit(request);
      
      // Record failure - should decrement count
      limiter.recordFailure(request);
      
      const info = limiter.getInfo(request);
      expect(info.remaining).toBe(2); // Should have more remaining after failure

      limiter.destroy();
    });
  });

  describe('reset', () => {
    it('should reset rate limit for specific key', async () => {
      const request = createMockRequest();
      
      // Use up the limit
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);

      // Reset
      rateLimiter.reset(request);

      // Should be allowed again
      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(2);
    });
  });

  describe('getInfo', () => {
    it('should return current info without incrementing', async () => {
      const request = createMockRequest();
      
      await rateLimiter.checkRateLimit(request);
      
      const info1 = rateLimiter.getInfo(request);
      const info2 = rateLimiter.getInfo(request);
      
      expect(info1.remaining).toBe(info2.remaining);
    });
  });

  describe('static factory methods', () => {
    it('should create API rate limiter', () => {
      const limiter = RateLimiter.createAPIRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      limiter.destroy();
    });

    it('should create auth rate limiter', () => {
      const limiter = RateLimiter.createAuthRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      limiter.destroy();
    });

    it('should create content rate limiter', () => {
      const limiter = RateLimiter.createContentRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      limiter.destroy();
    });

    it('should create upload rate limiter', () => {
      const limiter = RateLimiter.createUploadRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      limiter.destroy();
    });
  });

  describe('middleware', () => {
    it('should block requests when rate limit exceeded', async () => {
      const request = createMockRequest();
      const middleware = rateLimiter.createMiddleware();
      
      // Use up the limit
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);
      await rateLimiter.checkRateLimit(request);

      // This should be blocked by middleware
      const response = await middleware(request, async () => {
        return new Response('OK');
      });

      expect(response.status).toBe(429);
      
      const body = await response.json();
      expect(body.error).toBe('Rate limit exceeded');
    });

    it('should allow requests within limit', async () => {
      const request = createMockRequest();
      const middleware = rateLimiter.createMiddleware();

      const response = await middleware(request, async () => {
        return new Response('OK');
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
    });
  });
});