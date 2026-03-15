'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { errorTracking, ErrorContext } from '@/lib/error-tracking';

type BreadcrumbData = Record<string, unknown>;
type ExtraData = Record<string, unknown>;

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
  options?: {
    dsn?: string;
    environment?: string;
    release?: string;
    debug?: boolean;
    sampleRate?: number;
  };
}

interface ErrorTrackingContextValue {
  captureException: (error: Error, context?: ErrorContext) => string;
  captureMessage: (message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext) => string;
  addBreadcrumb: (message: string, category?: string, data?: BreadcrumbData) => void;
  setUser: (user: ErrorContext['user'] | null) => void;
  setTags: (tags: Record<string, string>) => void;
  setExtras: (extras: ExtraData) => void;
  clearContext: () => void;
  startTransaction: (name: string, data?: Record<string, unknown>) => { 
    finish: (status?: string) => void 
  };
}

const ErrorTrackingContext = createContext<ErrorTrackingContextValue | null>(null);

export function ErrorTrackingProvider({ 
  children, 
  options = {} 
}: ErrorTrackingProviderProps): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize error tracking on client side only
    if (!isInitialized && typeof window !== 'undefined') {
      const dsn = options.dsn || process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN || '';
      
      errorTracking.init({
        dsn,
        environment: options.environment || process.env.NODE_ENV,
        release: options.release || process.env.NEXT_PUBLIC_APP_VERSION,
        debug: options.debug !== undefined ? options.debug : process.env.NODE_ENV !== 'production',
        sampleRate: options.sampleRate || 1.0,
      });
      
      setIsInitialized(true);
    }
  }, [isInitialized, options]);

  // Create a value object with all the error tracking methods wrapping the underlying calls
  // This avoids binding to potentially undefined methods if the module load order changes
  const value: ErrorTrackingContextValue = {
    captureException: (error: Error, context?: ErrorContext) => errorTracking.captureException(error, context),
    captureMessage: (message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext) => errorTracking.captureMessage(message, level, context),
    addBreadcrumb: (message: string, category?: string, data?: BreadcrumbData) => errorTracking.addBreadcrumb(message, category, data),
    setUser: (user: ErrorContext['user'] | null) => errorTracking.setUser(user),
    setTags: (tags: Record<string, string>) => errorTracking.setTags(tags),
    setExtras: (extras: ExtraData) => errorTracking.setExtras(extras),
    clearContext: () => errorTracking.clearContext(),
    startTransaction: (name: string, data?: Record<string, unknown>) => errorTracking.startTransaction(name, data),
  };

  return (
    <ErrorTrackingContext.Provider value={value}>
      {children}
    </ErrorTrackingContext.Provider>
  );
}

// Custom hook to use the error tracking context
export function useErrorTracking(): ErrorTrackingContextValue {
  const context = useContext(ErrorTrackingContext);
  
  if (!context) {
    throw new Error('useErrorTracking must be used within an ErrorTrackingProvider');
  }
  
  return context;
}