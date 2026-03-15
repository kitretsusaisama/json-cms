/**
 * API middleware for authentication, error handling, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getUserFromRequest } from '@workspace/lib/auth';
import { AppError, ValidationError } from '@workspace/lib/errors';
import { logger } from '@workspace/lib/logger';

import type { UserSession } from '@workspace/lib/auth';

interface ApiContext {
  user?: UserSession;
  [key: string]: unknown;
}

type ApiHandler = (req: NextRequest, context: ApiContext) => Promise<NextResponse>;

interface WithAuthOptions {
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
}

/**
 * Middleware for handling API errors
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = performance.now();

    try {
      // Log request
      logger.info({
        message: 'API Request',
        method: req.method,
        path: req.nextUrl.pathname,
        requestId,
      });

      // Execute handler
      const response = await handler(req, context);

      // Log response
      const duration = performance.now() - startTime;
      logger.info({
        message: 'API Response',
        method: req.method,
        path: req.nextUrl.pathname,
        status: response.status,
        duration: `${duration.toFixed(2)}ms`,
        requestId,
      });

      return response;
    } catch (error: unknown) {
      interface ErrorWithCode extends Error {
        code?: string;
        status?: number;
      }
      // Convert to AppError if it's not already
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      const code = (error as ErrorWithCode)?.code || 'INTERNAL_SERVER_ERROR';
      const status = (error as ErrorWithCode)?.status || 500;
      const appError = new AppError(message, { code, status });

      // Log error
      logger.error({
        message: 'API Error',
        method: req.method,
        path: req.nextUrl.pathname,
        status: appError.status,
        error: appError.message,
        stack: appError.stack,
        code: appError.code,
        requestId,
      });

      // Return error response
      return NextResponse.json(
        {
          error: appError.message,
          code: appError.code,
          ...(process.env.NODE_ENV !== 'production' && { stack: appError.stack }),
        },
        { status: appError.status }
      );
    }
  };
}

/**
 * Middleware for validating request body against a Zod schema
 */
export function withValidation<T>(schema: ZodSchema<T>) {
  return (handler: ApiHandler): ApiHandler => {
    return async (req, context) => {
      try {
        // Clone the request to read the body
        const clone = req.clone();
        const body = await clone.json();

        // Validate body against schema
        const result = schema.safeParse(body);

        if (!result.success) {
          throw new ValidationError('Validation error', {
            code: 'VALIDATION_ERROR',
            status: 400,
            data: result.error.format()
          });
        }

        // Continue to handler
        return handler(req, context);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new ValidationError('Invalid JSON in request body');
        }
        throw error;
      }
    };
  };
}

/**
 * Middleware for authenticating requests
 */
export function withAuth(handler: ApiHandler, options: WithAuthOptions = {}): ApiHandler {
  return async (req, context) => {
    const { requiredPermissions = [], requireAllPermissions = true } = options;

    // Get user from request
    const user = await getUserFromRequest(req);

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check permissions if required
    if (requiredPermissions.length > 0 && user.role !== 'admin') {
      const hasPermission = requireAllPermissions
        ? requiredPermissions.every((permission) => user.permissions.includes(permission))
        : requiredPermissions.some((permission) => user.permissions.includes(permission));

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }

    // Add user to context
    context.user = user;

    // Continue to handler
    return handler(req, context);
  };
}

/**
 * Combine multiple middleware functions
 */
export function composeMiddleware(...middlewares: ((handler: ApiHandler) => ApiHandler)[]) {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}