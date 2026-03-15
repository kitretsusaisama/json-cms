/**
 * Logger utility for consistent logging across the application.
 *
 * FIXED (BUG-LOG-001):
 *  - Removed circular dependency: logger.ts no longer imports error-tracking.ts.
 *    error-tracking.ts statically imports logger.ts, so a reverse import caused
 *    Webpack "Cannot read properties of undefined (reading 'call')" at module init.
 *  - error() no longer re-routes to ErrorTracking internally. Callers that need
 *    both logging AND error capture must call both independently.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogParams {
  message: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isServer = typeof window === 'undefined';

  debug({ message, ...meta }: LogParams): void {
    this.log('debug', { message, ...meta });
  }

  info({ message, ...meta }: LogParams): void {
    this.log('info', { message, ...meta });
  }

  warn({ message, ...meta }: LogParams): void {
    this.log('warn', { message, ...meta });
  }

  error({ message, ...meta }: LogParams): void {
    this.log('error', { message, ...meta });
    // NOTE: intentionally NOT dynamically importing error-tracking here.
    // The circular dependency (error-tracking → logger → error-tracking) was the
    // root cause of the Webpack runtime "Cannot read properties of undefined
    // (reading 'call')" error. Components that need to report to ErrorTracking
    // should call errorTracking.captureException() directly.
  }

  private log(level: LogLevel, { message, ...meta }: LogParams): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...meta,
      environment: process.env.NODE_ENV,
      isServer: this.isServer,
    };

    if (this.isDevelopment) {
      const colors: Record<string, string> = {
        debug: '\x1b[34m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        reset: '\x1b[0m',
      };
      const prefix = `${colors[level]}[${level.toUpperCase()}]${colors.reset}`;
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](
        `${prefix} ${message}`,
        Object.keys(meta).length ? meta : ''
      );
      return;
    }

    // Production: structured JSON logging
    if (this.isServer) {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](JSON.stringify(logData));
    } else {
      if (level === 'error' || level === 'warn') {
        // eslint-disable-next-line no-console
        console[level](message, meta);
      }
    }
  }
}

export const logger = new Logger();