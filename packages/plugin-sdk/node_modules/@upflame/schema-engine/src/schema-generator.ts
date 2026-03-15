/**
 * Schema Generator
 * 
 * Generates Zod schemas and JSON schemas from various sources
 */

import { z } from 'zod';
import { JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { 
  SchemaDefinition, 
  SchemaGenerator as ISchemaGenerator,
  TypeGenerationOptions 
} from './interfaces';

export class SchemaGenerator implements ISchemaGenerator {
  /**
   * Generate schema from TypeScript interface string
   */
  async fromTypeScript(interfaceCode: string): Promise<SchemaDefinition> {
    // Parse TypeScript interface and convert to Zod schema
    const parsed = this.parseTypeScriptInterface(interfaceCode);
    const zodSchema = this.convertToZodSchema(parsed);
    
    return this.createSchemaDefinition(
      parsed.name,
      zodSchema,
      `Generated from TypeScript interface: ${parsed.name}`
    );
  }

  /**
   * Generate schema from JSON examples
   */
  async fromExamples(examples: unknown[]): Promise<SchemaDefinition> {
    if (examples.length === 0) {
      throw new Error('At least one example is required');
    }

    const inferredSchema = this.inferSchemaFromExamples(examples);
    
    return this.createSchemaDefinition(
      'InferredSchema',
      inferredSchema,
      `Generated from ${examples.length} examples`,
      examples
    );
  }

  /**
   * Generate schema from existing data
   */
  async fromData(data: unknown[]): Promise<SchemaDefinition> {
    return this.fromExamples(data);
  }

  /**
   * Merge multiple schemas into one
   */
  async merge(schemas: SchemaDefinition[]): Promise<SchemaDefinition> {
    if (schemas.length === 0) {
      throw new Error('At least one schema is required for merging');
    }

    if (schemas.length === 1) {
      return schemas[0];
    }

    // Create intersection of all schemas
    const mergedZodSchema = schemas.reduce((acc, schema) => {
      return z.intersection(acc, schema.zodSchema);
    }, schemas[0].zodSchema);

    const mergedId = schemas.map(s => s.id).join('_');
    
    return this.createSchemaDefinition(
      mergedId,
      mergedZodSchema,
      `Merged schema from: ${schemas.map(s => s.id).join(', ')}`
    );
  }

  /**
   * Parse TypeScript interface string
   */
  private parseTypeScriptInterface(interfaceCode: string): ParsedInterface {
    // Simple parser for basic TypeScript interfaces
    // In a real implementation, you'd use TypeScript compiler API
    
    const interfaceMatch = interfaceCode.match(/interface\s+(\w+)\s*\{([^}]+)\}/);
    if (!interfaceMatch) {
      throw new Error('Invalid TypeScript interface format');
    }

    const [, name, body] = interfaceMatch;
    const fields = this.parseInterfaceFields(body);

    return { name, fields };
  }

  /**
   * Parse interface fields
   */
  private parseInterfaceFields(body: string): InterfaceField[] {
    const fields: InterfaceField[] = [];
    const lines = body.split('\n').map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
      const fieldMatch = line.match(/(\w+)(\?)?:\s*([^;]+);?/);
      if (fieldMatch) {
        const [, name, optional, type] = fieldMatch;
        fields.push({
          name,
          type: type.trim(),
          optional: !!optional
        });
      }
    }

    return fields;
  }

  /**
   * Convert parsed interface to Zod schema
   */
  private convertToZodSchema(parsed: ParsedInterface): z.ZodSchema {
    const shape: Record<string, z.ZodSchema> = {};

    for (const field of parsed.fields) {
      let fieldSchema = this.typeStringToZodSchema(field.type);
      
      if (field.optional) {
        fieldSchema = fieldSchema.optional();
      }

      shape[field.name] = fieldSchema;
    }

    return z.object(shape);
  }

  /**
   * Convert TypeScript type string to Zod schema
   */
  private typeStringToZodSchema(typeString: string): z.ZodSchema {
    const type = typeString.toLowerCase().trim();

    // Basic types
    if (type === 'string') return z.string();
    if (type === 'number') return z.number();
    if (type === 'boolean') return z.boolean();
    if (type === 'date') return z.date();
    if (type === 'unknown' || type === 'any') return z.unknown();

    // Array types
    if (type.endsWith('[]')) {
      const elementType = type.slice(0, -2);
      return z.array(this.typeStringToZodSchema(elementType));
    }

    // Union types
    if (type.includes('|')) {
      const unionTypes = type.split('|').map(t => t.trim());
      const schemas = unionTypes.map(t => this.typeStringToZodSchema(t));
      return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
    }

    // Record types
    if (type.startsWith('record<')) {
      const match = type.match(/record<([^,]+),\s*([^>]+)>/);
      if (match) {
        const [, keyType, valueType] = match;
        if (keyType.trim() === 'string') {
          return z.record(this.typeStringToZodSchema(valueType));
        }
      }
    }

    // Default to string for unknown types
    return z.string();
  }

  /**
   * Infer schema from examples
   */
  private inferSchemaFromExamples(examples: unknown[]): z.ZodSchema {
    if (examples.length === 0) {
      return z.unknown();
    }

    const firstExample = examples[0];
    const baseSchema = this.inferSchemaFromValue(firstExample);

    // Validate all examples against the base schema and refine if needed
    let refinedSchema = baseSchema;
    
    for (let i = 1; i < examples.length; i++) {
      const result = refinedSchema.safeParse(examples[i]);
      if (!result.success) {
        // Merge schemas to accommodate the new example
        const exampleSchema = this.inferSchemaFromValue(examples[i]);
        refinedSchema = this.mergeZodSchemas(refinedSchema, exampleSchema);
      }
    }

    return refinedSchema;
  }

  /**
   * Infer schema from a single value
   */
  private inferSchemaFromValue(value: unknown): z.ZodSchema {
    if (value === null || value === undefined) {
      return z.null();
    }

    if (typeof value === 'string') {
      // Check for common string formats
      if (this.isEmail(value)) return z.string().email();
      if (this.isUrl(value)) return z.string().url();
      if (this.isUuid(value)) return z.string().uuid();
      if (this.isIsoDate(value)) return z.string().datetime();
      return z.string();
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? z.number().int() : z.number();
    }

    if (typeof value === 'boolean') {
      return z.boolean();
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return z.array(z.unknown());
      }
      
      // Infer array element type from first element
      const elementSchema = this.inferSchemaFromValue(value[0]);
      
      // Check if all elements match the same schema
      const allMatch = value.every(item => elementSchema.safeParse(item).success);
      
      if (allMatch) {
        return z.array(elementSchema);
      } else {
        // Create union of all element types
        const elementSchemas = value.map(item => this.inferSchemaFromValue(item));
        const uniqueSchemas = this.deduplicateSchemas(elementSchemas);
        
        if (uniqueSchemas.length === 1) {
          return z.array(uniqueSchemas[0]);
        } else {
          return z.array(z.union(uniqueSchemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]));
        }
      }
    }

    if (typeof value === 'object' && value !== null) {
      const shape: Record<string, z.ZodSchema> = {};
      
      for (const [key, val] of Object.entries(value)) {
        shape[key] = this.inferSchemaFromValue(val);
      }
      
      return z.object(shape);
    }

    return z.unknown();
  }

  /**
   * Merge two Zod schemas
   */
  private mergeZodSchemas(schema1: z.ZodSchema, schema2: z.ZodSchema): z.ZodSchema {
    // Simple union for now - in a real implementation, you'd want more sophisticated merging
    return z.union([schema1, schema2]);
  }

  /**
   * Deduplicate schemas by comparing their structure
   */
  private deduplicateSchemas(schemas: z.ZodSchema[]): z.ZodSchema[] {
    const unique: z.ZodSchema[] = [];
    
    for (const schema of schemas) {
      const isDuplicate = unique.some(existing => 
        this.schemasAreEqual(existing, schema)
      );
      
      if (!isDuplicate) {
        unique.push(schema);
      }
    }
    
    return unique;
  }

  /**
   * Check if two schemas are structurally equal
   */
  private schemasAreEqual(schema1: z.ZodSchema, schema2: z.ZodSchema): boolean {
    // Simple comparison - in a real implementation, you'd want deep structural comparison
    return schema1._def.typeName === schema2._def.typeName;
  }

  /**
   * Create a complete schema definition
   */
  private createSchemaDefinition(
    id: string,
    zodSchema: z.ZodSchema,
    description?: string,
    examples?: unknown[]
  ): SchemaDefinition {
    const jsonSchema = zodToJsonSchema(zodSchema) as JSONSchema7;
    const typeDefinition = this.generateTypeDefinition(id, zodSchema);
    const now = new Date().toISOString();

    return {
      id,
      version: '1.0.0',
      title: id,
      description,
      zodSchema,
      jsonSchema,
      typeDefinition,
      examples,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate TypeScript type definition
   */
  private generateTypeDefinition(name: string, schema: z.ZodSchema): string {
    // Basic type generation - in a real implementation, you'd use zod-to-ts or similar
    return `export type ${name} = z.infer<typeof ${name}Schema>;`;
  }

  // Utility methods for string format detection
  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value);
  }
}

interface ParsedInterface {
  name: string;
  fields: InterfaceField[];
}

interface InterfaceField {
  name: string;
  type: string;
  optional: boolean;
}