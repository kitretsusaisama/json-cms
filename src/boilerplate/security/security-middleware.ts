import { NextRequest, NextResponse } from 'next/server';
import { CSPManager } from './csp-manager';
import { CORSManager } from './cors-manager';
import { RateLimiter } from './rate-limiter';
import { AuditLogger } from './audit-logger';
import { InputSanitizer } from './input-sanitizer';
import { SecurityMiddlewareOptions } from './interfaces';

export class SecurityMiddleware {
  private cspManager?: CSPManager;
  private corsManager?: CORSManager;
  private rateLimiter?: RateLimiter;
  private auditLogger?: AuditLogger;
  private inputSanitizer: InputSanitizer;
  private options: SecurityMiddlewareOptions;

  constructor(options: SecurityMiddlewareOptions = {}) {
    this.options = {
      enableXSSProtection: true,
      enableFrameGuard: true,
      enableContentTypeNoSniff: true,
      ...options
    };

    // Initialize components based on configuration
    if (options.csp) {
      this.cspManager = new CSPManager(options.csp);
    }

    if (options.cors) {
      this.corsManager = new CORSManager(options.cors);
    }

    if (options.rateLimit) {
      this.rateLimiter = new RateLimiter(options.rateLimit);
    }

    if (options.audit) {
      this.auditLogger = new AuditLogger(options.audit);
    }

    this.inputSanitizer = new InputSanitizer();
  }

  /**
   * Apply security headers to response
   */
  private applySecurityHeaders(response: NextResponse): NextResponse {
    // X-Content-Type-Options
    if (this.options.enableContentTypeNoSniff) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (this.options.enableFrameGuard) {
      response.headers.set('X-Frame-Options', 'DENY');
    }

    // X-XSS-Protection
    if (this.options.enableXSSProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    response.headers.set('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // Strict Transport Security (HTTPS only)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    return response;
  }

  /**
   * Validate request for security threats
   */
  private async validateRequest(request: NextRequest): Promise<{
    isValid: boolean;
    threats: string[];
  }> {
    const threats: string[] = [];

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.has(header)) {
        threats.push(`Suspicious header detected: ${header}`);
      }
    }

    // Check for path traversal in URL
    const url = request.nextUrl.pathname;
    if (url.includes('../') || url.includes('..\\')) {
      threats.push('Path traversal attempt detected');
    }

    // Check for SQL injection patterns in query parameters
    const searchParams = request.nextUrl.searchParams;
    for (const [key, value] of searchParams.entries()) {
      const attacks = this.inputSanitizer.detectAttacks(value);
      if (attacks.length > 0) {
        threats.push(`Potential attack in query parameter ${key}: ${attacks.map(a => a.name).join(', ')}`);
      }
    }

    // Check User-Agent for known malicious patterns
    const userAgent = request.headers.get('user-agent') || '';
    const maliciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burpsuite/i,
      /nmap/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(userAgent)) {
        threats.push('Malicious user agent detected');
        break;
      }
    }

    return {
      isValid: threats.length === 0,
      threats
    };
  }

  /**
   * Main middleware function
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Validate request for security threats
      const validation = await this.validateRequest(request);
      
      if (!validation.isValid) {
        // Log security threat
        if (this.auditLogger) {
          this.auditLogger.logSecurity(
            request,
            'suspicious_activity',
            'high',
            { threats: validation.threats }
          );
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Request blocked for security reasons',
            code: 'SECURITY_VIOLATION'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check rate limiting
      if (this.rateLimiter) {
        const { allowed, info } = await this.rateLimiter.checkRateLimit(request);
        
        if (!allowed) {
          if (this.auditLogger) {
            this.auditLogger.logSecurity(
              request,
              'rate_limit_exceeded',
              'medium',
              { rateLimitInfo: info }
            );
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
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
        }
      }

      // Continue to next middleware or handler
      const response = NextResponse.next();

      // Apply security headers
      this.applySecurityHeaders(response);

      // Apply CORS headers
      if (this.corsManager) {
        this.corsManager.applyCORSHeaders(request, response);
      }

      // Apply CSP headers
      if (this.cspManager) {
        this.cspManager.applyCSPHeaders(response);
      }

      // Log request
      if (this.auditLogger) {
        const responseTime = Date.now() - startTime;
        const entry = this.auditLogger.createAuditEntry(
          request,
          'middleware_request',
          request.nextUrl.pathname,
          response.status,
          responseTime
        );
        this.auditLogger.log(entry);
      }

      return response;

    } catch (error) {
      // Log error
      if (this.auditLogger) {
        const responseTime = Date.now() - startTime;
        this.auditLogger.logSystem(
          'error',
          'Security middleware error',
          { 
            error: error instanceof Error ? error.message : 'Unknown error',
            path: request.nextUrl.pathname,
            method: request.method
          }
        );
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Internal security error',
          code: 'SECURITY_ERROR'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Create API route middleware
   */
  createAPIMiddleware() {
    return async (request: NextRequest, handler: () => Promise<Response>): Promise<Response> => {
      const startTime = Date.now();

      // Validate request
      const validation = await this.validateRequest(request);
      
      if (!validation.isValid) {
        if (this.auditLogger) {
          this.auditLogger.logSecurity(
            request,
            'suspicious_activity',
            'high',
            { threats: validation.threats }
          );
        }

        return new Response(
          JSON.stringify({
            error: 'Request blocked for security reasons',
            code: 'SECURITY_VIOLATION'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check rate limiting
      if (this.rateLimiter) {
        const { allowed, info } = await this.rateLimiter.checkRateLimit(request);
        
        if (!allowed) {
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfter: info.retryAfter
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': info.limit.toString(),
                'X-RateLimit-Remaining': info.remaining.toString(),
                'X-RateLimit-Reset': info.reset.toString()
              }
            }
          );
        }
      }

      try {
        const response = await handler();
        const responseTime = Date.now() - startTime;

        // Apply security headers
        const secureResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });

        this.applySecurityHeaders(secureResponse as any);

        // Apply CORS headers
        if (this.corsManager) {
          this.corsManager.applyCORSHeaders(request, secureResponse as any);
        }

        // Log successful request
        if (this.auditLogger) {
          const entry = this.auditLogger.createAuditEntry(
            request,
            'api_request',
            request.nextUrl.pathname,
            response.status,
            responseTime
          );
          this.auditLogger.log(entry);
        }

        return secureResponse;

      } catch (error) {
        const responseTime = Date.now() - startTime;

        // Log error
        if (this.auditLogger) {
          const entry = this.auditLogger.createAuditEntry(
            request,
            'api_error',
            request.nextUrl.pathname,
            500,
            responseTime,
            { metadata: { error: error instanceof Error ? error.message : 'Unknown error' } }
          );
          this.auditLogger.log(entry);
        }

        throw error;
      }
    };
  }

  /**
   * Create development security middleware
   */
  static createDevelopmentMiddleware(): SecurityMiddleware {
    return new SecurityMiddleware({
      enableXSSProtection: true,
      enableFrameGuard: false, // Allow framing in development
      enableContentTypeNoSniff: true,
      cors: {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1000 // Higher limit for development
      },
      audit: {
        enabled: true,
        logLevel: 'debug',
        includeRequestBody: true,
        sensitiveFields: ['password', 'token']
      }
    });
  }

  /**
   * Create production security middleware
   */
  static createProductionMiddleware(allowedOrigins: string[]): SecurityMiddleware {
    return new SecurityMiddleware({
      enableXSSProtection: true,
      enableFrameGuard: true,
      enableContentTypeNoSniff: true,
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        credentials: true
      },
      csp: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'https:'],
          'connect-src': ["'self'", ...allowedOrigins],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"]
        }
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        includeRequestBody: false,
        sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
      }
    });
  }
}

// Export singleton instances
export const developmentSecurity = SecurityMiddleware.createDevelopmentMiddleware();
export const productionSecurity = (origins: string[]) => 
  SecurityMiddleware.createProductionMiddleware(origins);