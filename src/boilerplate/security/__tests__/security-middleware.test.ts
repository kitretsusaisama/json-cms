import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityMiddleware } from '../security-middleware';

// Mock NextRequest
const createMockRequest = (
  method: string = 'GET',
  path: string = '/api/test',
  headers: Record<string, string> = {}
) => {
  const headerMap = new Map();
  Object.entries(headers).forEach(([key, value]) => {
    headerMap.set(key, value);
  });

  return {
    method,
    headers: headerMap,
    nextUrl: {
      pathname: path,
      searchParams: new URLSearchParams()
    }
  } as any;
};

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
  writable: true
});

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    middleware = new SecurityMiddleware({
      enableXSSProtection: true,
      enableFrameGuard: true,
      enableContentTypeNoSniff: true
    });
  });

  describe('handle', () => {
    it('should apply security headers', async () => {
      const request = createMockRequest();
      const response = await middleware.handle(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should block suspicious requests', async () => {
      const request = createMockRequest('GET', '/api/../../../etc/passwd');
      const response = await middleware.handle(request);

      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Request blocked for security reasons');
    });

    it('should detect malicious user agents', async () => {
      const request = createMockRequest('GET', '/api/test', {
        'user-agent': 'sqlmap/1.0'
      });
      
      const response = await middleware.handle(request);
      expect(response.status).toBe(403);
    });

    it('should detect SQL injection in query parameters', async () => {
      const request = {
        method: 'GET',
        headers: new Map(),
        nextUrl: {
          pathname: '/api/test',
          searchParams: new URLSearchParams('id=1; DROP TABLE users;--')
        }
      } as any;

      const response = await middleware.handle(request);
      expect(response.status).toBe(403);
    });

    it('should allow legitimate requests', async () => {
      const request = createMockRequest('GET', '/api/test', {
        'user-agent': 'Mozilla/5.0 (compatible browser)'
      });
      
      const response = await middleware.handle(request);
      expect(response.status).not.toBe(403);
    });
  });

  describe('createAPIMiddleware', () => {
    it('should create functional API middleware', async () => {
      const apiMiddleware = middleware.createAPIMiddleware();
      const request = createMockRequest();

      const response = await apiMiddleware(request, async () => {
        return new Response('OK', { status: 200 });
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should block malicious requests in API middleware', async () => {
      const apiMiddleware = middleware.createAPIMiddleware();
      const request = createMockRequest('GET', '/api/../../../etc/passwd');

      const response = await apiMiddleware(request, async () => {
        return new Response('OK', { status: 200 });
      });

      expect(response.status).toBe(403);
    });

    it('should handle errors in API middleware', async () => {
      const apiMiddleware = middleware.createAPIMiddleware();
      const request = createMockRequest();

      await expect(
        apiMiddleware(request, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('with rate limiting', () => {
    it('should apply rate limiting', async () => {
      const middlewareWithRateLimit = new SecurityMiddleware({
        rateLimit: {
          windowMs: 1000,
          maxRequests: 1
        }
      });

      const request = createMockRequest();
      
      // First request should pass
      const response1 = await middlewareWithRateLimit.handle(request);
      expect(response1.status).not.toBe(429);

      // Second request should be rate limited
      const response2 = await middlewareWithRateLimit.handle(request);
      expect(response2.status).toBe(429);
    });
  });

  describe('with CORS', () => {
    it('should apply CORS headers', async () => {
      const middlewareWithCORS = new SecurityMiddleware({
        cors: {
          origin: ['https://example.com'],
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type'],
          credentials: true
        }
      });

      const request = createMockRequest('GET', '/api/test', {
        'origin': 'https://example.com'
      });
      
      const response = await middlewareWithCORS.handle(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('with CSP', () => {
    it('should apply CSP headers', async () => {
      const middlewareWithCSP = new SecurityMiddleware({
        csp: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"]
          }
        }
      });

      const request = createMockRequest();
      const response = await middlewareWithCSP.handle(request);
      
      const cspHeader = response.headers.get('Content-Security-Policy');
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("script-src 'self' 'unsafe-inline'");
    });
  });

  describe('static factory methods', () => {
    it('should create development middleware', () => {
      const devMiddleware = SecurityMiddleware.createDevelopmentMiddleware();
      expect(devMiddleware).toBeInstanceOf(SecurityMiddleware);
    });

    it('should create production middleware', () => {
      const prodMiddleware = SecurityMiddleware.createProductionMiddleware(['https://example.com']);
      expect(prodMiddleware).toBeInstanceOf(SecurityMiddleware);
    });
  });

  describe('security validation', () => {
    it('should detect suspicious headers', async () => {
      const request = createMockRequest('GET', '/api/test', {
        'x-forwarded-host': 'malicious.com'
      });
      
      const response = await middleware.handle(request);
      expect(response.status).toBe(403);
    });

    it('should detect command injection characters', async () => {
      const request = {
        method: 'GET',
        headers: new Map(),
        nextUrl: {
          pathname: '/api/test',
          searchParams: new URLSearchParams('cmd=ls; rm -rf /')
        }
      } as any;

      const response = await middleware.handle(request);
      expect(response.status).toBe(403);
    });

    it('should allow safe query parameters', async () => {
      const request = {
        method: 'GET',
        headers: new Map([['user-agent', 'Mozilla/5.0']]),
        nextUrl: {
          pathname: '/api/test',
          searchParams: new URLSearchParams('search=hello world&page=1')
        }
      } as any;

      const response = await middleware.handle(request);
      expect(response.status).not.toBe(403);
    });
  });

  describe('error handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Create middleware that will throw an error
      const faultyMiddleware = new SecurityMiddleware();
      
      // Mock a method to throw an error
      vi.spyOn(faultyMiddleware as any, 'validateRequest').mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = createMockRequest();
      const response = await faultyMiddleware.handle(request);

      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.error).toBe('Internal security error');
    });
  });
});