/**
 * Schema Validator
 * 
 * Provides comprehensive validation with detailed error reporting
 */

import { z } from 'zod';
import { 
  SchemaValidator as ISchemaValidator,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning
} from './interfaces';

export class SchemaValidator implements ISchemaValidator {
  /**
   * Validate data with detailed error reporting
   */
  validate(schema: z.ZodSchema, data: unknown): SchemaValidationResult {
    const startTime = performance.now();
    
    try {
      const result = schema.safeParse(data);
      const endTime = performance.now();
      
      if (result.success) {
        return {
          valid: true,
          data: result.data,
          errors: [],
          warnings: this.generateWarnings(schema, result.data),
          performance: {
            validationTime: endTime - startTime,
            schemaSize: this.calculateSchemaSize(schema)
          }
        };
      } else {
        return {
          valid: false,
          errors: this.formatZodErrors(result.error),
          warnings: [],
          performance: {
            validationTime: endTime - startTime,
            schemaSize: this.calculateSchemaSize(schema)
          }
        };
      }
    } catch (error) {
      const endTime = performance.now();
      
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          details: error
        }],
        warnings: [],
        performance: {
          validationTime: endTime - startTime,
          schemaSize: this.calculateSchemaSize(schema)
        }
      };
    }
  }

  /**
   * Validate and transform data
   */
  validateAndTransform(schema: z.ZodSchema, data: unknown): SchemaValidationResult {
    const result = this.validate(schema, data);
    
    if (result.valid && result.data) {
      // Apply transformations
      result.data = this.applyTransformations(schema, result.data);
    }
    
    return result;
  }

  /**
   * Batch validate multiple items
   */
  validateBatch(schema: z.ZodSchema, items: unknown[]): SchemaValidationResult[] {
    return items.map(item => this.validate(schema, item));
  }

  /**
   * Validate with custom error formatting
   */
  validateWithFormatter(
    schema: z.ZodSchema,
    data: unknown,
    formatter: (error: z.ZodError) => SchemaValidationError[]
  ): SchemaValidationResult {
    const startTime = performance.now();
    
    try {
      const result = schema.safeParse(data);
      const endTime = performance.now();
      
      if (result.success) {
        return {
          valid: true,
          data: result.data,
          errors: [],
          warnings: this.generateWarnings(schema, result.data),
          performance: {
            validationTime: endTime - startTime,
            schemaSize: this.calculateSchemaSize(schema)
          }
        };
      } else {
        return {
          valid: false,
          errors: formatter(result.error),
          warnings: [],
          performance: {
            validationTime: endTime - startTime,
            schemaSize: this.calculateSchemaSize(schema)
          }
        };
      }
    } catch (error) {
      const endTime = performance.now();
      
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          details: error
        }],
        warnings: [],
        performance: {
          validationTime: endTime - startTime,
          schemaSize: this.calculateSchemaSize(schema)
        }
      };
    }
  }

  /**
   * Format Zod errors into our error format
   */
  private formatZodErrors(zodError: z.ZodError): SchemaValidationError[] {
    return zodError.errors.map(error => {
      const path = error.path.join('.');
      
      return {
        path: path || 'root',
        message: error.message,
        code: error.code,
        expected: this.getExpectedType(error),
        received: this.getReceivedType(error),
        details: {
          zodError: error,
          path: error.path,
          code: error.code
        }
      };
    });
  }

  /**
   * Generate warnings for valid data
   */
  private generateWarnings(schema: z.ZodSchema, data: unknown): SchemaValidationWarning[] {
    const warnings: SchemaValidationWarning[] = [];
    
    // Check for deprecated fields
    warnings.push(...this.checkDeprecatedFields(schema, data));
    
    // Check for performance issues
    warnings.push(...this.checkPerformanceIssues(data));
    
    // Check for security concerns
    warnings.push(...this.checkSecurityConcerns(data));
    
    return warnings;
  }

  /**
   * Check for deprecated fields
   */
  private checkDeprecatedFields(schema: z.ZodSchema, data: unknown): SchemaValidationWarning[] {
    const warnings: SchemaValidationWarning[] = [];
    
    // This would require schema metadata to track deprecated fields
    // For now, return empty array
    
    return warnings;
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(data: unknown): SchemaValidationWarning[] {
    const warnings: SchemaValidationWarning[] = [];
    
    if (typeof data === 'object' && data !== null) {
      const dataStr = JSON.stringify(data);
      
      // Large object warning
      if (dataStr.length > 100000) { // 100KB
        warnings.push({
          path: 'root',
          message: 'Large object detected - may impact performance',
          suggestion: 'Consider breaking down into smaller objects or using pagination',
          severity: 'medium'
        });
      }
      
      // Deep nesting warning
      const depth = this.calculateObjectDepth(data);
      if (depth > 10) {
        warnings.push({
          path: 'root',
          message: `Deep object nesting detected (depth: ${depth})`,
          suggestion: 'Consider flattening the object structure',
          severity: 'low'
        });
      }
    }
    
    return warnings;
  }

  /**
   * Check for security concerns
   */
  private checkSecurityConcerns(data: unknown): SchemaValidationWarning[] {
    const warnings: SchemaValidationWarning[] = [];
    
    if (typeof data === 'object' && data !== null) {
      this.checkObjectForSecurity(data, '', warnings);
    }
    
    return warnings;
  }

  /**
   * Recursively check object for security issues
   */
  private checkObjectForSecurity(
    obj: unknown, 
    path: string, 
    warnings: SchemaValidationWarning[]
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check for potential XSS in string values
      if (typeof value === 'string') {
        if (this.containsPotentialXSS(value)) {
          warnings.push({
            path: currentPath,
            message: 'Potential XSS content detected',
            suggestion: 'Ensure proper sanitization before rendering',
            severity: 'high'
          });
        }
      }
      
      // Check for sensitive field names
      if (this.isSensitiveFieldName(key)) {
        warnings.push({
          path: currentPath,
          message: 'Sensitive field name detected',
          suggestion: 'Consider encrypting or hashing sensitive data',
          severity: 'medium'
        });
      }
      
      // Recurse into nested objects
      if (typeof value === 'object' && value !== null) {
        this.checkObjectForSecurity(value, currentPath, warnings);
      }
    }
  }

  /**
   * Apply transformations to validated data
   */
  private applyTransformations(schema: z.ZodSchema, data: unknown): unknown {
    // Apply common transformations like trimming strings, normalizing dates, etc.
    return this.transformValue(data);
  }

  /**
   * Transform a value based on its type
   */
  private transformValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.transformValue(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const transformed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        transformed[key] = this.transformValue(val);
      }
      return transformed;
    }
    
    return value;
  }

  /**
   * Calculate schema size for performance metrics
   */
  private calculateSchemaSize(schema: z.ZodSchema): number {
    // Rough estimation of schema complexity
    const schemaStr = JSON.stringify(schema._def);
    return schemaStr.length;
  }

  /**
   * Calculate object depth
   */
  private calculateObjectDepth(obj: unknown, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const depth = this.calculateObjectDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    return maxDepth;
  }

  /**
   * Get expected type from Zod error
   */
  private getExpectedType(error: z.ZodIssue): string | undefined {
    switch (error.code) {
      case 'invalid_type':
        return error.expected;
      case 'invalid_string':
        return 'string';
      case 'invalid_number':
        return 'number';
      case 'invalid_boolean':
        return 'boolean';
      case 'invalid_date':
        return 'date';
      default:
        return undefined;
    }
  }

  /**
   * Get received type from Zod error
   */
  private getReceivedType(error: z.ZodIssue): string | undefined {
    if ('received' in error) {
      return error.received;
    }
    return undefined;
  }

  /**
   * Check if string contains potential XSS
   */
  private containsPotentialXSS(value: string): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    return xssPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveFieldName(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'key',
      'credential',
      'auth',
      'ssn',
      'social',
      'credit',
      'card'
    ];
    
    const lowerFieldName = fieldName.toLowerCase();
    return sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive));
  }
}