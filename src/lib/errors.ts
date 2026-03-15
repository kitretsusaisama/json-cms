/**
 * Error handling utilities for consistent error management across the application.
 * Includes custom error classes, error boundaries, and error reporting.
 */

import { toast } from 'react-hot-toast';
import { logger } from './logger';

/**
 * Type for error data - can be any serializable value
 */
export type ErrorData = Record<string, unknown> | string | number | boolean | null;

/**
 * Options for creating error instances
 */
export interface ErrorOptions {
  code?: string;
  status?: number;
  data?: ErrorData;
}

/**
 * Error-like object structure for parsing unknown errors
 */
interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  data?: ErrorData;
  stack?: string;
}

/**
 * API error response structure
 */
interface ApiErrorResponse {
  name?: string;
  message?: string;
  status?: number;
  data?: {
    message?: string;
    code?: string;
  };
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public code: string;
  public status: number;
  public data?: ErrorData;

  constructor(message: string, options: ErrorOptions = {}) {
    const { code = 'INTERNAL_ERROR', status = 500, data } = options;
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.data = data;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * API error for handling API-specific errors
 */
export class ApiError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, { code: 'API_ERROR', status: 500, ...options });
  }
}

/**
 * Authentication error for handling auth-specific errors
 */
export class AuthError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, { code: 'AUTH_ERROR', status: 401, ...options });
  }
}

/**
 * Validation error for handling validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, { code: 'VALIDATION_ERROR', status: 400, ...options });
  }
}

/**
 * Not found error for handling 404 cases
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', options: Omit<ErrorOptions, 'status'> = {}) {
    super(message, { code: 'NOT_FOUND', status: 404, ...options });
  }
}

/**
 * Permission error for handling authorization failures
 */
export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to perform this action', options: Omit<ErrorOptions, 'status'> = {}) {
    super(message, { code: 'FORBIDDEN', status: 403, ...options });
  }
}

/**
 * Handle errors globally with consistent logging and user feedback
 */
export function handleError(error: unknown, showToast = true): AppError {
  // Convert to AppError if it's not already
  const appError = error instanceof AppError
    ? error
    : new AppError(
        (error as ErrorLike)?.message || 'An unexpected error occurred',
        {
          code: (error as ErrorLike)?.code || 'UNKNOWN_ERROR',
          status: (error as ErrorLike)?.status || 500,
          data: (error as ErrorLike)?.data
        }
      );

  // Log the error
  logger.error({
    message: appError.message,
    code: appError.code,
    status: appError.status,
    stack: appError.stack,
    data: appError.data,
  });

  // Show toast notification if requested
  if (showToast && typeof window !== 'undefined') {
    toast.error(appError.message);
  }

  return appError;
}

/**
 * Parse API error response into an AppError
 */
export function parseApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Handle fetch/network errors
  const errorObj = error as ApiErrorResponse;
  
  if (errorObj.name === 'TypeError' && errorObj.message === 'Failed to fetch') {
    return new ApiError('Network error. Please check your connection.', { code: 'NETWORK_ERROR', status: 0 });
  }

  // Handle API response errors
  if (errorObj.status && errorObj.data) {
    return new ApiError(
      errorObj.data.message || 'API request failed',
      {
        code: errorObj.data.code || 'API_ERROR',
        status: errorObj.status,
        data: errorObj.data
      }
    );
  }

  // Default error
  return new AppError(errorObj.message || 'An unexpected error occurred');
}
