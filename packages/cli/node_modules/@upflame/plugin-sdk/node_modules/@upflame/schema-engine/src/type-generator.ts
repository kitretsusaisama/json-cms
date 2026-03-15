/**
 * Type Generator
 * 
 * Generates TypeScript types and validation functions from Zod schemas
 */

import { z } from 'zod';
import { 
  TypeGenerator as ITypeGenerator,
  TypeGenerationOptions
} from './interfaces';

export class TypeGenerator implements ITypeGenerator {
  /**
   * Generate TypeScript interface from Zod schema
   */
  generateInterface(schema: z.ZodSchema, name: string, options?: TypeGenerationOptions): string {
    const opts = this.getDefaultOptions(options);
    const interfaceBody = this.generateInterfaceBody(schema, 0, opts);
    
    let result = '';
    
    if (opts.includeComments) {
      result += `/**\n * Generated interface for ${name}\n */\n`;
    }
    
    result += `export interface ${name} {\n${interfaceBody}\n}`;
    
    if (opts.generateValidators) {
      result += '\n\n' + this.generateValidator(schema, name);
    }
    
    return result;
  }

  /**
   * Generate TypeScript type alias from Zod schema
   */
  generateTypeAlias(schema: z.ZodSchema, name: string, options?: TypeGenerationOptions): string {
    const opts = this.getDefaultOptions(options);
    const typeDefinition = this.generateTypeDefinition(schema, opts);
    
    let result = '';
    
    if (opts.includeComments) {
      result += `/**\n * Generated type alias for ${name}\n */\n`;
    }
    
    result += `export type ${name} = ${typeDefinition};`;
    
    if (opts.generateValidators) {
      result += '\n\n' + this.generateValidator(schema, name);
    }
    
    return result;
  }

  /**
   * Generate validation function from Zod schema
   */
  generateValidator(schema: z.ZodSchema, name: string): string {
    const validatorName = `validate${name}`;
    const isValidName = `is${name}`;
    
    return `
/**
 * Validate ${name} data
 */
export function ${validatorName}(data: unknown): ${name} {
  return ${name}Schema.parse(data);
}

/**
 * Check if data is valid ${name}
 */
export function ${isValidName}(data: unknown): data is ${name} {
  return ${name}Schema.safeParse(data).success;
}

/**
 * Zod schema for ${name}
 */
export const ${name}Schema = ${this.generateSchemaCode(schema)};`.trim();
  }

  /**
   * Generate complete module with types and validators
   */
  generateModule(schemas: Record<string, z.ZodSchema>, options?: TypeGenerationOptions): string {
    const opts = this.getDefaultOptions(options);
    const parts: string[] = [];
    
    // Add imports
    parts.push("import { z } from 'zod';");
    parts.push('');
    
    // Add module comment
    if (opts.includeComments) {
      parts.push('/**');
      parts.push(' * Generated types and validators');
      parts.push(' * This file is auto-generated. Do not edit manually.');
      parts.push(' */');
      parts.push('');
    }
    
    // Generate types and validators for each schema
    for (const [name, schema] of Object.entries(schemas)) {
      if (opts.exportType === 'interface') {
        parts.push(this.generateInterface(schema, name, opts));
      } else {
        parts.push(this.generateTypeAlias(schema, name, opts));
      }
      parts.push('');
    }
    
    // Add utility functions
    if (opts.generateValidators) {
      parts.push(this.generateUtilityFunctions(schemas));
    }
    
    return parts.join('\n');
  }

  /**
   * Generate interface body
   */
  private generateInterfaceBody(schema: z.ZodSchema, indent: number, options: TypeGenerationOptions): string {
    const indentStr = '  '.repeat(indent + 1);
    
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: string[] = [];
      
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault;
        const fieldType = this.generateTypeDefinition(fieldSchema, options);
        
        let property = `${indentStr}${key}${isOptional ? '?' : ''}: ${fieldType};`;
        
        if (options.includeComments) {
          const comment = this.generateFieldComment(fieldSchema);
          if (comment) {
            property = `${indentStr}/** ${comment} */\n${property}`;
          }
        }
        
        properties.push(property);
      }
      
      return properties.join('\n');
    }
    
    return `${indentStr}[key: string]: ${this.generateTypeDefinition(schema, options)};`;
  }

  /**
   * Generate type definition for a schema
   */
  private generateTypeDefinition(schema: z.ZodSchema, options: TypeGenerationOptions): string {
    // Handle different Zod types
    if (schema instanceof z.ZodString) {
      return 'string';
    }
    
    if (schema instanceof z.ZodNumber) {
      return 'number';
    }
    
    if (schema instanceof z.ZodBoolean) {
      return 'boolean';
    }
    
    if (schema instanceof z.ZodDate) {
      return 'Date';
    }
    
    if (schema instanceof z.ZodArray) {
      const elementType = this.generateTypeDefinition(schema.element, options);
      return `${elementType}[]`;
    }
    
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: string[] = [];
      
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault;
        const fieldType = this.generateTypeDefinition(fieldSchema, options);
        properties.push(`${key}${isOptional ? '?' : ''}: ${fieldType}`);
      }
      
      return `{\n  ${properties.join(';\n  ')}\n}`;
    }
    
    if (schema instanceof z.ZodUnion) {
      const types = schema.options.map((option: z.ZodSchema) => 
        this.generateTypeDefinition(option, options)
      );
      return types.join(' | ');
    }
    
    if (schema instanceof z.ZodEnum) {
      const values = schema.options.map((value: string) => `'${value}'`);
      return values.join(' | ');
    }
    
    if (schema instanceof z.ZodLiteral) {
      const value = schema.value;
      return typeof value === 'string' ? `'${value}'` : String(value);
    }
    
    if (schema instanceof z.ZodRecord) {
      const valueType = schema.valueType 
        ? this.generateTypeDefinition(schema.valueType, options)
        : 'unknown';
      return `Record<string, ${valueType}>`;
    }
    
    if (schema instanceof z.ZodOptional) {
      return this.generateTypeDefinition(schema.unwrap(), options);
    }
    
    if (schema instanceof z.ZodNullable) {
      const innerType = this.generateTypeDefinition(schema.unwrap(), options);
      return `${innerType} | null`;
    }
    
    if (schema instanceof z.ZodDefault) {
      return this.generateTypeDefinition(schema.removeDefault(), options);
    }
    
    if (schema instanceof z.ZodIntersection) {
      const leftType = this.generateTypeDefinition(schema._def.left, options);
      const rightType = this.generateTypeDefinition(schema._def.right, options);
      return `${leftType} & ${rightType}`;
    }
    
    // Fallback for unknown types
    return 'unknown';
  }

  /**
   * Generate schema code string
   */
  private generateSchemaCode(schema: z.ZodSchema): string {
    // This is a simplified version - in a real implementation,
    // you'd need to serialize the entire Zod schema structure
    return 'z.unknown() /* Schema serialization not implemented */';
  }

  /**
   * Generate field comment from schema
   */
  private generateFieldComment(schema: z.ZodSchema): string | null {
    // Extract description from schema if available
    if ('description' in schema._def && schema._def.description) {
      return schema._def.description;
    }
    
    // Generate comment based on schema type
    if (schema instanceof z.ZodString) {
      const checks = (schema._def as any).checks || [];
      const constraints: string[] = [];
      
      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            constraints.push(`min length: ${check.value}`);
            break;
          case 'max':
            constraints.push(`max length: ${check.value}`);
            break;
          case 'email':
            constraints.push('email format');
            break;
          case 'url':
            constraints.push('URL format');
            break;
          case 'uuid':
            constraints.push('UUID format');
            break;
        }
      }
      
      if (constraints.length > 0) {
        return constraints.join(', ');
      }
    }
    
    if (schema instanceof z.ZodNumber) {
      const checks = (schema._def as any).checks || [];
      const constraints: string[] = [];
      
      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            constraints.push(`min: ${check.value}`);
            break;
          case 'max':
            constraints.push(`max: ${check.value}`);
            break;
          case 'int':
            constraints.push('integer');
            break;
        }
      }
      
      if (constraints.length > 0) {
        return constraints.join(', ');
      }
    }
    
    return null;
  }

  /**
   * Generate utility functions
   */
  private generateUtilityFunctions(schemas: Record<string, z.ZodSchema>): string {
    const schemaNames = Object.keys(schemas);
    
    return `
/**
 * Utility functions for validation
 */
export const schemas = {
${schemaNames.map(name => `  ${name}: ${name}Schema`).join(',\n')}
};

export function validateAny(type: keyof typeof schemas, data: unknown): unknown {
  return schemas[type].parse(data);
}

export function isValidAny(type: keyof typeof schemas, data: unknown): boolean {
  return schemas[type].safeParse(data).success;
}`.trim();
  }

  /**
   * Get default options
   */
  private getDefaultOptions(options?: TypeGenerationOptions): Required<TypeGenerationOptions> {
    return {
      outputFormat: 'typescript',
      includeComments: true,
      includeExamples: false,
      exportType: 'named',
      strictMode: true,
      generateValidators: true,
      ...options
    };
  }
}