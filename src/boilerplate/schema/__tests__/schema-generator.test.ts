/**
 * Schema Generator Tests
 */

import { z } from 'zod';
import { SchemaGenerator } from '../schema-generator';

describe('SchemaGenerator', () => {
  let generator: SchemaGenerator;

  beforeEach(() => {
    generator = new SchemaGenerator();
  });

  describe('fromTypeScript', () => {
    it('should generate schema from simple interface', async () => {
      const interfaceCode = `
        interface User {
          id: string;
          name: string;
          age: number;
          active: boolean;
        }
      `;

      const schema = await generator.fromTypeScript(interfaceCode);

      expect(schema.id).toBe('User');
      expect(schema.version).toBe('1.0.0');
      expect(schema.zodSchema).toBeDefined();
      expect(schema.jsonSchema).toBeDefined();
      expect(schema.typeDefinition).toBeDefined();
    });

    it('should handle optional fields', async () => {
      const interfaceCode = `
        interface Product {
          id: string;
          name: string;
          description?: string;
          price: number;
        }
      `;

      const schema = await generator.fromTypeScript(interfaceCode);
      
      // Test that the schema validates correctly
      const validData = { id: '1', name: 'Test', price: 100 };
      const result = schema.zodSchema.safeParse(validData);
      expect(result.success).toBe(true);

      const validDataWithOptional = { id: '1', name: 'Test', description: 'A test product', price: 100 };
      const result2 = schema.zodSchema.safeParse(validDataWithOptional);
      expect(result2.success).toBe(true);
    });

    it('should handle array types', async () => {
      const interfaceCode = `
        interface Order {
          id: string;
          items: string[];
          quantities: number[];
        }
      `;

      const schema = await generator.fromTypeScript(interfaceCode);
      
      const validData = {
        id: '1',
        items: ['item1', 'item2'],
        quantities: [1, 2]
      };
      
      const result = schema.zodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should throw error for invalid interface format', async () => {
      const invalidCode = 'not an interface';
      
      await expect(generator.fromTypeScript(invalidCode)).rejects.toThrow('Invalid TypeScript interface format');
    });
  });

  describe('fromExamples', () => {
    it('should generate schema from simple examples', async () => {
      const examples = [
        { id: '1', name: 'John', age: 30 },
        { id: '2', name: 'Jane', age: 25 },
        { id: '3', name: 'Bob', age: 35 }
      ];

      const schema = await generator.fromExamples(examples);

      expect(schema.id).toBe('InferredSchema');
      expect(schema.examples).toEqual(examples);
      
      // Test that all examples validate
      for (const example of examples) {
        const result = schema.zodSchema.safeParse(example);
        expect(result.success).toBe(true);
      }
    });

    it('should handle mixed types in arrays', async () => {
      const examples = [
        { tags: ['tag1', 'tag2'] },
        { tags: ['tag3'] },
        { tags: [] }
      ];

      const schema = await generator.fromExamples(examples);
      
      for (const example of examples) {
        const result = schema.zodSchema.safeParse(example);
        expect(result.success).toBe(true);
      }
    });

    it('should detect string formats', async () => {
      const examples = [
        { email: 'test@example.com', url: 'https://example.com' },
        { email: 'user@test.org', url: 'https://test.org' }
      ];

      const schema = await generator.fromExamples(examples);
      
      // Should validate correct formats
      const validData = { email: 'valid@email.com', url: 'https://valid.com' };
      const result = schema.zodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should throw error for empty examples', async () => {
      await expect(generator.fromExamples([])).rejects.toThrow('At least one example is required');
    });
  });

  describe('fromData', () => {
    it('should be alias for fromExamples', async () => {
      const data = [{ id: 1, name: 'test' }];
      
      const schema1 = await generator.fromData(data);
      const schema2 = await generator.fromExamples(data);
      
      expect(schema1.id).toBe(schema2.id);
    });
  });

  describe('merge', () => {
    it('should merge multiple schemas', async () => {
      const schema1 = await generator.fromExamples([{ id: '1', name: 'test' }]);
      const schema2 = await generator.fromExamples([{ age: 30, active: true }]);

      const merged = await generator.merge([schema1, schema2]);

      expect(merged.id).toContain('InferredSchema_InferredSchema');
      expect(merged.zodSchema).toBeDefined();
    });

    it('should return single schema when merging one', async () => {
      const schema = await generator.fromExamples([{ id: '1' }]);
      const merged = await generator.merge([schema]);

      expect(merged).toBe(schema);
    });

    it('should throw error for empty schemas array', async () => {
      await expect(generator.merge([])).rejects.toThrow('At least one schema is required for merging');
    });
  });

  describe('type inference', () => {
    it('should infer correct types for primitives', async () => {
      const examples = [
        {
          str: 'hello',
          num: 42,
          bool: true,
          nullVal: null,
          arr: [1, 2, 3],
          obj: { nested: 'value' }
        }
      ];

      const schema = await generator.fromExamples(examples);
      const result = schema.zodSchema.safeParse(examples[0]);
      expect(result.success).toBe(true);
    });

    it('should handle nested objects', async () => {
      const examples = [
        {
          user: {
            profile: {
              name: 'John',
              settings: {
                theme: 'dark',
                notifications: true
              }
            }
          }
        }
      ];

      const schema = await generator.fromExamples(examples);
      const result = schema.zodSchema.safeParse(examples[0]);
      expect(result.success).toBe(true);
    });

    it('should handle complex arrays', async () => {
      const examples = [
        {
          users: [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' }
          ],
          tags: ['tag1', 'tag2'],
          mixed: [1, 'string', true]
        }
      ];

      const schema = await generator.fromExamples(examples);
      const result = schema.zodSchema.safeParse(examples[0]);
      expect(result.success).toBe(true);
    });
  });
});