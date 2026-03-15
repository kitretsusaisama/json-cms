import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { SanitizationConfig, ValidationResult, ValidationError, AttackPattern } from './interfaces';

export class InputSanitizer {
  private config: SanitizationConfig;
  private attackPatterns: AttackPattern[];

  constructor(config?: Partial<SanitizationConfig>) {
    this.config = {
      allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'code', 'pre', 'a', 'img', 'div', 'span'
      ],
      allowedAttributes: {
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'div': ['class', 'id'],
        'span': ['class', 'id'],
        '*': ['class']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
      ...config
    };

    this.attackPatterns = [
      {
        name: 'XSS Script Injection',
        pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        severity: 'critical',
        description: 'Potential XSS attack via script tags'
      },
      {
        name: 'SQL Injection',
        pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)|('|('')|;|--|\*|\|)/gi,
        severity: 'high',
        description: 'Potential SQL injection attempt'
      },
      {
        name: 'Path Traversal',
        pattern: /\.\.[\/\\]/g,
        severity: 'high',
        description: 'Potential path traversal attack'
      },
      {
        name: 'Command Injection',
        pattern: /[;&|`$(){}[\]]/g,
        severity: 'high',
        description: 'Potential command injection characters'
      },
      {
        name: 'LDAP Injection',
        pattern: /[()=*!&|]/g,
        severity: 'medium',
        description: 'Potential LDAP injection characters'
      }
    ];
  }

  /**
   * Sanitize HTML content using DOMPurify
   */
  sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: this.config.allowedTags,
      ALLOWED_ATTR: Object.values(this.config.allowedAttributes).flat(),
      STRIP_IGNORE_TAG: this.config.stripIgnoreTag,
      STRIP_IGNORE_TAG_BODY: this.config.stripIgnoreTagBody
    });
  }

  /**
   * Sanitize plain text input
   */
  sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove null bytes and control characters
    return input
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  /**
   * Validate and sanitize object using Zod schema
   */
  validateAndSanitize<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          isValid: true,
          errors: [],
          sanitized: result.data
        };
      } else {
        return {
          isValid: false,
          errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'root',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Detect potential attack patterns in input
   */
  detectAttacks(input: string): AttackPattern[] {
    if (typeof input !== 'string') {
      return [];
    }

    return this.attackPatterns.filter(pattern => 
      pattern.pattern.test(input)
    );
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // First sanitize text (removes null bytes and control chars), then HTML
      const textSanitized = this.sanitizeText(obj);
      return this.sanitizeHtml(textSanitized);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize file path to prevent path traversal
   */
  sanitizeFilePath(path: string): string {
    if (typeof path !== 'string') {
      return '';
    }

    return path
      .replace(/\.\.[\/\\]/g, '') // Remove path traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^[\/\\]+/, '') // Remove leading slashes
      .trim();
  }

  /**
   * Sanitize URL to prevent open redirect
   */
  sanitizeUrl(url: string, allowedDomains?: string[]): string {
    if (typeof url !== 'string') {
      return '';
    }

    try {
      const parsedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return '';
      }

      // Check against allowed domains if provided
      if (allowedDomains && allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          parsedUrl.hostname === domain || 
          parsedUrl.hostname.endsWith('.' + domain)
        );
        
        if (!isAllowed) {
          return '';
        }
      }

      return parsedUrl.toString();
    } catch {
      return '';
    }
  }

  /**
   * Create content-specific sanitization schemas
   */
  static createContentSchemas() {
    return {
      pageContent: z.object({
        title: z.string().max(500).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
        description: z.string().max(2000).optional().transform(val => 
          val ? DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }) : val
        ),
        content: z.string().transform(val => DOMPurify.sanitize(val)),
        slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
        tags: z.array(z.string().max(50)).max(20).optional(),
        metadata: z.record(z.unknown()).optional()
      }),

      blockContent: z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid block ID'),
        name: z.string().max(255).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
        category: z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid category'),
        content: z.record(z.unknown()),
        tags: z.array(z.string().max(50)).max(10).optional()
      }),

      seoData: z.object({
        title: z.string().max(60).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
        description: z.string().max(160).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
        canonical: z.string().url().optional(),
        robots: z.string().max(100).optional(),
        openGraph: z.object({
          title: z.string().max(60).optional(),
          description: z.string().max(160).optional(),
          image: z.string().url().optional(),
          type: z.string().max(50).optional()
        }).optional()
      }),

      userInput: z.object({
        email: z.string().email().max(255),
        name: z.string().max(255).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
        role: z.enum(['admin', 'editor', 'viewer']),
        metadata: z.record(z.string()).optional()
      })
    };
  }
}

// Export singleton instance
export const inputSanitizer = new InputSanitizer();