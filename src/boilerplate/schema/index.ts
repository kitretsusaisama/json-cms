/**
 * Schema Validation and Type Generation System
 * 
 * Provides comprehensive schema management, validation, and type generation
 */

export * from './interfaces';
export { SchemaGenerator } from './schema-generator';
export { SchemaValidator } from './schema-validator';
export { TypeGenerator } from './type-generator';
export { SchemaRegistry } from './schema-registry';
export { SchemaAnalyzer } from './schema-analyzer';

// Re-export commonly used types
export type {
  SchemaDefinition,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning,
  TypeGenerationOptions,
  SchemaVersionInfo,
  SchemaChange,
  SchemaRegistry as ISchemaRegistry,
  SchemaGenerator as ISchemaGenerator,
  SchemaValidator as ISchemaValidator,
  TypeGenerator as ITypeGenerator,
  SchemaAnalyzer as ISchemaAnalyzer
} from './interfaces';

// Create default instances
export const schemaGenerator = new SchemaGenerator();
export const schemaValidator = new SchemaValidator();
export const typeGenerator = new TypeGenerator();
export const schemaRegistry = new SchemaRegistry();
export const schemaAnalyzer = new SchemaAnalyzer();

/**
 * Utility functions for common operations
 */
export const SchemaUtils = {
  /**
   * Quick validation of data against a Zod schema
   */
  validate: (schema: any, data: unknown) => schemaValidator.validate(schema, data),
  
  /**
   * Generate TypeScript interface from schema
   */
  generateInterface: (schema: any, name: string, options?: any) => 
    typeGenerator.generateInterface(schema, name, options),
  
  /**
   * Generate JSON Schema from Zod schema
   */
  generateJsonSchema: (schema: any) => schemaRegistry.generateJsonSchema(schema),
  
  /**
   * Analyze schema complexity
   */
  analyzeComplexity: (schema: any) => schemaAnalyzer.analyzeComplexity(schema),
  
  /**
   * Compare two schemas for compatibility
   */
  compareSchemas: (oldSchema: any, newSchema: any) => 
    schemaAnalyzer.compareSchemas(oldSchema, newSchema)
};