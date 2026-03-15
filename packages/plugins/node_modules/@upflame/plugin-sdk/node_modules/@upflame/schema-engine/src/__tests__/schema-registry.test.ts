/**
 * Schema Registry Tests
 */

import { z } from 'zod';
import { SchemaRegistry } from '../schema-registry';
import { SchemaDefinition } from '../interfaces';

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('register and get', () => {
    it('should register and retrieve schema', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const definition: SchemaDefinition = {
        id: 'User',
        version: '1.0.0',
        title: 'User Schema',
        zodSchema: schema,
        jsonSchema: registry.generateJsonSchema(schema),
        typeDefinition: 'export type User = { id: string; name: string; };',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await registry.register(definition);
      const retrieved = await registry.get('User');

      expect(retrieved).toEqual(definition);
    });

    it('should retrieve specific version', async () => {
      const schema1 = z.object({ id: z.string() });
      const schema2 = z.object({ id: z.string(), name: z.string() });

      const def1: SchemaDefinition = {
        id: 'User',
        version: '1.0.0',
        title: 'User Schema v1',
        zodSchema: schema1,
        jsonSchema: registry.generateJsonSchema(schema1),
        typeDefinition: 'type User = { id: string; };',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const def2: SchemaDefinition = {
        id: 'User',
        version: '2.0.0',
        title: 'User Schema v2',
        zodSchema: schema2,
        jsonSchema: registry.generateJsonSchema(schema2),
        typeDefinition: 'type User = { id: string; name: string; };',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await registry.register(def1);
      await registry.register(def2);

      const v1 = await registry.get('User', '1.0.0');
      const v2 = await registry.get('User', '2.0.0');
      const latest = await registry.get('User');

      expect(v1?.version).toBe('1.0.0');
      expect(v2?.version).toBe('2.0.0');
      expect(latest?.version).toBe('2.0.0'); // Latest version
    });
  });

  describe('validate', () => {
    it('should validate data against registered schema', async () => {
      const schema = z.object({
        id: z.string(),
        age: z.number().min(0)
      });

      const definition: SchemaDefinition = {
        id: 'Person',
        version: '1.0.0',
        title: 'Person Schema',
        zodSchema: schema,
        jsonSchema: registry.generateJsonSchema(schema),
        typeDefinition: 'type Person = { id: string; age: number; };',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await registry.register(definition);

      const validData = { id: '123', age: 25 };
      const result = await registry.validate('Person', validData);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should return error for non-existent schema', async () => {
      const result = await registry.validate('NonExistent', {});

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SCHEMA_NOT_FOUND');
    });
  });

  describe('generateTypes', () => {
    it('should generate TypeScript types', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      });

      const definition: SchemaDefinition = {
        id: 'User',
        version: '1.0.0',
        title: 'User Schema',
        zodSchema: schema,
        jsonSchema: registry.generateJsonSchema(schema),
        typeDefinition: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await registry.register(definition);
      const types = await registry.generateTypes('User');

      expect(types).toContain('export type User');
      expect(types).toContain('id: string');
      expect(types).toContain('name: string');
    });
  });

  describe('createVersion', () => {
    it('should create first version', async () => {
      const schema = z.object({ id: z.string() });
      const versionInfo = await registry.createVersion('NewSchema', schema);

      expect(versionInfo.version).toBe('1.0.0');
      expect(versionInfo.compatibility).toBe('compatible');
      expect(versionInfo.migrationRequired).toBe(false);
    });

    it('should increment version for changes', async () => {
      const schema1 = z.object({ id: z.string() });
      const schema2 = z.object({ id: z.string(), name: z.string() });

      await registry.createVersion('TestSchema', schema1);
      const versionInfo = await registry.createVersion('TestSchema', schema2);

      expect(versionInfo.version).toBe('2.0.0');
      expect(versionInfo.previousVersion).toBe('1.0.0');
    });
  });

  describe('migrateData', () => {
    it('should migrate data between versions', async () => {
      const schema1 = z.object({ id: z.string() });
      const schema2 = z.object({ id: z.string(), name: z.string().default('Unknown') });

      await registry.createVersion('MigrationTest', schema1);
      await registry.createVersion('MigrationTest', schema2);

      const oldData = { id: '123' };
      const migratedData = await registry.migrateData('MigrationTest', oldData, '1.0.0', '2.0.0');

      expect(migratedData).toEqual({ id: '123' });
    });
  });
});
