/**
 * Error Tracker Implementation
 * 
 * Provides error tracking, context capture, and integration
 * with external error monitoring services.
 */

import { randomUUID } from 'crypto';
import { 
  ErrorTracker, 
  ErrorContext, 
  Breadcrumb, 
  LogLevel,
  MonitoringConfig 
} from './interfaces';
import { getLogger, getCurrentCorrelationId, getCurrentTenantId, getCurrentUserId } from './structured-logger';

interface CapturedError {
  id: string;
  error: Error;
  message?: string;
  level: keyof LogLevel;
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  tags: Record<string, string>;
  contexts: Record<string, Record<string, unknown>>;
  timestamp: string;
  fingerprint?: string;
}

export class BoilerplateErrorTracker implements ErrorTracker {
  private config: MonitoringConfig['errorTracking'];
  private logger = getLogger();
  
  // Current context
  private user?: { id: string; email?: string; username?: string };
  private tags: Record<string, string> = {};
  private contexts: Record<string, Record<string, unknown>> = {};
  private breadcrumbs: Breadcrumb[] = [];
  
  // Error storage (in production, send to external service)
  private capturedErrors: CapturedError[] = [];

  constructor(config: MonitoringConfig['errorTracking']) {
    this.config = config;
    
    if (config.enabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  captureError(error: Error, context?: ErrorContext): string {
    const errorId = randomUUID();
    
    const capturedError: CapturedError = {
      id: errorId,
      error,
      level: 'ERROR',
      context: this.buildContext(context),
      breadcrumbs: [...this.breadcrumbs],
      user: this.user,
      tags: { ...this.tags },
      contexts: { ...this.contexts },
      timestamp: new Date().toISOString(),
      fingerprint: this.generateFingerprint(error)
    };
    
    this.processCapturedError(capturedError);
    return errorId;
  }

  captureMessage(message: string, level: keyof LogLevel, context?: ErrorContext): string {
    const messageId = randomUUID();
    
    const capturedError: CapturedError = {
      id: messageId,
      error: new Error(message),
      message,
      level,
      context: this.buildContext(context),
      breadcrumbs: [...this.breadcrumbs],
      user: this.user,
      tags: { ...this.tags },
      contexts: { ...this.contexts },
      timestamp: new Date().toISOString()
    };
    
    this.processCapturedError(capturedError);
    return messageId;
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    this.user = user;
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  setContext(key: string, context: Record<string, unknown>): void {
    this.contexts[key] = context;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || new Date().toISOString()
    };
    
    this.breadcrumbs.push(fullBreadcrumb);
    
    // Keep only the last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }
  }

  private buildContext(context?: ErrorContext): ErrorContext {
    return {
      tenantId: context?.tenantId || getCurrentTenantId(),
      userId: context?.userId || getCurrentUserId(),
      requestId: getCurrentCorrelationId(),
      ...context
    };
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error type and stack trace
    const stackLines = error.stack?.split('\n') || [];
    const relevantLines = stackLines
      .slice(0, 5) // Take first 5 lines
      .map(line => line.replace(/:\d+:\d+/g, '')) // Remove line numbers
      .join('|');
    
    return `${error.name}|${relevantLines}`;
  }

  private processCapturedError(capturedError: CapturedError): void {
    // Store locally
    this.capturedErrors.push(capturedError);
    
    // Log the error
    this.logger.error(
      capturedError.message || capturedError.error.message,
      {
        errorId: capturedError.id,
        fingerprint: capturedError.fingerprint,
        context: capturedError.context,
        tags: capturedError.tags
      },
      capturedError.error
    );
    
    // Send to external service if configured
    if (this.config.dsn) {
      this.sendToExternalService(capturedError);
    }
    
    // Clean up old errors (keep last 1000)
    if (this.capturedErrors.length > 1000) {
      this.capturedErrors = this.capturedErrors.slice(-1000);
    }
  }

  private sendToExternalService(capturedError: CapturedError): void {
    // Sample based on configuration
    if (Math.random() > this.config.sampleRate) {
      return;
    }
    
    // In a real implementation, this would integrate with services like:
    // - Sentry
    // - Rollbar
    // - Bugsnag
    // - DataDog
    
    const payload = {
      event_id: capturedError.id,
      timestamp: capturedError.timestamp,
      level: capturedError.level.toLowerCase(),
      message: capturedError.message || capturedError.error.message,
      exception: {
        values: [{
          type: capturedError.error.name,
          value: capturedError.error.message,
          stacktrace: {
            frames: this.parseStackTrace(capturedError.error.stack)
          }
        }]
      },
      user: capturedError.user,
      tags: capturedError.tags,
      contexts: capturedError.contexts,
      breadcrumbs: capturedError.breadcrumbs,
      environment: this.config.environment,
      fingerprint: capturedError.fingerprint ? [capturedError.fingerprint] : undefined
    };
    
    // Send to external service
    fetch(this.config.dsn!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'boilerplate-error-tracker/1.0.0'
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      this.logger.warn('Failed to send error to external service', {
        error: error.message,
        originalErrorId: capturedError.id
      });
    });
  }

  private parseStackTrace(stack?: string): any[] {
    if (!stack) return [];
    
    return stack
      .split('\n')
      .slice(1) // Skip the error message line
      .map(line => {
        const match = line.match(/\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
            colno: parseInt(match[4])
          };
        }
        return { raw: line.trim() };
      })
      .filter(frame => frame.function || frame.raw);
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureError(error, {
        extra: {
          type: 'unhandledRejection',
          promise: promise.toString()
        }
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.captureError(error, {
        extra: {
          type: 'uncaughtException'
        }
      });
      
      // In production, you might want to gracefully shutdown
      // process.exit(1);
    });
  }

  // Utility methods for getting captured errors
  getCapturedErrors(limit: number = 100): CapturedError[] {
    return this.capturedErrors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getCapturedError(id: string): CapturedError | undefined {
    return this.capturedErrors.find(error => error.id === id);
  }

  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    byFingerprint: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};
    const byFingerprint: Record<string, number> = {};
    
    this.capturedErrors.forEach(error => {
      byLevel[error.level] = (byLevel[error.level] || 0) + 1;
      if (error.fingerprint) {
        byFingerprint[error.fingerprint] = (byFingerprint[error.fingerprint] || 0) + 1;
      }
    });
    
    return {
      total: this.capturedErrors.length,
      byLevel,
      byFingerprint
    };
  }
}

// Middleware for automatic breadcrumb collection
export function createErrorTrackingMiddleware(errorTracker: ErrorTracker) {
  return (req: any, res: any, next: any) => {
    // Add request breadcrumb
    errorTracker.addBreadcrumb({
      message: `${req.method} ${req.url}`,
      category: 'http',
      level: 'INFO',
      data: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });
    
    // Set user context if available
    if (req.user) {
      errorTracker.setUser({
        id: req.user.id,
        email: req.user.email,
        username: req.user.username
      });
    }
    
    // Set request context
    errorTracker.setContext('request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params
    });
    
    next();
  };
}

// Express error handler middleware
export function createErrorHandlerMiddleware(errorTracker: ErrorTracker) {
  return (error: Error, req: any, res: any, next: any) => {
    const errorId = errorTracker.captureError(error, {
      endpoint: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      extra: {
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
    
    // Send error response
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        id: errorId,
        timestamp: new Date().toISOString()
      }
    });
  };
}