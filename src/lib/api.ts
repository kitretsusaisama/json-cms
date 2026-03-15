/**
 * API client utilities for making HTTP requests with proper error handling,
 * authentication, and logging.
 */

import { toast } from 'react-hot-toast';
import { logger } from './logger';

interface FetchOptions extends RequestInit {
  baseUrl?: string;
  skipErrorToast?: boolean;
  skipAuthToken?: boolean;
}

class ApiError<T = unknown> extends Error {
  status?: number;
  data?: T;
  
  constructor(message: string, status?: number, data?: T) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Enhanced fetch function with error handling, authentication, and logging
 */
export async function fetchApi<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api',
    skipErrorToast = false,
    skipAuthToken = false,
    ...restOptions
  } = options;
  let headers: HeadersInit = options.headers || {};

  const requestStartTime = performance.now();
  const requestId = Math.random().toString(36).substring(2, 9);

  try {
    // Add authentication token if available and not skipped
    if (!skipAuthToken) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = {
          ...headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }

    // Add default headers
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...headers,
    };

    // Log request
    logger.info({
      message: 'API Request',
      url: `${baseUrl}${url}`,
      method: restOptions.method || 'GET',
      requestId,
    });

    // Make the request
    const response = await fetch(`${baseUrl}${url}`, {
      ...restOptions,
      headers: defaultHeaders,
    });

    // Calculate request duration
    const requestDuration = performance.now() - requestStartTime;

    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Log response
    logger.info({
      message: 'API Response',
      url: `${baseUrl}${url}`,
      status: response.status,
      duration: `${requestDuration.toFixed(2)}ms`,
      requestId,
    });

    // Handle error responses
    if (!response.ok) {
      const error = new ApiError(
        data?.message || data?.error || 'An unexpected error occurred',
        response.status,
        data
      );

      // Log error
      logger.error({
        message: 'API Error',
        url: `${baseUrl}${url}`,
        status: response.status,
        error: error.message,
        data,
        requestId,
      });

      // Show toast for error unless skipped
      if (!skipErrorToast) {
        toast.error(error.message);
      }

      throw error;
    }

    return data as T;
  } catch (error: unknown) {
    // Handle fetch errors (network issues, etc.)
    if (error instanceof Error) {
      const errorMessage = error.message || 'An unknown error occurred';
      logger.error({
        message: 'Network Error',
        url: `${baseUrl}${url}`,
        error: errorMessage,
        requestId,
      });

      if (!skipErrorToast) {
        toast.error(errorMessage);
      }
    }

    throw error;
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: <T = unknown>(url: string, options?: FetchOptions): Promise<T> =>
    fetchApi<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown, D = unknown>(
    url: string, 
    data?: D, 
    options?: FetchOptions
  ): Promise<T> =>
    fetchApi<T>(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown, D = unknown>(
    url: string, 
    data?: D, 
    options?: FetchOptions
  ): Promise<T> =>
    fetchApi<T>(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown, D = unknown>(
    url: string, 
    data?: D, 
    options?: FetchOptions
  ): Promise<T> =>
    fetchApi<T>(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: FetchOptions): Promise<T> =>
    fetchApi<T>(url, { ...options, method: 'DELETE' }),
};