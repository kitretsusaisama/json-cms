/**
 * Schema Validation and Type Generation Interfaces
 */

import { z } from 'zod';
import { JSONSchema7 } from 'json-schema';

export interface SchemaDefinition {
  id: string;
  version: string;
  title: string;
  description?: string;
  zodSchema: z.ZodSchema;
  jsonSchema: JSONSchema7;
  typeDefinition: string;
  examples?: unknown[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  data?: unknown;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  performance: {
    validationTime: number;
    schemaSize: number;
  };
}

export interface SchemaValidationError {
  path: string;
  message: string;
  code: string;
  expected?: string;
  received?: string;
  details?: unknown;
}

export interface SchemaValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TypeGenerationOptions {
  outputFormat: 'typescript' | 'json-schema' | 'both';
  includeComments: boolean;
  includeExamples: boolean;
  exportType: 'named' | 'default' | 'namespace';
  strictMode: boolean;
  generateValidators: boolean;
}

export interface SchemaVersionInfo {
  version: string;
  previousVersion?: string;
  changes: SchemaChange[];
  compatibility: 'breaking' | 'compatible' | 'unknown';
  migrationRequired: boolean;
}

export interface SchemaChange {
  type: 'added' | 'removed' | 'modified' | 'deprecated';
  path: string;
  description: string;
  impact: 'breaking' | 'compatible';
  migration?: SchemaMigration;
}

export interface SchemaMigration {
  from: string;
  to: string;
  transform: (data: unknown) => unknown;
  validate?: (data: unknown) => boolean;
}

export interface SchemaRegistry {
  /**
   * Register a schema definition
   */
  register(definition: SchemaDefinition): Promise<void>;

  /**
   * Get a schema by ID and version
   */
  get(id: string, version?: string): Promise<SchemaDefinition | null>;

  /**
   * List all schemas
   */
  list(): Promise<SchemaDefinition[]>;

  /**
   * Validate data against a schema
   */
  validate(schemaId: string, data: unknown, version?: string): Promise<SchemaValidationResult>;

  /**
   * Generate TypeScript types from schema
   */
  generateTypes(schemaId: string, options?: TypeGenerationOptions): Promise<string>;

  /**
   * Generate JSON Schema from Zod schema
   */
  generateJsonSchema(zodSchema: z.ZodSchema): JSONSchema7;

  /**
   * Create schema version
   */
  createVersion(schemaId: string, newSchema: z.ZodSchema, changes?: SchemaChange[]): Promise<SchemaVersionInfo>;

  /**
   * Get schema version history
   */
  getVersionHistory(schemaId: string): Promise<SchemaVersionInfo[]>;

  /**
   * Migrate data between schema versions
   */
  migrateData(schemaId: string, data: unknown, fromVersion: string, toVersion: string): Promise<unknown>;
}

export interface SchemaGenerator {
  /**
   * Generate schema from TypeScript interface
   */
  fromTypeScript(interfaceCode: string): Promise<SchemaDefinition>;

  /**
   * Generate schema from JSON examples
   */
  fromExamples(examples: unknown[]): Promise<SchemaDefinition>;

  /**
   * Generate schema from existing data
   */
  fromData(data: unknown[]): Promise<SchemaDefinition>;

  /**
   * Merge multiple schemas
   */
  merge(schemas: SchemaDefinition[]): Promise<SchemaDefinition>;
}

export interface SchemaValidator {
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
  validateWithFormatter(
    schema: z.ZodSchema, 
    data: unknown, 
    formatter: (error: z.ZodError) => SchemaValidationError[]
  ): SchemaValidationResult;
}

export interface TypeGenerator {
  /**
   * Generate TypeScript interface from Zod schema
   */
  generateInterface(schema: z.ZodSchema, name: string, options?: TypeGenerationOptions): string;

  /**
   * Generate TypeScript type alias from Zod schema
   */
  generateTypeAlias(schema: z.ZodSchema, name: string, options?: TypeGenerationOptions): string;

  /**
   * Generate validation function from Zod schema
   */
  generateValidator(schema: z.ZodSchema, name: string): string;

  /**
   * Generate complete module with types and validators
   */
  generateModule(schemas: Record<string, z.ZodSchema>, options?: TypeGenerationOptions): string;
}

export interface SchemaAnalyzer {
  /**
   * Analyze schema complexity
   */
  analyzeComplexity(schema: z.ZodSchema): SchemaComplexityReport;

  /**
   * Compare two schemas for compatibility
   */
  compareSchemas(oldSchema: z.ZodSchema, newSchema: z.ZodSchema): SchemaCompatibilityReport;

  /**
   * Suggest optimizations for schema
   */
  suggestOptimizations(schema: z.ZodSchema): SchemaOptimization[];

  /**
   * Extract dependencies between schemas
   */
  extractDependencies(schemas: Record<string, z.ZodSchema>): SchemaDependencyGraph;
}

export interface SchemaComplexityReport {
  score: number;
  depth: number;
  fieldCount: number;
  optionalFields: number;
  requiredFields: number;
  nestedObjects: number;
  arrays: number;
  unions: number;
  recommendations: string[];
}

export interface SchemaCompatibilityReport {
  compatible: boolean;
  breakingChanges: SchemaChange[];
  compatibleChanges: SchemaChange[];
  migrationRequired: boolean;
  migrationComplexity: 'simple' | 'moderate' | 'complex';
}

export interface SchemaOptimization {
  type: 'performance' | 'maintainability' | 'validation';
  description: string;
  impact: 'low' | 'medium' | 'high';
  implementation: string;
}

export interface SchemaDependencyGraph {
  nodes: SchemaDependencyNode[];
  edges: SchemaDependencyEdge[];
  cycles: string[][];
}

export interface SchemaDependencyNode {
  id: string;
  type: 'schema' | 'field' | 'reference';
  metadata: Record<string, unknown>;
}

export interface SchemaDependencyEdge {
  from: string;
  to: string;
  type: 'extends' | 'references' | 'contains';
  metadata: Record<string, unknown>;
}