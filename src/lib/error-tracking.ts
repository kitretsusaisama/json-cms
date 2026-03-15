/**
 * Custom error tracking utility to replace Sentry
 * Provides error capturing, context management, and performance monitoring
 */
import { logger } from './logger';
interface ErrorTrackingOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  debug?: boolean;
  sampleRate?: number;
  maxBreadcrumbs?: number;
  attachStacktrace?: boolean;
}

// Browser error handling with options object
interface WindowErrorHandlerOptions {
  message: string | Event;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: unknown;
  };
}

class ErrorTracking {
  private static instance: ErrorTracking;
  private options: ErrorTrackingOptions;
  private context: ErrorContext = {};
  private breadcrumbs: Array<{message: string; category: string; timestamp: number; data?: unknown}> = [];
  private enabled = false;
  private initialized = false;
  
  private constructor(options: ErrorTrackingOptions = {}) {
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      debug: process.env.NODE_ENV !== 'production',
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      attachStacktrace: true,
      ...options
    };
  }

  /** Get the singleton instance */
  public static getInstance(options?: ErrorTrackingOptions): ErrorTracking {
    if (!ErrorTracking.instance) {
      ErrorTracking.instance = new ErrorTracking(options);
    }
    return ErrorTracking.instance;
  }

  /* Initialize the error tracking system */
  public init(options: ErrorTrackingOptions = {}): void {
    if (this.initialized) {
      if (this.options.debug) {
        logger.warn({ message: 'ErrorTracking already initialized' });
      }
      return;
    }

    this.options = { ...this.options, ...options };
    this.enabled = Boolean(this.options.dsn);
    this.initialized = true;

    if (this.enabled) {
      this.setupGlobalHandlers();
      logger.info({ message: 'ErrorTracking initialized', options: this.options });
    } else if (this.options.debug) {
      logger.info({ message: 'ErrorTracking initialized in disabled mode (no DSN provided)' });
    }
  }
  /** Set up global error handlers */
  private setupGlobalHandlers(): void {
    if (typeof window !== 'undefined') {      
      const originalOnError = window.onerror;

      window.onerror = ((opts: WindowErrorHandlerOptions): boolean => {
        const { message, source, lineno, colno, error } = opts;
        this.captureException(error || new Error(String(message)));
        return originalOnError?.call(window, message, source, lineno, colno, error) ?? false;
      }) as unknown as OnErrorEventHandler; // type cast for TS compatibility
      // Unhandled promise rejection handling
      const originalOnUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = (event: PromiseRejectionEvent) => {
        this.captureException(event.reason || new Error('Unhandled Promise rejection'));
        return originalOnUnhandledRejection?.call(window, event);
      };
    }
  }
  /*** Capture an exception*/  
  public captureException(error: Error, contextData?: ErrorContext): string {
    if (!this.enabled) {
      return 'disabled';
    }

    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    const errorData = {
      id: errorId,
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: { ...this.context, ...contextData },
      breadcrumbs: [...this.breadcrumbs],
      environment: this.options.environment,
      release: this.options.release,
    };

    logger.error({
      message: `[ErrorTracking] ${error.message}`,
      errorId,
      ...errorData,        // already contains the `error` field
    });

    // In a real implementation, we would send this to a backend service
    // This is where you would implement the API call to your error tracking backend
    if (this.options.dsn && typeof fetch !== 'undefined') {
      // Example of how you might send this to a backend service
      // This is commented out since there's no actual backend service in this example
      /*
      fetch(this.options.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(err => {
        console.error('Failed to send error to tracking service:', err);
      });
      */
    }

    return errorId;
  }

  /**
   * Capture a message
   */
  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', contextData?: ErrorContext): string {
    if (!this.enabled) {
      return 'disabled';
    }

    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    const messageData = {
      id: errorId,
      timestamp,
      message,
      level,
      context: { ...this.context, ...contextData },
      breadcrumbs: [...this.breadcrumbs],
      environment: this.options.environment,
      release: this.options.release,
    };

    logger[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info']({
      errorId,
      ...messageData,
    });
    return errorId;
  }

  /**
   * Add a breadcrumb to track user actions leading up to an error
   */
  public addBreadcrumb(message: string, category = 'default', data?: unknown): void {
    if (!this.enabled) {
      return;
    }

    const breadcrumb = {
      message,
      category,
      timestamp: Date.now(),
      data,
    };

    this.breadcrumbs.push(breadcrumb);
    
    // Limit the number of breadcrumbs
    if (this.breadcrumbs.length > (this.options.maxBreadcrumbs || 100)) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Set user information for error context
   */
  public setUser(user: ErrorContext['user'] | null): void {
    if (user === null) {
      delete this.context.user;
    } else {
      this.context.user = user;
    }
  }

  /**
   * Set tags for error context
   */
  public setTags(tags: Record<string, string>): void {
    this.context.tags = { ...this.context.tags, ...tags };
  }

  /**
   * Set extra data for error context
   */
  public setExtras(extras: Record<string, unknown>): void {
    this.context.extra = { ...this.context.extra, ...extras };
  }

  /**
   * Clear all context data
   */
  public clearContext(): void {
    this.context = {};
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    let i = 0;
    return uuid.replace(/[xy]/g, () => {
      const c = uuid[i++];
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Start a performance measurement
   */
  public startTransaction(name: string, data?: unknown): { finish: (status?: string) => void } {
    const startTime = performance.now();
    const id = this.generateErrorId();
    
    const meta = typeof data === 'object' && data !== null ? data : {};
    this.addBreadcrumb(`Started transaction: ${name}`, 'transaction', { id, ...meta });
    
    return {
      finish: (status = 'ok') => {
        const duration = performance.now() - startTime;
        this.addBreadcrumb(
          `Finished transaction: ${name}`,
          'transaction',
          { id, duration, status, ...meta }
        );
        
        // In a real implementation, you might send this performance data to your backend
        if (this.options.debug) {
          logger.info({ 
            message: `Transaction ${name} completed in ${duration.toFixed(2)}ms with status ${status}`,
            transaction: name,
            duration,
            status
          });
        }
      },
    };
  }
}

// Create and export the singleton instance
export const errorTracking = ErrorTracking.getInstance();

// Helper function to get trace data (replacement for Sentry.getTraceData)
export function getTraceData(): Record<string, string> {
  return {
    'error-tracking-version': '1.0.0',
  };
}

// Export types for use in other files
export type { ErrorTrackingOptions, ErrorContext };