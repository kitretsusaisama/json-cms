/**
 * Type Generator Tests
 */

import { z } from 'zod';
import { TypeGenerator } from '../type-generator';

describe('TypeGenerator', () => {
  let generator: TypeGenerator;

  beforeEach(() => {
    generator = new TypeGenerator();
  });

  describe('generateInterface', () => {
    it('should generate TypeScript interface from simple schema', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        age: z.number(),
        active: z.boolean()
      });

      const result = generator.generateInterface(schema, 'User');

      expect(result).toContain('export interface User');
      expect(result).toContain('id: string;');
      expect(result).toContain('name: string;');
      expect(result).toContain('age: number;');
      expect(result).toContain('active: boolean;');
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        metadata: z.record(z.string()).optional()
      });

      const result = generator.generateInterface(schema, 'Product');

      expect(result).toContain('id: string;');
      expect(result).toContain('name: string;');
      expect(result).toContain('description?: string;');
      expect(result).toContain('metadata?: Record<string, string>;');
    });

    it('should handle arrays', () => {
      const schema = z.object({
        id: z.string(),
        tags: z.array(z.string()),
        items: z.array(z.object({
          name: z.string(),
          value: z.number()
        }))
      });

      const result = generator.generateInterface(schema, 'Collection');

      expect(result).toContain('tags: string[];');
      expect(result).toContain('items: {\n    name: string;\n    value: number\n  }[];');
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        id: z.string(),
        profile: z.object({
          name: z.string(),
          settings: z.object({
            theme: z.string(),
            notifications: z.boolean()
          })
        })
      });

      const result = generator.generateInterface(schema, 'User');

      expect(result).toContain('profile: {');
      expect(result).toContain('settings: {');
      expect(result).toContain('theme: string');
      expect(result).toContain('notifications: boolean');
    });

    it('should include comments when enabled', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const result = generator.generateInterface(schema, 'User', {
        outputFormat: 'typescript',
        includeComments: true,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: false
      });

      expect(result).toContain('/**');
      expect(result).toContain('Generated interface for User');
      expect(result).toContain('*/');
    });

    it('should generate validators when enabled', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const result = generator.generateInterface(schema, 'User', {
        outputFormat: 'typescript',
        includeComments: false,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: true
      });

      expect(result).toContain('validateUser');
      expect(result).toContain('isUser');
      expect(result).toContain('UserSchema');
    });
  });

  describe('generateTypeAlias', () => {
    it('should generate type alias from schema', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const result = generator.generateTypeAlias(schema, 'User');

      expect(result).toContain('export type User =');
      expect(result).toContain('id: string');
      expect(result).toContain('name: string');
    });

    it('should handle union types', () => {
      const schema = z.union([
        z.string(),
        z.number(),
        z.boolean()
      ]);

      const result = generator.generateTypeAlias(schema, 'Value');

      expect(result).toContain('export type Value = string | number | boolean;');
    });

    it('should handle enum types', () => {
      const schema = z.enum(['active', 'inactive', 'pending']);

      const result = generator.generateTypeAlias(schema, 'Status');

      expect(result).toContain("export type Status = 'active' | 'inactive' | 'pending';");
    });

    it('should handle literal types', () => {
      const schema = z.object({
        type: z.literal('user'),
        role: z.literal('admin')
      });

      const result = generator.generateTypeAlias(schema, 'AdminUser');

      expect(result).toContain("type: 'user'");
      expect(result).toContain("role: 'admin'");
    });
  });

  describe('generateValidator', () => {
    it('should generate validation functions', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const result = generator.generateValidator(schema, 'User');

      expect(result).toContain('export function validateUser(data: unknown): User');
      expect(result).toContain('export function isUser(data: unknown): data is User');
      expect(result).toContain('export const UserSchema =');
    });

    it('should include proper function implementations', () => {
      const schema = z.string();

      const result = generator.generateValidator(schema, 'Name');

      expect(result).toContain('return NameSchema.parse(data);');
      expect(result).toContain('return NameSchema.safeParse(data).success;');
    });
  });

  describe('generateModule', () => {
    it('should generate complete module with multiple schemas', () => {
      const schemas = {
        User: z.object({
          id: z.string(),
          name: z.string()
        }),
        Product: z.object({
          id: z.string(),
          title: z.string(),
          price: z.number()
        })
      };

      const result = generator.generateModule(schemas);

      expect(result).toContain("import { z } from 'zod';");
      expect(result).toContain('export type User =');
      expect(result).toContain('export type Product =');
      expect(result).toContain('validateUser');
      expect(result).toContain('validateProduct');
    });

    it('should include utility functions when validators enabled', () => {
      const schemas = {
        User: z.object({ id: z.string() }),
        Product: z.object({ id: z.string() })
      };

      const result = generator.generateModule(schemas, {
        outputFormat: 'typescript',
        includeComments: false,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: true
      });

      expect(result).toContain('export const schemas =');
      expect(result).toContain('export function validateAny');
      expect(result).toContain('export function isValidAny');
    });

    it('should include module comments when enabled', () => {
      const schemas = {
        User: z.object({ id: z.string() })
      };

      const result = generator.generateModule(schemas, {
        outputFormat: 'typescript',
        includeComments: true,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: false
      });

      expect(result).toContain('/**');
      expect(result).toContain('Generated types and validators');
      expect(result).toContain('This file is auto-generated');
    });
  });

  describe('complex type handling', () => {
    it('should handle record types', () => {
      const schema = z.object({
        metadata: z.record(z.string()),
        counts: z.record(z.number())
      });

      const result = generator.generateTypeAlias(schema, 'Data');

      expect(result).toContain('metadata: Record<string, string>');
      expect(result).toContain('counts: Record<string, number>');
    });

    it('should handle nullable types', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string().nullable(),
        description: z.string().optional().nullable()
      });

      const result = generator.generateTypeAlias(schema, 'Item');

      expect(result).toContain('name: string | null');
      expect(result).toContain('description?: string | null');
    });

    it('should handle intersection types', () => {
      const baseSchema = z.object({
        id: z.string()
      });
      
      const extendedSchema = z.object({
        name: z.string()
      });

      const intersectionSchema = z.intersection(baseSchema, extendedSchema);

      const result = generator.generateTypeAlias(intersectionSchema, 'Combined');

      expect(result).toContain('id: string');
      expect(result).toContain('name: string');
    });

    it('should handle default values', () => {
      const schema = z.object({
        id: z.string(),
        active: z.boolean().default(true),
        count: z.number().default(0)
      });

      const result = generator.generateInterface(schema, 'Config');

      expect(result).toContain('active?: boolean;');
      expect(result).toContain('count?: number;');
    });
  });

  describe('field comments', () => {
    it('should generate comments for string constraints', () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(2).max(50),
        url: z.string().url(),
        uuid: z.string().uuid()
      });

      const result = generator.generateInterface(schema, 'User', {
        outputFormat: 'typescript',
        includeComments: true,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: false
      });

      expect(result).toContain('email format');
      expect(result).toContain('min length: 2, max length: 50');
      expect(result).toContain('URL format');
      expect(result).toContain('UUID format');
    });

    it('should generate comments for number constraints', () => {
      const schema = z.object({
        age: z.number().int().min(0).max(120),
        price: z.number().min(0),
        rating: z.number().max(5)
      });

      const result = generator.generateInterface(schema, 'Data', {
        outputFormat: 'typescript',
        includeComments: true,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: false
      });

      expect(result).toContain('integer, min: 0, max: 120');
      expect(result).toContain('min: 0');
      expect(result).toContain('max: 5');
    });
  });
});