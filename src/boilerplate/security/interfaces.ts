import { NextRequest, NextResponse } from 'next/server';

export interface SecurityConfig {
  rateLimit: RateLimitConfig;
  cors: CORSConfig;
  csp: CSPConfig;
  audit: AuditConfig;
  sanitization: SanitizationConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest) => void;
}

export interface CORSConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

export interface CSPConfig {
  directives: Record<string, string[]>;
  reportOnly?: boolean;
  reportUri?: string;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields: string[];
}

export interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: string[];
}

export interface AuditLogEntry {
  correlationId: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  userAgent?: string;
  ip: string;
  requestBody?: unknown;
  responseStatus: number;
  responseTime: number;
  metadata?: Record<string, unknown>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface SecurityMiddlewareOptions {
  rateLimit?: RateLimitConfig;
  cors?: CORSConfig;
  csp?: CSPConfig;
  audit?: AuditConfig;
  enableXSSProtection?: boolean;
  enableFrameGuard?: boolean;
  enableContentTypeNoSniff?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AttackPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}