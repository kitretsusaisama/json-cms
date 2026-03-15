/**
 * Schema Analyzer Tests
 */

import { z } from 'zod';
import { SchemaAnalyzer } from '../schema-analyzer';

describe('SchemaAnalyzer', () => {
  let analyzer: SchemaAnalyzer;

  beforeEach(() => {
    analyzer = new SchemaAnalyzer();
  });

  describe('analyzeComplexity', () => {
    it('should analyze simple schema complexity', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        age: z.number()
      });

      const report = analyzer.analyzeComplexity(schema);

      expect(report.fieldCount).toBe(3);
      expect(report.requiredFields).toBe(3);
      expect(report.optionalFields).toBe(0);
      expect(report.nestedObjects).toBe(1);
      expect(report.depth).toBe(0);
      expect(report.score).toBeGreaterThan(0);
    });

    it('should detect optional fields', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string()).optional()
      });

      const report = analyzer.analyzeComplexity(schema);

      expect(report.fieldCount).toBe(4);
      expect(report.requiredFields).toBe(1);
      expect(report.optionalFields).toBe(3);
    });

    it('should analyze nested objects', () => {
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

      const report = analyzer.analyzeComplexity(schema);

      expect(report.nestedObjects).toBe(3); // Root + profile + settings
      expect(report.depth).toBe(2); // Two levels deep
      expect(report.fieldCount).toBe(4); // id, name, theme, notifications
    });

    it('should detect arrays and unions', () => {
      const schema = z.object({
        id: z.string(),
        tags: z.array(z.string()),
        items: z.array(z.object({
          name: z.string(),
          value: z.union([z.string(), z.number()])
        }))
      });

      const report = analyzer.analyzeComplexity(schema);

      expect(report.arrays).toBe(2);
      expect(report.unions).toBe(1);
    });

    it('should provide complexity recommendations', () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.object({
                level5: z.object({
                  level6: z.object({
                    level7: z.object({
                      value: z.string()
                    })
                  })
                })
              })
            })
          })
        })
      });

      const report = analyzer.analyzeComplexity(deepSchema);

      expect(report.depth).toBeGreaterThan(6);
      expect(report.recommendations).toContain('Consider flattening deeply nested structures');
    });
  });

  describe('compareSchemas', () => {
    it('should detect compatible changes', () => {
      const oldSchema = z.object({
        id: z.string(),
        name: z.string()
      });

      const newSchema = z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional() // Added optional field
      });

      const report = analyzer.compareSchemas(oldSchema, newSchema);

      expect(report.compatible).toBe(true);
      expect(report.migrationRequired).toBe(false);
      expect(report.compatibleChanges.length).toBeGreaterThan(0);
      expect(report.breakingChanges.length).toBe(0);
    });

    it('should detect breaking changes', () => {
      const oldSchema = z.object({
        id: z.string(),
        name: z.string(),
        description: z.string()
      });

      const newSchema = z.object({
        id: z.string(),
        name: z.string()
        // Removed description field
      });

      const report = analyzer.compareSchemas(oldSchema, newSchema);

      expect(report.compatible).toBe(false);
      expect(report.migrationRequired).toBe(true);
      expect(report.breakingChanges.length).toBeGreaterThan(0);
    });

    it('should assess migration complexity', () => {
      const oldSchema = z.object({
        id: z.string(),
        data: z.string()
      });

      const newSchema = z.object({
        id: z.string()
        // Removed multiple fields
      });

      const report = analyzer.compareSchemas(oldSchema, newSchema);

      expect(report.migrationComplexity).toBeDefined();
      expect(['simple', 'moderate', 'complex']).toContain(report.migrationComplexity);
    });
  });

  describe('suggestOptimizations', () => {
    it('should suggest performance optimizations', () => {
      const deepSchema = z.object({
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
        })
      });

      const optimizations = analyzer.suggestOptimizations(deepSchema);

      expect(optimizations.some(opt => opt.type === 'performance')).toBe(true);
      expect(optimizations.some(opt => opt.description.includes('Deep nesting'))).toBe(true);
    });

    it('should suggest validation optimizations', () => {
      const schema = z.object({
        name: z.string(), // No validation
        email: z.string(), // No validation
        description: z.string() // No validation
      });

      const optimizations = analyzer.suggestOptimizations(schema);

      expect(optimizations.some(opt => opt.type === 'validation')).toBe(true);
      expect(optimizations.some(opt => opt.description.includes('validation'))).toBe(true);
    });

    it('should suggest maintainability improvements', () => {
      const schema = z.object({
        field1: z.string().optional(),
        field2: z.string().optional(),
        field3: z.string().optional(),
        field4: z.string().optional(),
        field5: z.string().optional(),
        required1: z.string()
      });

      const optimizations = analyzer.suggestOptimizations(schema);

      expect(optimizations.some(opt => opt.type === 'maintainability')).toBe(true);
    });
  });

  describe('extractDependencies', () => {
    it('should extract schema dependencies', () => {
      const userSchema = z.object({
        id: z.string(),
        name: z.string()
      });

      const postSchema = z.object({
        id: z.string(),
        title: z.string(),
        authorId: z.string()
      });

      const schemas = {
        User: userSchema,
        Post: postSchema
      };

      const graph = analyzer.extractDependencies(schemas);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.nodes.some(node => node.id === 'User')).toBe(true);
      expect(graph.nodes.some(node => node.id === 'Post')).toBe(true);
    });

    it('should detect cycles in dependencies', () => {
      const schema1 = z.object({
        id: z.string(),
        ref: z.string()
      });

      const schema2 = z.object({
        id: z.string(),
        ref: z.string()
      });

      const schemas = {
        Schema1: schema1,
        Schema2: schema2
      };

      const graph = analyzer.extractDependencies(schemas);

      expect(graph.cycles).toBeDefined();
      expect(Array.isArray(graph.cycles)).toBe(true);
    });
  });
});