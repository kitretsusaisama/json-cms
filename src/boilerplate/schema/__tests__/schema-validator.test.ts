/**
 * Schema Validator Tests
 */

import { z } from 'zod';
import { SchemaValidator } from '../schema-validator';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validate', () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      age: z.number().int().min(0),
      email: z.string().email(),
      active: z.boolean().default(true)
    });

    it('should validate correct data', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        active: true
      };

      const result = validator.validate(userSchema, validData);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toHaveLength(0);
      expect(result.performance.validationTime).toBeGreaterThan(0);
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        id: 123, // should be string
        name: '', // empty string
        age: -5, // negative age
        email: 'invalid-email', // invalid email format
        active: 'yes' // should be boolean
      };

      const result = validator.validate(userSchema, invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('path');
      expect(result.errors[0]).toHaveProperty('message');
      expect(result.errors[0]).toHaveProperty('code');
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        id: '123',
        name: 'John'
        // missing age and email
      };

      const result = validator.validate(userSchema, incompleteData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('age'))).toBe(true);
      expect(result.errors.some(e => e.path.includes('email'))).toBe(true);
    });

    it('should generate warnings for valid data', () => {
      const largeObject = {
        id: '123',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        active: true,
        largeField: 'x'.repeat(50000) // Large string
      };

      const largeSchema = userSchema.extend({
        largeField: z.string()
      });

      const result = validator.validate(largeSchema, largeObject);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('Large object'))).toBe(true);
    });

    it('should detect potential XSS in strings', () => {
      const xssData = {
        id: '123',
        name: '<script>alert("xss")</script>',
        age: 30,
        email: 'john@example.com',
        active: true
      };

      const result = validator.validate(userSchema, xssData);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('XSS'))).toBe(true);
    });

    it('should detect sensitive field names', () => {
      const sensitiveSchema = z.object({
        id: z.string(),
        password: z.string(),
        creditCard: z.string()
      });

      const data = {
        id: '123',
        password: 'secret123',
        creditCard: '1234-5678-9012-3456'
      };

      const result = validator.validate(sensitiveSchema, data);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Sensitive field'))).toBe(true);
    });
  });

  describe('validateAndTransform', () => {
    it('should transform data during validation', () => {
      const schema = z.object({
        name: z.string(),
        description: z.string()
      });

      const dataWithWhitespace = {
        name: '  John Doe  ',
        description: '  A test user  '
      };

      const result = validator.validateAndTransform(schema, dataWithWhitespace);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        description: 'A test user'
      });
    });

    it('should transform nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string()
          })
        })
      });

      const data = {
        user: {
          name: '  John  ',
          profile: {
            bio: '  Developer  '
          }
        }
      };

      const result = validator.validateAndTransform(schema, data);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        user: {
          name: 'John',
          profile: {
            bio: 'Developer'
          }
        }
      });
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple items', () => {
      const schema = z.object({
        id: z.string(),
        value: z.number()
      });

      const items = [
        { id: '1', value: 10 },
        { id: '2', value: 'invalid' }, // Invalid
        { id: '3', value: 30 }
      ];

      const results = validator.validateBatch(schema, items);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });
  });

  describe('validateWithFormatter', () => {
    it('should use custom error formatter', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidData = {
        name: 123,
        age: 'invalid'
      };

      const customFormatter = (error: z.ZodError) => {
        return error.errors.map(e => ({
          path: e.path.join('.'),
          message: `Custom: ${e.message}`,
          code: 'CUSTOM_ERROR'
        }));
      };

      const result = validator.validateWithFormatter(schema, invalidData, customFormatter);

      expect(result.valid).toBe(false);
      expect(result.errors.every(e => e.message.startsWith('Custom:'))).toBe(true);
      expect(result.errors.every(e => e.code === 'CUSTOM_ERROR')).toBe(true);
    });
  });

  describe('performance metrics', () => {
    it('should track validation time', () => {
      const schema = z.object({
        id: z.string(),
        data: z.array(z.object({
          value: z.number()
        }))
      });

      const data = {
        id: '123',
        data: Array.from({ length: 1000 }, (_, i) => ({ value: i }))
      };

      const result = validator.validate(schema, data);

      expect(result.performance.validationTime).toBeGreaterThan(0);
      expect(result.performance.schemaSize).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle validation exceptions', () => {
      const schema = z.object({
        id: z.string()
      });

      // Simulate a schema that throws during validation
      const mockSchema = {
        safeParse: () => {
          throw new Error('Validation error');
        }
      } as any;

      const result = validator.validate(mockSchema, { id: '123' });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deep nesting warnings', () => {
    it('should warn about deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    level7: {
                      level8: {
                        level9: {
                          level10: {
                            level11: {
                              value: 'deep'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const schema = z.any();
      const result = validator.validate(schema, deepObject);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Deep object nesting'))).toBe(true);
    });
  });
});