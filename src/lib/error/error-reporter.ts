import * as Sentry from '@sentry/nextjs';
import type { Breadcrumb, Scope, User } from '@sentry/nextjs';
import { setupGlobalHandlers } from './global-handlers';
import {
  ErrorReporterOptions,
  ErrorMetadata,
  ErrorContext,
  ErrorSeverity,
} from './error-types';

// ------------------------------------
// ErrorReporter Singleton
// ------------------------------------

export class ErrorReporter {
  private static instance: ErrorReporter;
  private isInitialized = false;
  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  public initialize(options: ErrorReporterOptions): void {
    if (this.isInitialized) {return;}
    if (!options.dsn) {throw new Error('Sentry DSN is required.');}

    Sentry.init({
      dsn: options.dsn,
      environment: options.environment || process.env.NODE_ENV || 'development',
      release: options.release || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      debug: options.debug || false,
      tracesSampleRate: options.tracesSampleRate ?? 0.1,
      maxBreadcrumbs: 50,
      beforeSend: (event) => {
        if (options.sessionId) {
          event.tags = event.tags || {};
          (event.tags as Record<string, string>).sessionId = options.sessionId;
        }
        return event;
      },
    });

    setupGlobalHandlers();
    this.isInitialized = true;
  }

  // ---------------- Metadata ----------------
  public updateMetadata(metadata: ErrorMetadata): void {
    Sentry.withScope((scope: Scope) => {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {scope.setTag(key, String(value));}
      });
    });
  }

  // ---------------- Capture ----------------
  public captureException(error: unknown, context: ErrorContext = {}): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const filteredContext = Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== undefined)
    );

    Sentry.withScope((scope: Scope) => {
      if (context.source) {scope.setTag('source', String(context.source));}
      if (context.url) {scope.setTag('url', String(context.url));}
      if (context.component) {scope.setTag('component', String(context.component));}
      if (context.action) {scope.setTag('action', String(context.action));}
      if (Object.keys(filteredContext).length > 0) {scope.setExtras(filteredContext);}
      Sentry.captureException(errorObj);
    });
  }

  public captureMessage(message: string): void;
  public captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void;
  public captureMessage(
    message: string,
    severityOrContext?: ErrorSeverity | ErrorContext,
    contextParam?: ErrorContext
  ): void {
    let severity: ErrorSeverity = 'info';
    let context: ErrorContext = {};

    if (typeof severityOrContext === 'string') {
      severity = severityOrContext;
      context = contextParam ?? {};
    } else if (severityOrContext) {
      context = severityOrContext as ErrorContext;
    }

    const filteredContext = Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== undefined)
    );

    Sentry.withScope((scope: Scope) => {
      scope.setLevel(severity);
      if (context.source) {scope.setTag('source', String(context.source));}
      if (context.url) {scope.setTag('url', String(context.url));}
      if (context.component) {scope.setTag('component', String(context.component));}
      if (context.action) {scope.setTag('action', String(context.action));}
      if (Object.keys(filteredContext).length > 0) {scope.setExtras(filteredContext);}
      Sentry.captureMessage(message);
    });
  }

  // ---------------- Breadcrumbs / User ----------------
  public addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!breadcrumb) {return;}
    const valid: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || Date.now() / 1000,
      level: breadcrumb.level || 'info',
      category: breadcrumb.category || 'default',
    };
    Sentry.addBreadcrumb(valid);
  }

  public setUser(user: User | null): void {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    const valid: User = {
      id: user.id || 'anonymous',
      email: user.email,
      username: user.username,
      ip_address: user.ip_address,
      ...user,
    };
    Sentry.setUser(valid);
  }
}

// Singleton Instance
export const errorReporter = ErrorReporter.getInstance();
