import { NextRequest, NextResponse } from 'next/server';
import { CORSConfig } from './interfaces';

export class CORSManager {
  private config: CORSConfig;

  constructor(config?: Partial<CORSConfig>) {
    this.config = {
      origin: process.env.NODE_ENV === 'production' ? false : true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-ID',
        'X-Correlation-ID'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      ...config
    };
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    if (this.config.origin === true) {
      return true;
    }

    if (this.config.origin === false) {
      return false;
    }

    if (typeof this.config.origin === 'string') {
      return this.config.origin === origin;
    }

    if (Array.isArray(this.config.origin)) {
      return this.config.origin.includes(origin);
    }

    return false;
  }

  /**
   * Apply CORS headers to response
   */
  applyCORSHeaders(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');
    const requestMethod = request.headers.get('access-control-request-method');
    const requestHeaders = request.headers.get('access-control-request-headers');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return this.handlePreflightRequest(request, response);
    }

    // Set origin header
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.config.origin === true) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    // Set credentials header
    if (this.config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Set exposed headers
    response.headers.set('Access-Control-Expose-Headers', [
      'X-Total-Count',
      'X-Page-Count',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ].join(', '));

    return response;
  }

  /**
   * Handle preflight OPTIONS requests
   */
  private handlePreflightRequest(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');
    const requestMethod = request.headers.get('access-control-request-method');
    const requestHeaders = request.headers.get('access-control-request-headers');

    // Check origin
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.config.origin === true) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else {
      return new NextResponse('CORS not allowed', { status: 403 });
    }

    // Check method
    if (requestMethod && this.config.methods.includes(requestMethod)) {
      response.headers.set('Access-Control-Allow-Methods', this.config.methods.join(', '));
    } else {
      return new NextResponse('Method not allowed', { status: 405 });
    }

    // Check headers
    if (requestHeaders) {
      const requestedHeaders = requestHeaders.split(',').map(h => h.trim().toLowerCase());
      const allowedHeaders = this.config.allowedHeaders.map(h => h.toLowerCase());
      
      const isHeadersAllowed = requestedHeaders.every(header => 
        allowedHeaders.includes(header) || header.startsWith('x-')
      );

      if (isHeadersAllowed) {
        response.headers.set('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '));
      } else {
        return new NextResponse('Headers not allowed', { status: 403 });
      }
    }

    // Set credentials
    if (this.config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Set max age
    if (this.config.maxAge) {
      response.headers.set('Access-Control-Max-Age', this.config.maxAge.toString());
    }

    return response;
  }

  /**
   * Create development CORS configuration
   */
  static createDevelopmentCORS(): CORSManager {
    return new CORSManager({
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-ID',
        'X-Correlation-ID',
        'X-API-Key',
        'Accept',
        'Origin'
      ],
      credentials: true,
      maxAge: 3600
    });
  }

  /**
   * Create production CORS configuration
   */
  static createProductionCORS(allowedOrigins: string[]): CORSManager {
    return new CORSManager({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-ID',
        'X-Correlation-ID'
      ],
      credentials: true,
      maxAge: 86400
    });
  }

  /**
   * Create API-only CORS configuration
   */
  static createAPICORS(allowedOrigins: string[]): CORSManager {
    return new CORSManager({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Tenant-ID'
      ],
      credentials: false,
      maxAge: 86400
    });
  }

  /**
   * Validate CORS configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for wildcard origin with credentials
    if (this.config.origin === true && this.config.credentials) {
      errors.push('Cannot use wildcard origin (*) with credentials enabled');
    }

    // Check for empty methods
    if (!this.config.methods || this.config.methods.length === 0) {
      errors.push('At least one HTTP method must be allowed');
    }

    // Check for invalid methods
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'];
    const invalidMethods = this.config.methods.filter(method => 
      !validMethods.includes(method.toUpperCase())
    );

    if (invalidMethods.length > 0) {
      errors.push(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add allowed origin
   */
  addAllowedOrigin(origin: string): void {
    if (Array.isArray(this.config.origin)) {
      if (!this.config.origin.includes(origin)) {
        this.config.origin.push(origin);
      }
    } else {
      this.config.origin = [origin];
    }
  }

  /**
   * Remove allowed origin
   */
  removeAllowedOrigin(origin: string): void {
    if (Array.isArray(this.config.origin)) {
      this.config.origin = this.config.origin.filter(o => o !== origin);
    }
  }
}

// Export singleton instances
export const developmentCORS = CORSManager.createDevelopmentCORS();
export const productionCORS = (origins: string[]) => CORSManager.createProductionCORS(origins);
export const apiCORS = (origins: string[]) => CORSManager.createAPICORS(origins);