/**
 * Schema System Integration Tests
 */

import { z } from 'zod';
import { 
  SchemaGenerator,
  SchemaValidator,
  TypeGenerator,
  SchemaRegistry,
  SchemaAnalyzer,
  SchemaUtils
} from '../index';

describe('Schema System Integration', () => {
  let generator: SchemaGenerator;
  let validator: SchemaValidator;
  let typeGenerator: TypeGenerator;
  let registry: SchemaRegistry;
  let analyzer: SchemaAnalyzer;

  beforeEach(() => {
    generator = new SchemaGenerator();
    validator = new SchemaValidator();
    typeGenerator = new TypeGenerator();
    registry = new SchemaRegistry();
    analyzer = new SchemaAnalyzer();
  });

  describe('End-to-end workflow', () => {
    it('should complete full schema lifecycle', async () => {
      // 1. Generate schema from examples
      const examples = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 }
      ];

      const schemaDefinition = await generator.fromExamples(examples);
      
      // 2. Register schema
      await registry.register(schemaDefinition);
      
      // 3. Validate data
      const testData = { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 };
      const validationResult = await registry.validate(schemaDefinition.id, testData);
      
      expect(validationResult.valid).toBe(true);
      
      // 4. Generate TypeScript types
      const types = await registry.generateTypes(schemaDefinition.id);
      expect(types).toContain('export type');
      
      // 5. Analyze complexity
      const complexity = analyzer.analyzeComplexity(schemaDefinition.zodSchema);
      expect(complexity.score).toBeGreaterThan(0);
    });

    it('should handle schema evolution', async () => {
      // Create initial schema
      const initialSchema = z.object({
        id: z.string(),
        name: z.string()
      });

      const v1 = await registry.createVersion('User', initialSchema);
      expect(v1.version).toBe('1.0.0');

      // Evolve schema (add optional field)
      const evolvedSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional()
      });

      const v2 = await registry.createVersion('User', evolvedSchema);
      expect(v2.version).toBe('1.1.0');
      expect(v2.compatibility).toBe('compatible');

      // Breaking change (remove field)
      const breakingSchema = z.object({
        id: z.string()
      });

      const v3 = await registry.createVersion('User', breakingSchema);
      expect(v3.version).toBe('2.0.0');
      expect(v3.compatibility).toBe('breaking');
    });

    it('should validate complex nested structures', async () => {
      const complexSchema = z.object({
        user: z.object({
          id: z.string().uuid(),
          profile: z.object({
            name: z.string().min(1).max(100),
            email: z.string().email(),
            settings: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean(),
              preferences: z.record(z.union([z.string(), z.number(), z.boolean()]))
            })
          }),
          posts: z.array(z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
            tags: z.array(z.string()),
            publishedAt: z.string().datetime().optional()
          }))
        }),
        metadata: z.record(z.unknown()).optional()
      });

      const complexData = {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
            settings: {
              theme: 'dark' as const,
              notifications: true,
              preferences: {
                language: 'en',
                pageSize: 20,
                autoSave: true
              }
            }
          },
          posts: [
            {
              id: 'post-1',
              title: 'My First Post',
              content: 'This is the content of my first post.',
              tags: ['introduction', 'blog'],
              publishedAt: '2023-01-01T00:00:00Z'
            }
          ]
        },
        metadata: {
          source: 'api',
          version: 1
        }
      };

      const result = validator.validate(complexSchema, complexData);
      expect(result.valid).toBe(true);
    });
  });

  describe('SchemaUtils integration', () => {
    it('should provide convenient utility functions', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const data = { id: '123', name: 'Test' };

      // Test validation utility
      const validationResult = SchemaUtils.validate(schema, data);
      expect(validationResult.valid).toBe(true);

      // Test type generation utility
      const interfaceCode = SchemaUtils.generateInterface(schema, 'TestType');
      expect(interfaceCode).toContain('export interface TestType');

      // Test JSON schema generation utility
      const jsonSchema = SchemaUtils.generateJsonSchema(schema);
      expect(jsonSchema).toHaveProperty('type', 'object');

      // Test complexity analysis utility
      const complexity = SchemaUtils.analyzeComplexity(schema);
      expect(complexity.fieldCount).toBe(2);
    });
  });

  describe('Performance and optimization', () => {
    it('should handle large schemas efficiently', () => {
      // Create a large schema with many fields
      const largeSchemaShape: Record<string, z.ZodSchema> = {};
      
      for (let i = 0; i < 100; i++) {
        largeSchemaShape[`field${i}`] = z.string().optional();
      }
      
      const largeSchema = z.object(largeSchemaShape);
      
      // Create test data
      const largeData: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        largeData[`field${i}`] = `value${i}`;
      }

      const startTime = performance.now();
      const result = validator.validate(largeSchema, largeData);
      const endTime = performance.now();

      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should provide optimization suggestions for complex schemas', () => {
      // Create an overly complex schema
      const complexSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.object({
                level5: z.object({
                  level6: z.object({
                    level7: z.object({
                      level8: z.object({
                        level9: z.object({
                          value: z.string()
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        }),
        manyUnions: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.string()),
          z.object({ type: z.literal('a') }),
          z.object({ type: z.literal('b') }),
          z.object({ type: z.literal('c') }),
          z.object({ type: z.literal('d') }),
          z.object({ type: z.literal('e') }),
          z.object({ type: z.literal('f') }),
          z.object({ type: z.literal('g') })
        ])
      });

      const optimizations = analyzer.suggestOptimizations(complexSchema);
      
      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations.some(opt => opt.type === 'performance')).toBe(true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed data gracefully', () => {
      const schema = z.object({
        id: z.string(),
        data: z.object({
          value: z.number()
        })
      });

      const malformedData = {
        id: 123, // Wrong type
        data: 'not an object', // Wrong type
        extra: 'field' // Extra field
      };

      const result = validator.validate(schema, malformedData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.every(error => error.path && error.message)).toBe(true);
    });

    it('should handle circular references in data', () => {
      const schema = z.any(); // Accept any data
      
      const circularData: any = { id: '1' };
      circularData.self = circularData; // Create circular reference

      // Should not throw an error, but may generate warnings
      const result = validator.validate(schema, circularData);
      expect(result).toBeDefined();
    });

    it('should validate against non-existent schema gracefully', async () => {
      const result = await registry.validate('NonExistentSchema', { data: 'test' });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SCHEMA_NOT_FOUND');
    });
  });

  describe('Type generation integration', () => {
    it('should generate complete module with multiple related schemas', () => {
      const schemas = {
        User: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email()
        }),
        Post: z.object({
          id: z.string(),
          title: z.string(),
          content: z.string(),
          authorId: z.string(),
          tags: z.array(z.string())
        }),
        Comment: z.object({
          id: z.string(),
          content: z.string(),
          postId: z.string(),
          authorId: z.string(),
          createdAt: z.string().datetime()
        })
      };

      const module = typeGenerator.generateModule(schemas, {
        outputFormat: 'typescript',
        includeComments: true,
        includeExamples: false,
        exportType: 'named',
        strictMode: true,
        generateValidators: true
      });

      expect(module).toContain("import { z } from 'zod'");
      expect(module).toContain('export type User');
      expect(module).toContain('export type Post');
      expect(module).toContain('export type Comment');
      expect(module).toContain('validateUser');
      expect(module).toContain('validatePost');
      expect(module).toContain('validateComment');
      expect(module).toContain('export const schemas');
    });
  });
});