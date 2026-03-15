/**
 * Schema Registry
 *
 * Central registry for managing schemas with versioning and validation
 */
import { z } from 'zod';
import { JSONSchema7 } from 'json-schema';
import { SchemaRegistry as ISchemaRegistry, SchemaDefinition, SchemaValidationResult, SchemaVersionInfo, SchemaChange, TypeGenerationOptions } from './interfaces';
export declare class SchemaRegistry implements ISchemaRegistry {
    private schemas;
    private validator;
    private typeGenerator;
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
    /**
     * Analyze changes between two schemas
     */
    private analyzeSchemaChanges;
    /**
     * Determine compatibility from changes
     */
    private determineCompatibility;
    /**
     * Increment version based on compatibility
     */
    private incrementVersion;
    /**
     * Compare version strings
     */
    private compareVersions;
    /**
     * Get version path between two versions
     */
    private getVersionPath;
    /**
     * Apply migration between two adjacent versions
     */
    private applyVersionMigration;
}
//# sourceMappingURL=schema-registry.d.ts.map