/**
 * Type Generator
 *
 * Generates TypeScript types and validation functions from Zod schemas
 */
import { z } from 'zod';
import { TypeGenerator as ITypeGenerator, TypeGenerationOptions } from './interfaces';
export declare class TypeGenerator implements ITypeGenerator {
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
    /**
     * Generate interface body
     */
    private generateInterfaceBody;
    /**
     * Generate type definition for a schema
     */
    private generateTypeDefinition;
    /**
     * Generate schema code string
     */
    private generateSchemaCode;
    /**
     * Generate field comment from schema
     */
    private generateFieldComment;
    /**
     * Generate utility functions
     */
    private generateUtilityFunctions;
    /**
     * Get default options
     */
    private getDefaultOptions;
}
//# sourceMappingURL=type-generator.d.ts.map