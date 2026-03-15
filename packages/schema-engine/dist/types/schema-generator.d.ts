/**
 * Schema Generator
 *
 * Generates Zod schemas and JSON schemas from various sources
 */
import { SchemaDefinition, SchemaGenerator as ISchemaGenerator } from './interfaces';
export declare class SchemaGenerator implements ISchemaGenerator {
    /**
     * Generate schema from TypeScript interface string
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
     * Merge multiple schemas into one
     */
    merge(schemas: SchemaDefinition[]): Promise<SchemaDefinition>;
    /**
     * Parse TypeScript interface string
     */
    private parseTypeScriptInterface;
    /**
     * Parse interface fields
     */
    private parseInterfaceFields;
    /**
     * Convert parsed interface to Zod schema
     */
    private convertToZodSchema;
    /**
     * Convert TypeScript type string to Zod schema
     */
    private typeStringToZodSchema;
    /**
     * Infer schema from examples
     */
    private inferSchemaFromExamples;
    /**
     * Infer schema from a single value
     */
    private inferSchemaFromValue;
    /**
     * Merge two Zod schemas
     */
    private mergeZodSchemas;
    /**
     * Deduplicate schemas by comparing their structure
     */
    private deduplicateSchemas;
    /**
     * Check if two schemas are structurally equal
     */
    private schemasAreEqual;
    /**
     * Create a complete schema definition
     */
    private createSchemaDefinition;
    /**
     * Generate TypeScript type definition
     */
    private generateTypeDefinition;
    private isEmail;
    private isUrl;
    private isUuid;
    private isIsoDate;
}
//# sourceMappingURL=schema-generator.d.ts.map