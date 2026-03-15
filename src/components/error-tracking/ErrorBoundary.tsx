'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture the error with our custom error tracking dynamically to avoid circular dependencies
    import('@/lib/error-tracking').then(({ errorTracking }) => {
      errorTracking.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    }).catch(err => {
      console.error('Failed to load error tracking:', err);
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="p-6 rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-50 to-white shadow-sm dark:from-red-900/20 dark:to-black dark:border-red-800/40">
          {/* Header */}
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
              Something went wrong
            </h2>
          </div>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-red-600 dark:text-red-400">
            {error.message || "An unexpected error occurred"}
          </p>

          {/* Button */}
          <button
            onClick={this.resetError}
            className="mt-5 rounded-lg border border-red-300 bg-red-100/60 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-200 dark:border-red-700 dark:bg-red-800/30 dark:text-red-300 dark:hover:bg-red-700/50"
          >
            Try again
          </button>
        </div>

      );
    }

    return children;
  }
}