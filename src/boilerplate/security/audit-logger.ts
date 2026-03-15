import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { AuditConfig, AuditLogEntry } from './interfaces';

export class AuditLogger {
  private config: AuditConfig;
  private sensitiveFieldPatterns: RegExp[];

  constructor(config?: Partial<AuditConfig>) {
    this.config = {
      enabled: true,
      logLevel: 'info',
      includeRequestBody: false,
      includeResponseBody: false,
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'session',
        'credit_card',
        'ssn',
        'social_security'
      ],
      ...config
    };

    this.sensitiveFieldPatterns = this.config.sensitiveFields.map(field => 
      new RegExp(field, 'i')
    );
  }

  /**
   * Generate correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Extract correlation ID from request headers
   */
  getCorrelationId(request: NextRequest): string {
    return request.headers.get('x-correlation-id') || this.generateCorrelationId();
  }

  /**
   * Sanitize sensitive data from object
   */
  private sanitizeSensitiveData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeSensitiveData(item));
    }

    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = this.sensitiveFieldPatterns.some(pattern => 
        pattern.test(key)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Extract user information from request
   */
  private extractUserInfo(request: NextRequest): { userId?: string; tenantId?: string } {
    const userId = request.headers.get('x-user-id') || undefined;
    const tenantId = request.headers.get('x-tenant-id') || undefined;
    
    return { userId, tenantId };
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('x-remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddr || 'unknown';
  }

  /**
   * Create audit log entry
   */
  createAuditEntry(
    request: NextRequest,
    action: string,
    resource: string,
    responseStatus: number,
    responseTime: number,
    options?: {
      requestBody?: unknown;
      responseBody?: unknown;
      metadata?: Record<string, unknown>;
    }
  ): AuditLogEntry {
    const correlationId = this.getCorrelationId(request);
    const { userId, tenantId } = this.extractUserInfo(request);
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const entry: AuditLogEntry = {
      correlationId,
      timestamp: new Date().toISOString(),
      userId,
      tenantId,
      action,
      resource,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent,
      ip,
      responseStatus,
      responseTime,
      metadata: options?.metadata
    };

    // Include request body if configured
    if (this.config.includeRequestBody && options?.requestBody) {
      entry.requestBody = this.sanitizeSensitiveData(options.requestBody);
    }

    // Include response body if configured (not recommended for production)
    if (this.config.includeResponseBody && options?.responseBody) {
      entry.responseBody = this.sanitizeSensitiveData(options.responseBody);
    }

    return entry;
  }

  /**
   * Log audit entry
   */
  log(entry: AuditLogEntry): void {
    if (!this.config.enabled) {
      return;
    }

    const logData = {
      level: this.config.logLevel,
      message: `${entry.action} ${entry.resource}`,
      ...entry
    };

    // Use structured logging format
    console.log(JSON.stringify(logData));

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(entry);
    }
  }

  /**
   * Log authentication events
   */
  logAuth(
    request: NextRequest,
    event: 'login' | 'logout' | 'failed_login' | 'token_refresh',
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.createAuditEntry(
      request,
      `auth_${event}`,
      'authentication',
      event === 'failed_login' ? 401 : 200,
      0,
      { metadata: { ...metadata, userId } }
    );

    this.log(entry);
  }

  /**
   * Log content operations
   */
  logContent(
    request: NextRequest,
    operation: 'create' | 'read' | 'update' | 'delete',
    contentType: string,
    contentId: string,
    responseStatus: number,
    responseTime: number,
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.createAuditEntry(
      request,
      `content_${operation}`,
      `${contentType}:${contentId}`,
      responseStatus,
      responseTime,
      { metadata }
    );

    this.log(entry);
  }

  /**
   * Log security events
   */
  logSecurity(
    request: NextRequest,
    event: 'rate_limit_exceeded' | 'invalid_token' | 'permission_denied' | 'suspicious_activity',
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.createAuditEntry(
      request,
      `security_${event}`,
      'security',
      event === 'rate_limit_exceeded' ? 429 : 403,
      0,
      { metadata: { ...metadata, severity } }
    );

    this.log(entry);
  }

  /**
   * Log system events
   */
  logSystem(
    event: 'startup' | 'shutdown' | 'migration' | 'backup' | 'error',
    details: string,
    metadata?: Record<string, unknown>
  ): void {
    const logData = {
      level: this.config.logLevel,
      message: `System event: ${event}`,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      event,
      details,
      metadata
    };

    console.log(JSON.stringify(logData));

    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logData);
    }
  }

  /**
   * Send logs to external logging service
   */
  private async sendToExternalLogger(data: unknown): Promise<void> {
    // Implementation would depend on your logging service
    // Examples: Datadog, New Relic, CloudWatch, etc.
    
    const loggingEndpoint = process.env.LOGGING_ENDPOINT;
    const loggingApiKey = process.env.LOGGING_API_KEY;

    if (!loggingEndpoint || !loggingApiKey) {
      return;
    }

    try {
      await fetch(loggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loggingApiKey}`
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      // Don't throw errors from logging to avoid breaking the main flow
      console.error('Failed to send log to external service:', error);
    }
  }

  /**
   * Create middleware for automatic request logging
   */
  createMiddleware() {
    return async (request: NextRequest, handler: () => Promise<Response>): Promise<Response> => {
      const startTime = Date.now();
      const correlationId = this.getCorrelationId(request);
      
      // Add correlation ID to request headers for downstream use
      request.headers.set('x-correlation-id', correlationId);

      try {
        const response = await handler();
        const responseTime = Date.now() - startTime;

        // Log successful request
        const entry = this.createAuditEntry(
          request,
          'api_request',
          request.nextUrl.pathname,
          response.status,
          responseTime
        );

        this.log(entry);

        // Add correlation ID to response headers
        response.headers.set('x-correlation-id', correlationId);

        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;

        // Log error
        const entry = this.createAuditEntry(
          request,
          'api_error',
          request.nextUrl.pathname,
          500,
          responseTime,
          { metadata: { error: error instanceof Error ? error.message : 'Unknown error' } }
        );

        this.log(entry);

        throw error;
      }
    };
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();