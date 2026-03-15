/**
 * Structured Logger Implementation
 * 
 * Provides structured logging with correlation IDs, tenant context,
 * and multiple output formats for the CMS boilerplate system.
 */

import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { StructuredLogger, LogEntry, LogLevel, MonitoringConfig } from './interfaces';

// Context storage for correlation IDs and request context
export const contextStorage = new AsyncLocalStorage<{
  correlationId: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
}>();

export class BoilerplateLogger implements StructuredLogger {
  private config: MonitoringConfig['logging'];
  private context: Record<string, unknown>;

  constructor(config: MonitoringConfig['logging'], context: Record<string, unknown> = {}) {
    this.config = config;
    this.context = context;
  }

  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    this.log('ERROR', message, metadata, error);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('DEBUG', message, metadata);
  }

  child(context: Record<string, unknown>): StructuredLogger {
    return new BoilerplateLogger(this.config, { ...this.context, ...context });
  }

  private log(level: keyof LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error): void {
    // Check if log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const context = contextStorage.getStore();
    const correlationId = context?.correlationId || this.generateCorrelationId();

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      tenantId: context?.tenantId || this.context.tenantId as string,
      userId: context?.userId || this.context.userId as string,
      requestId: context?.requestId || this.context.requestId as string,
      metadata: { ...this.context, ...metadata },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined
    };

    this.output(logEntry);
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels: Record<keyof LogLevel, number> = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    const configLevel = levels[this.config.level];
    const messageLevel = levels[level];

    return messageLevel <= configLevel;
  }

  private output(logEntry: LogEntry): void {
    const formatted = this.formatLog(logEntry);

    this.config.outputs.forEach(output => {
      switch (output) {
        case 'console':
          this.outputToConsole(logEntry, formatted);
          break;
        case 'file':
          this.outputToFile(formatted);
          break;
        case 'remote':
          this.outputToRemote(logEntry);
          break;
      }
    });
  }

  private formatLog(logEntry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(logEntry);
    }

    // Text format
    const timestamp = logEntry.timestamp;
    const level = logEntry.level.padEnd(5);
    const correlationId = logEntry.correlationId.substring(0, 8);
    const tenant = logEntry.tenantId ? `[${logEntry.tenantId}]` : '';
    const message = logEntry.message;
    const metadata = logEntry.metadata && Object.keys(logEntry.metadata).length > 0 
      ? ` ${JSON.stringify(logEntry.metadata)}` 
      : '';
    const error = logEntry.error ? `\n${logEntry.error.stack || logEntry.error.message}` : '';

    return `${timestamp} ${level} [${correlationId}] ${tenant} ${message}${metadata}${error}`;
  }

  private outputToConsole(logEntry: LogEntry, formatted: string): void {
    switch (logEntry.level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'DEBUG':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  private outputToFile(formatted: string): void {
    if (!this.config.fileConfig) return;

    // In a real implementation, you would use a proper file logging library
    // like winston or pino with rotation support
    try {
      const fs = require('fs');
      const path = require('path');
      
      const logDir = path.dirname(this.config.fileConfig.path);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(this.config.fileConfig.path, formatted + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private outputToRemote(logEntry: LogEntry): void {
    if (!this.config.remoteConfig) return;

    // In a real implementation, you would send to a logging service
    // like DataDog, Splunk, or ELK stack
    fetch(this.config.remoteConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.remoteConfig.apiKey}`
      },
      body: JSON.stringify(logEntry)
    }).catch(error => {
      console.error('Failed to send log to remote service:', error);
    });
  }

  private generateCorrelationId(): string {
    return randomUUID();
  }
}

// Middleware for setting up correlation ID and request context
export function createLoggingMiddleware(logger: StructuredLogger) {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    const requestId = randomUUID();
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;

    // Set correlation ID header for response
    res.setHeader('x-correlation-id', correlationId);

    // Run the request in the context storage
    contextStorage.run({
      correlationId,
      requestId,
      tenantId,
      userId
    }, () => {
      // Log request start
      logger.info('Request started', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });

      // Track request duration
      const startTime = Date.now();

      // Override res.end to log completion
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = Date.now() - startTime;
        
        logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration
        });

        originalEnd.apply(res, args);
      };

      next();
    });
  };
}

// Utility functions for getting current context
export function getCurrentCorrelationId(): string | undefined {
  return contextStorage.getStore()?.correlationId;
}

export function getCurrentTenantId(): string | undefined {
  return contextStorage.getStore()?.tenantId;
}

export function getCurrentUserId(): string | undefined {
  return contextStorage.getStore()?.userId;
}

export function getCurrentRequestId(): string | undefined {
  return contextStorage.getStore()?.requestId;
}

// Default logger instance
let defaultLogger: StructuredLogger;

export function initializeLogger(config: MonitoringConfig['logging']): StructuredLogger {
  defaultLogger = new BoilerplateLogger(config);
  return defaultLogger;
}

export function getLogger(): StructuredLogger {
  if (!defaultLogger) {
    // Fallback configuration
    defaultLogger = new BoilerplateLogger({
      level: 'INFO',
      format: 'text',
      outputs: ['console']
    });
  }
  return defaultLogger;
}