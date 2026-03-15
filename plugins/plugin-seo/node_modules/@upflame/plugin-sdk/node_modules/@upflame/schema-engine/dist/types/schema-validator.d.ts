/**
 * Schema Validator
 *
 * Provides comprehensive validation with detailed error reporting
 */
import { z } from 'zod';
import { SchemaValidator as ISchemaValidator, SchemaValidationResult, SchemaValidationError } from './interfaces';
export declare class SchemaValidator implements ISchemaValidator {
    /**
     * Validate data with detailed error reporting
     */
    validate(schema: z.ZodSchema, data: unknown): SchemaValidationResult;
    /**
     * Validate and transform data
     */
    validateAndTransform(schema: z.ZodSchema, data: unknown): SchemaValidationResult;
    /**
     * Batch validate multiple items
     */
    validateBatch(schema: z.ZodSchema, items: unknown[]): SchemaValidationResult[];
    /**
     * Validate with custom error formatting
     */
    validateWithFormatter(schema: z.ZodSchema, data: unknown, formatter: (error: z.ZodError) => SchemaValidationError[]): SchemaValidationResult;
    /**
     * Format Zod errors into our error format
     */
    private formatZodErrors;
    /**
     * Generate warnings for valid data
     */
    private generateWarnings;
    /**
     * Check for deprecated fields
     */
    private checkDeprecatedFields;
    /**
     * Check for performance issues
     */
    private checkPerformanceIssues;
    /**
     * Check for security concerns
     */
    private checkSecurityConcerns;
    /**
     * Recursively check object for security issues
     */
    private checkObjectForSecurity;
    /**
     * Apply transformations to validated data
     */
    private applyTransformations;
    /**
     * Transform a value based on its type
     */
    private transformValue;
    /**
     * Calculate schema size for performance metrics
     */
    private calculateSchemaSize;
    /**
     * Calculate object depth
     */
    private calculateObjectDepth;
    /**
     * Get expected type from Zod error
     */
    private getExpectedType;
    /**
     * Get received type from Zod error
     */
    private getReceivedType;
    /**
     * Check if string contains potential XSS
     */
    private containsPotentialXSS;
    /**
     * Check if field name is sensitive
     */
    private isSensitiveFieldName;
}
//# sourceMappingURL=schema-validator.d.ts.map