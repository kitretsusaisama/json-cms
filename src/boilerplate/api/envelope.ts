/**
 * API Envelope Format
 * 
 * Standardized response format for all CMS API endpoints
 */

import { NextResponse } from 'next/server';
import { APIEnvelope, APIError } from '../interfaces/content-provider';
export type { APIEnvelope, APIError } from '../interfaces/content-provider';

export class APIEnvelopeBuilder<T> {
  private data: T;
  private meta: APIEnvelope<T>['meta'];
  private errors: APIError[] = [];
  private warnings: string[] = [];

  constructor(data: T) {
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  static success<T>(data: T): APIEnvelopeBuilder<T> {
    return new APIEnvelopeBuilder(data);
  }

  static error<T = null>(error: APIError): APIEnvelopeBuilder<T> {
    const builder = new APIEnvelopeBuilder(null as T);
    builder.errors.push(error);
    return builder;
  }

  static errors<T = null>(errors: APIError[]): APIEnvelopeBuilder<T> {
    const builder = new APIEnvelopeBuilder(null as T);
    builder.errors.push(...errors);
    return builder;
  }

  withMeta(meta: Partial<APIEnvelope<T>['meta']>): this {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  withCacheKey(cacheKey: string): this {
    this.meta.cacheKey = cacheKey;
    return this;
  }

  withTenant(tenantId: string): this {
    this.meta.tenant = tenantId;
    return this;
  }

  withRequestId(requestId: string): this {
    this.meta.requestId = requestId;
    return this;
  }

  withVersion(version: string): this {
    this.meta.version = version;
    return this;
  }

  addError(error: APIError): this {
    this.errors.push(error);
    return this;
  }

  addErrors(errors: APIError[]): this {
    this.errors.push(...errors);
    return this;
  }

  addWarning(warning: string): this {
    this.warnings.push(warning);
    return this;
  }

  addWarnings(warnings: string[]): this {
    this.warnings.push(...warnings);
    return this;
  }

  build(): APIEnvelope<T> {
    const envelope: APIEnvelope<T> = {
      data: this.data,
      meta: this.meta
    };

    if (this.errors.length > 0) {
      envelope.errors = this.errors;
    }

    if (this.warnings.length > 0) {
      envelope.warnings = this.warnings;
    }

    return envelope;
  }
}

export class APIErrorBuilder {
  private code: string;
  private message: string;
  private details?: unknown;
  private timestamp: string;
  private path?: string;

  constructor(code: string, message: string) {
    this.code = code;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static create(code: string, message: string): APIErrorBuilder {
    return new APIErrorBuilder(code, message);
  }

  static validation(message: string, details?: unknown): APIErrorBuilder {
    return new APIErrorBuilder('VALIDATION_ERROR', message).withDetails(details);
  }

  static notFound(resource: string, id?: string): APIErrorBuilder {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return new APIErrorBuilder('NOT_FOUND', message);
  }

  static unauthorized(message = 'Unauthorized access'): APIErrorBuilder {
    return new APIErrorBuilder('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Access forbidden'): APIErrorBuilder {
    return new APIErrorBuilder('FORBIDDEN', message);
  }

  static conflict(message: string): APIErrorBuilder {
    return new APIErrorBuilder('CONFLICT', message);
  }

  static internal(message = 'Internal server error'): APIErrorBuilder {
    return new APIErrorBuilder('INTERNAL_ERROR', message);
  }

  static badRequest(message: string): APIErrorBuilder {
    return new APIErrorBuilder('BAD_REQUEST', message);
  }

  static rateLimit(message = 'Rate limit exceeded'): APIErrorBuilder {
    return new APIErrorBuilder('RATE_LIMIT', message);
  }

  withDetails(details: unknown): this {
    this.details = details;
    return this;
  }

  withPath(path: string): this {
    this.path = path;
    return this;
  }

  build(): APIError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path
    };
  }
}

// Utility functions for common response patterns
export function successResponse<T>(data: T, meta?: Partial<APIEnvelope<T>['meta']>): APIEnvelope<T> {
  const builder = APIEnvelopeBuilder.success(data);
  
  if (meta) {
    builder.withMeta(meta);
  }
  
  return builder.build();
}

export function errorResponse(error: APIError): APIEnvelope<null> {
  return APIEnvelopeBuilder.error(error).build();
}

export function createAPIEnvelope<T>(
  data: T,
  meta?: Partial<APIEnvelope<T>['meta']>
): APIEnvelope<T> {
  return successResponse(data, meta);
}

export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<APIEnvelope<T>['meta']>,
  status = 200
): NextResponse {
  return NextResponse.json(successResponse(data, meta), { status });
}

export function createErrorResponse(
  message: string,
  status = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown
): NextResponse {
  return NextResponse.json(
    errorResponse(
      APIErrorBuilder.create(code, message)
        .withDetails(details)
        .build()
    ),
    { status }
  );
}

export function validationErrorResponse(message: string, details?: unknown): APIEnvelope<null> {
  const error = APIErrorBuilder.validation(message, details).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function notFoundResponse(resource: string, id?: string): APIEnvelope<null> {
  const error = APIErrorBuilder.notFound(resource, id).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function unauthorizedResponse(message?: string): APIEnvelope<null> {
  const error = APIErrorBuilder.unauthorized(message).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function forbiddenResponse(message?: string): APIEnvelope<null> {
  const error = APIErrorBuilder.forbidden(message).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function conflictResponse(message: string): APIEnvelope<null> {
  const error = APIErrorBuilder.conflict(message).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function internalErrorResponse(message?: string): APIEnvelope<null> {
  const error = APIErrorBuilder.internal(message).build();
  return APIEnvelopeBuilder.error(error).build();
}

export function badRequestResponse(message: string): APIEnvelope<null> {
  const error = APIErrorBuilder.badRequest(message).build();
  return APIEnvelopeBuilder.error(error).build();
}

// Response helpers with common metadata
export function paginatedResponse<T>(
  items: T[],
  total: number,
  hasMore: boolean,
  meta?: Partial<APIEnvelope<{ items: T[]; total: number; hasMore: boolean }>['meta']>
): APIEnvelope<{ items: T[]; total: number; hasMore: boolean }> {
  return successResponse({ items, total, hasMore }, meta);
}

export function createdResponse<T>(data: T, meta?: Partial<APIEnvelope<T>['meta']>): APIEnvelope<T> {
  return successResponse(data, { ...meta, status: 'created' });
}

export function updatedResponse<T>(data: T, meta?: Partial<APIEnvelope<T>['meta']>): APIEnvelope<T> {
  return successResponse(data, { ...meta, status: 'updated' });
}

export function deletedResponse(meta?: Partial<APIEnvelope<null>['meta']>): APIEnvelope<null> {
  return successResponse(null, { ...meta, status: 'deleted' });
}

// Middleware helper for extracting request metadata
export function extractRequestMeta(request: Request): Partial<APIEnvelope<unknown>['meta']> {
  const headers = request.headers;
  
  return {
    requestId: headers.get('x-request-id') || generateRequestId(),
    tenant: headers.get('x-tenant-id') || undefined,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}

// Helper to generate request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Type guards for envelope validation
export function isAPIEnvelope<T>(obj: unknown): obj is APIEnvelope<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'meta' in obj &&
    typeof (obj as any).meta === 'object' &&
    'timestamp' in (obj as any).meta &&
    'version' in (obj as any).meta
  );
}

export function isAPIError(obj: unknown): obj is APIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    'timestamp' in obj &&
    typeof (obj as any).code === 'string' &&
    typeof (obj as any).message === 'string' &&
    typeof (obj as any).timestamp === 'string'
  );
}

// Error handling utilities
export function handleProviderError(error: unknown, context?: string): APIError {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('not found') || error.message.includes('ENOENT')) {
      return APIErrorBuilder.notFound(context || 'Resource').build();
    }
    
    if (error.message.includes('permission') || error.message.includes('EACCES')) {
      return APIErrorBuilder.forbidden('Permission denied').build();
    }
    
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return APIErrorBuilder.validation(error.message).build();
    }
    
    if (error.message.includes('conflict') || error.message.includes('duplicate')) {
      return APIErrorBuilder.conflict(error.message).build();
    }
    
    // Default to internal error
    return APIErrorBuilder.internal(error.message).build();
  }
  
  return APIErrorBuilder.internal('Unknown error occurred').build();
}

export function wrapProviderCall<T>(
  providerCall: () => Promise<T>,
  context?: string
): Promise<APIEnvelope<T | null>> {
  return providerCall()
    .then(data => successResponse(data))
    .catch(error => {
      const apiError = handleProviderError(error, context);
      return errorResponse(apiError);
    });
}

// Response status helpers
export function getHTTPStatus(envelope: APIEnvelope<unknown>): number {
  if (envelope.errors && envelope.errors.length > 0) {
    const error = envelope.errors[0];
    
    switch (error.code) {
      case 'NOT_FOUND':
        return 404;
      case 'UNAUTHORIZED':
        return 401;
      case 'FORBIDDEN':
        return 403;
      case 'VALIDATION_ERROR':
      case 'BAD_REQUEST':
        return 400;
      case 'CONFLICT':
        return 409;
      case 'RATE_LIMIT':
        return 429;
      case 'INTERNAL_ERROR':
      default:
        return 500;
    }
  }
  
  // Check meta status for success responses
  const status = (envelope.meta as any)?.status;
  if (status === 'created') return 201;
  if (status === 'deleted') return 204;
  
  return 200;
}
