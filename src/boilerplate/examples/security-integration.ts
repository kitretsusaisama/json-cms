/**
 * Security Integration Examples
 * 
 * This file demonstrates how to integrate the security module
 * into various parts of the application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  SecurityMiddleware, 
  InputSanitizer, 
  RateLimiter, 
  AuditLogger,
  CSPManager,
  CORSManager
} from '../security';
import { z } from 'zod';

// Example 1: Basic API Route Protection
export async function protectedAPIRoute(request: NextRequest) {
  const security = SecurityMiddleware.createProductionMiddleware([
    'https://yourdomain.com'
  ]);
  
  const middleware = security.createAPIMiddleware();
  
  return await middleware(request, async () => {
    // Your protected API logic here
    return new Response(JSON.stringify({ message: 'Success' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

// Example 2: Content Validation and Sanitization
const contentSanitizer = new InputSanitizer();
const contentSchemas = InputSanitizer.createContentSchemas();

export async function createPageEndpoint(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate and sanitize page content
    const validation = contentSanitizer.validateAndSanitize(
      body, 
      contentSchemas.pageContent
    );
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        error: 'Invalid page content',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Use sanitized data
    const sanitizedPage = validation.sanitized;
    
    // Save page logic here...
    
    return new Response(JSON.stringify({
      message: 'Page created successfully',
      page: sanitizedPage
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to create page'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Example 3: Custom Rate Limiting for Different Endpoints
export class APIRateLimiters {
  static readonly auth = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Very strict for auth
    keyGenerator: (req) => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      return `auth:${ip}`;
    }
  });
  
  static readonly content = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (req) => {
      const userId = req.headers.get('x-user-id');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      return userId ? `content:user:${userId}` : `content:ip:${ip}`;
    }
  });
  
  static readonly upload = new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (req) => {
      const userId = req.headers.get('x-user-id');
      return userId ? `upload:${userId}` : 'upload:anonymous';
    }
  });
}

// Example 4: Authentication Endpoint with Security
export async function loginEndpoint(request: NextRequest) {
  const authMiddleware = APIRateLimiters.auth.createMiddleware();
  const auditLogger = new AuditLogger();
  
  return await authMiddleware(request, async () => {
    try {
      const body = await request.json();
      
      // Validate login data
      const loginSchema = z.object({
        email: z.string().email().max(255),
        password: z.string().min(8).max(128)
      });
      
      const validation = contentSanitizer.validateAndSanitize(body, loginSchema);
      
      if (!validation.isValid) {
        auditLogger.logAuth(request, 'failed_login', undefined, {
          reason: 'invalid_input',
          errors: validation.errors
        });
        
        return new Response(JSON.stringify({
          error: 'Invalid login credentials'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Authenticate user logic here...
      const user = await authenticateUser(validation.sanitized);
      
      if (!user) {
        auditLogger.logAuth(request, 'failed_login', undefined, {
          reason: 'invalid_credentials',
          email: validation.sanitized.email
        });
        
        return new Response(JSON.stringify({
          error: 'Invalid login credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Log successful login
      auditLogger.logAuth(request, 'login', user.id, {
        email: user.email
      });
      
      return new Response(JSON.stringify({
        message: 'Login successful',
        user: { id: user.id, email: user.email }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      auditLogger.logSystem('error', 'Login endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return new Response(JSON.stringify({
        error: 'Login failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
}

// Example 5: File Upload with Security
export async function fileUploadEndpoint(request: NextRequest) {
  const uploadMiddleware = APIRateLimiters.upload.createMiddleware();
  const auditLogger = new AuditLogger();
  
  return await uploadMiddleware(request, async () => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(JSON.stringify({
          error: 'No file provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        auditLogger.logSecurity(request, 'suspicious_activity', 'medium', {
          reason: 'invalid_file_type',
          fileType: file.type,
          fileName: file.name
        });
        
        return new Response(JSON.stringify({
          error: 'Invalid file type'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (file.size > maxSize) {
        return new Response(JSON.stringify({
          error: 'File too large'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Sanitize filename
      const sanitizedFilename = contentSanitizer.sanitizeFilePath(file.name);
      
      // Process file upload logic here...
      
      auditLogger.logContent(
        request, 
        'create', 
        'file', 
        sanitizedFilename, 
        201, 
        Date.now()
      );
      
      return new Response(JSON.stringify({
        message: 'File uploaded successfully',
        filename: sanitizedFilename
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Upload failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
}

// Example 6: Custom CSP for Different Pages
export class PageCSPManager {
  static readonly adminCSP = new CSPManager({
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'font-src': ["'self'", 'https:'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"]
    }
  });
  
  static readonly publicCSP = new CSPManager({
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://analytics.google.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://analytics.google.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"]
    }
  });
  
  static applyForPath(response: NextResponse, path: string): NextResponse {
    if (path.startsWith('/admin')) {
      return this.adminCSP.applyCSPHeaders(response);
    } else {
      return this.publicCSP.applyCSPHeaders(response);
    }
  }
}

// Example 7: Comprehensive Security Audit
export class SecurityAuditor {
  private auditLogger: AuditLogger;
  private inputSanitizer: InputSanitizer;
  
  constructor() {
    this.auditLogger = new AuditLogger({
      enabled: true,
      logLevel: 'info',
      sensitiveFields: ['password', 'token', 'secret', 'key']
    });
    this.inputSanitizer = new InputSanitizer();
  }
  
  async auditRequest(request: NextRequest, response: Response): Promise<void> {
    const startTime = Date.now();
    
    // Check for security threats in request
    const url = request.nextUrl.pathname;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || '';
    
    // Detect potential attacks
    const urlAttacks = this.inputSanitizer.detectAttacks(url);
    const uaAttacks = this.inputSanitizer.detectAttacks(userAgent);
    
    if (urlAttacks.length > 0 || uaAttacks.length > 0) {
      this.auditLogger.logSecurity(request, 'suspicious_activity', 'high', {
        urlAttacks: urlAttacks.map(a => a.name),
        userAgentAttacks: uaAttacks.map(a => a.name)
      });
    }
    
    // Log request details
    this.auditLogger.logContent(
      request,
      method.toLowerCase() as any,
      'api',
      url,
      response.status,
      Date.now() - startTime
    );
  }
  
  async auditUserAction(
    request: NextRequest,
    userId: string,
    action: string,
    resource: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.auditLogger.logContent(
      request,
      action as any,
      resource,
      userId,
      200,
      0,
      metadata
    );
  }
}

// Helper function for authentication (placeholder)
async function authenticateUser(credentials: { email: string; password: string }) {
  // Implement your authentication logic here
  // This is just a placeholder
  return null;
}