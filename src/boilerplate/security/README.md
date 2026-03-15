# Security Module

The Security module provides comprehensive security measures for the JSON CMS Boilerplate system, implementing multiple layers of protection against common web vulnerabilities and attacks.

## Features

- **Input Sanitization**: HTML and text sanitization using DOMPurify and custom validation
- **Rate Limiting**: Configurable rate limiting with multiple strategies
- **CORS Management**: Cross-Origin Resource Sharing configuration and validation
- **CSP (Content Security Policy)**: Comprehensive CSP header management
- **Audit Logging**: Structured logging with correlation IDs and security event tracking
- **Security Middleware**: Integrated middleware for automatic security enforcement
- **Attack Detection**: Pattern-based detection of common attack vectors

## Components

### InputSanitizer

Provides comprehensive input sanitization and validation:

```typescript
import { InputSanitizer } from '@/boilerplate/security';

const sanitizer = new InputSanitizer();

// Sanitize HTML content
const cleanHtml = sanitizer.sanitizeHtml('<p>Hello <script>alert("xss")</script></p>');
// Result: '<p>Hello </p>'

// Sanitize plain text
const cleanText = sanitizer.sanitizeText('Hello\x00World');
// Result: 'HelloWorld'

// Validate with Zod schema
const result = sanitizer.validateAndSanitize(data, schema);

// Detect attack patterns
const attacks = sanitizer.detectAttacks(userInput);
```

### RateLimiter

Implements configurable rate limiting:

```typescript
import { RateLimiter } from '@/boilerplate/security';

const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => req.headers.get('x-forwarded-for') || 'unknown'
});

// Check rate limit
const { allowed, info } = await rateLimiter.checkRateLimit(request);

// Use as middleware
const middleware = rateLimiter.createMiddleware();
```

### CSPManager

Manages Content Security Policy headers:

```typescript
import { CSPManager } from '@/boilerplate/security';

const csp = new CSPManager({
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"]
  }
});

// Apply to response
csp.applyCSPHeaders(response);

// Add source dynamically
csp.addSource('script-src', 'https://cdn.example.com');
```

### CORSManager

Handles Cross-Origin Resource Sharing:

```typescript
import { CORSManager } from '@/boilerplate/security';

const cors = new CORSManager({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Apply CORS headers
cors.applyCORSHeaders(request, response);
```

### AuditLogger

Provides structured audit logging:

```typescript
import { AuditLogger } from '@/boilerplate/security';

const logger = new AuditLogger({
  enabled: true,
  logLevel: 'info',
  sensitiveFields: ['password', 'token']
});

// Log authentication events
logger.logAuth(request, 'login', userId);

// Log content operations
logger.logContent(request, 'create', 'page', pageId, 201, 150);

// Log security events
logger.logSecurity(request, 'rate_limit_exceeded', 'medium');
```

### SecurityMiddleware

Integrated security middleware:

```typescript
import { SecurityMiddleware } from '@/boilerplate/security';

// Development configuration
const devSecurity = SecurityMiddleware.createDevelopmentMiddleware();

// Production configuration
const prodSecurity = SecurityMiddleware.createProductionMiddleware([
  'https://yourdomain.com'
]);

// Use in Next.js middleware
export async function middleware(request: NextRequest) {
  return await prodSecurity.handle(request);
}

// Use in API routes
const apiMiddleware = prodSecurity.createAPIMiddleware();
```

## Configuration

### Environment Variables

```bash
# Logging configuration
LOGGING_ENDPOINT=https://logs.example.com/api/logs
LOGGING_API_KEY=your-logging-api-key

# Security settings
SECURITY_RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
SECURITY_RATE_LIMIT_MAX=100
SECURITY_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Security Schemas

Pre-built validation schemas for common content types:

```typescript
import { InputSanitizer } from '@/boilerplate/security';

const schemas = InputSanitizer.createContentSchemas();

// Validate page content
const pageResult = schemas.pageContent.safeParse(pageData);

// Validate SEO data
const seoResult = schemas.seoData.safeParse(seoData);

// Validate user input
const userResult = schemas.userInput.safeParse(userData);
```

## Security Best Practices

### 1. Input Validation

Always validate and sanitize user input:

```typescript
// Validate before processing
const result = sanitizer.validateAndSanitize(userInput, schema);
if (!result.isValid) {
  return { error: 'Invalid input', details: result.errors };
}

// Use sanitized data
const cleanData = result.sanitized;
```

### 2. Rate Limiting

Implement appropriate rate limits for different endpoints:

```typescript
// Strict limits for authentication
const authLimiter = RateLimiter.createAuthRateLimiter();

// Moderate limits for API endpoints
const apiLimiter = RateLimiter.createAPIRateLimiter();

// Generous limits for content viewing
const contentLimiter = RateLimiter.createContentRateLimiter();
```

### 3. Security Headers

Always apply security headers in production:

```typescript
const prodMiddleware = SecurityMiddleware.createProductionMiddleware([
  'https://yourdomain.com'
]);

// Includes:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security (HTTPS only)
// - Content-Security-Policy
// - Referrer-Policy
```

### 4. Audit Logging

Log security-relevant events:

```typescript
// Log authentication attempts
auditLogger.logAuth(request, 'failed_login', undefined, { 
  reason: 'invalid_credentials' 
});

// Log suspicious activity
auditLogger.logSecurity(request, 'suspicious_activity', 'high', {
  threats: ['sql_injection', 'xss_attempt']
});

// Log system events
auditLogger.logSystem('migration', 'Database migration completed', {
  version: '1.2.0',
  duration: 30000
});
```

## Attack Prevention

### XSS (Cross-Site Scripting)

- HTML sanitization with DOMPurify
- CSP headers to prevent script injection
- Input validation and output encoding

### SQL Injection

- Pattern detection in user input
- Parameterized queries (when using database)
- Input sanitization

### CSRF (Cross-Site Request Forgery)

- CORS configuration
- SameSite cookie attributes
- CSRF token validation (implement separately)

### Path Traversal

- File path sanitization
- Input validation for file operations
- Restricted file access patterns

### Rate Limiting Attacks

- Configurable rate limits per endpoint
- IP-based and user-based limiting
- Automatic cleanup of expired entries

## Integration Examples

### Next.js Middleware

```typescript
// middleware.ts
import { SecurityMiddleware } from '@/boilerplate/security';

const security = SecurityMiddleware.createProductionMiddleware([
  process.env.ALLOWED_ORIGIN!
]);

export async function middleware(request: NextRequest) {
  return await security.handle(request);
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*']
};
```

### API Route Protection

```typescript
// app/api/content/route.ts
import { SecurityMiddleware } from '@/boilerplate/security';

const security = SecurityMiddleware.createProductionMiddleware([
  process.env.ALLOWED_ORIGIN!
]);

export async function POST(request: NextRequest) {
  const middleware = security.createAPIMiddleware();
  
  return await middleware(request, async () => {
    // Your API logic here
    return new Response('Success');
  });
}
```

### Custom Validation

```typescript
import { InputSanitizer } from '@/boilerplate/security';
import { z } from 'zod';

const sanitizer = new InputSanitizer();

const customSchema = z.object({
  title: z.string().max(100).transform(val => 
    sanitizer.sanitizeText(val)
  ),
  content: z.string().transform(val => 
    sanitizer.sanitizeHtml(val)
  ),
  url: z.string().url().transform(val => 
    sanitizer.sanitizeUrl(val, ['example.com'])
  )
});

const result = sanitizer.validateAndSanitize(userInput, customSchema);
```

## Testing

Run the security tests:

```bash
npm test src/boilerplate/security/__tests__/
```

The test suite covers:
- Input sanitization and validation
- Rate limiting functionality
- Security middleware integration
- Attack pattern detection
- CORS and CSP configuration
- Audit logging

## Security Considerations

1. **Regular Updates**: Keep DOMPurify and other security dependencies updated
2. **Environment Configuration**: Use different security settings for development and production
3. **Monitoring**: Implement monitoring for security events and rate limit violations
4. **Incident Response**: Have procedures for handling security incidents
5. **Regular Audits**: Conduct regular security audits and penetration testing

## Performance Impact

The security middleware adds minimal overhead:
- Input sanitization: ~1-5ms per request
- Rate limiting: ~0.1-1ms per request
- Security headers: ~0.1ms per request
- Audit logging: ~1-3ms per request (depending on external logging)

For high-traffic applications, consider:
- Using Redis for distributed rate limiting
- Implementing security checks at the edge (CDN level)
- Caching sanitization results for repeated content