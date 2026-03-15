// ------------------------------------
// Types & Interfaces
// ------------------------------------

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
export type ErrorSource = 'client' | 'server' | 'api' | 'database' | 'external';

export interface ErrorContext {
  source?: ErrorSource;
  url?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export interface ErrorMetadata {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  component?: string;
  action?: string;
  source?: ErrorSource;
  version?: string;
  environment?: string;
  tags?: Record<string, string>;
  [key: string]: unknown;
}

export interface ErrorReporterOptions {
  dsn: string;
  environment?: string;
  release?: string;
  debug?: boolean;
  tracesSampleRate?: number;
  sessionId?: string;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export interface WindowErrorHandlerOptions {
  message: string | Event;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}