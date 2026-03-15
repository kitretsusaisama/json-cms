/**
 * Schema Analyzer Tests
 * 
 * Tests for JSON structure analysis and database schema generation.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SchemaAnalyzer } from '../schema-analyzer';
import { SchemaDefinition, CompatibilityReport } from '../interfaces';
import * as fs from 'fs/promises';
import { glob } from 'glob';

// Mock file system and glob
jest.mock('fs/promises');
jest.mock('glob');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

describe('SchemaAnalyzer', () => {
  let schemaAnalyzer: SchemaAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    schemaAnalyzer = new SchemaAnalyzer();
  });

  describe('analyzeJsonStructure', () => {
    it('should analyze JSON files and generate schema definition', async () => {
      // Mock file discovery
      mockedGlob.mockResolvedValue([
        '/data/pages/home.json',
        '/data/blocks/hero.json',
        '/data/seo/home-seo.json'
      ] as any);

      // Mock file contents
      const pageContent = JSON.stringify({
        id: 'home',
        slug: 'home',
        title: 'Home Page',
        blocks: ['hero-1'],
        status: 'published'
      });

      const blockContent = JSON.stringify({
        id: 'hero-1',
        componentType: 'Hero',
        props: { title: 'Welcome', subtitle: 'To our site' }
      });

      const seoContent = JSON.stringify({
        id: 'home-seo',
        title: 'Home - My Site',
        description: 'Welcome to my site',
        canonical: 'https://example.com'
      });

      mockedFs.readFile
        .mockResolvedValueOnce(pageContent)
        .mockResolvedValueOnce(blockContent)
        .mockResolvedValueOnce(seoContent);

      // Execute
      const schema = await schemaAnalyzer.analyzeJsonStructure('/data');

      // Verify
      expect(schema).toBeDefined();
      expect(schema.version).toBe('1.0.0');
      expect(schema.tables).toHaveLength(3); // pages, blocks, seo
      
      // Check pages table
      const pagesTable = schema.tables.find(t => t.name === 'cms_pages');
      expect(pagesTable).toBeDefined();
      expect(pagesTable!.columns).toContainEqual(
        expect.objectContaining({ name: 'id', type: 'UUID' })
      );
      expect(pagesTable!.columns).toContainEqual(
        expect.objectContaining({ name: 'slug', type: 'VARCHAR(500)' })
      );
      expect(pagesTable!.columns).toContainEqual(
        expect.objectContaining({ name: 'content', type: 'JSONB' })
      );

      // Check indexes
      expect(schema.indexes.length).toBeGreaterThan(0);
      const slugIndex = schema.indexes.find(i => i.name === 'idx_cms_pages_slug');
      expect(slugIndex).toBeDefined();
      expect(slugIndex!.unique).toBe(true);
    });

    it('should handle file reading errors gracefully', async () => {
      mockedGlob.mockResolvedValue(['/data/invalid.json'] as any);
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));

      // Should not throw, but log warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const schema = await schemaAnalyzer.analyzeJsonStructure('/data');
      
      expect(schema).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should categorize files correctly', async () => {
      mockedGlob.mockResolvedValue([
        '/data/page-home.json',
        '/data/block-hero.json',
        '/data/seo-meta.json',
        '/data/settings-global.json'
      ] as any);

      const mockContent = JSON.stringify({ id: 'test' });
      mockedFs.readFile.mockResolvedValue(mockContent);

      const schema = await schemaAnalyzer.analyzeJsonStructure('/data');

      expect(schema.tables).toHaveLength(4);
      expect(schema.tables.map(t => t.name)).toContain('cms_pages');
      expect(schema.tables.map(t => t.name)).toContain('cms_blocks');
      expect(schema.tables.map(t => t.name)).toContain('cms_seo');
      expect(schema.tables.map(t => t.name)).toContain('cms_settings');
    });
  });

  describe('generateDatabaseSchema', () => {
    const mockSchema: SchemaDefinition = {
      version: '1.0.0',
      tables: [
        {
          name: 'cms_pages',
          columns: [
            { name: 'id', type: 'UUID', nullable: false, defaultValue: 'gen_random_uuid()' },
            { name: 'slug', type: 'VARCHAR(255)', nullable: false },
            { name: 'title', type: 'VARCHAR(500)', nullable: true },
            { name: 'content', type: 'JSONB', nullable: false, defaultValue: '{}' }
          ],
          primaryKey: ['id'],
          foreignKeys: []
        }
      ],
      relationships: [],
      indexes: [
        {
          name: 'idx_cms_pages_slug',
          table: 'cms_pages',
          columns: ['slug'],
          unique: true
        }
      ],
      constraints: [
        {
          name: 'chk_cms_pages_status',
          table: 'cms_pages',
          type: 'check',
          definition: "status IN ('draft', 'published', 'archived')"
        }
      ]
    };

    it('should generate PostgreSQL schema', async () => {
      const sql = await schemaAnalyzer.generateDatabaseSchema(mockSchema, 'postgresql');

      expect(sql).toContain('CREATE TABLE cms_pages');
      expect(sql).toContain('id UUID NOT NULL DEFAULT gen_random_uuid()');
      expect(sql).toContain('slug VARCHAR(255) NOT NULL');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('CREATE UNIQUE INDEX idx_cms_pages_slug');
      expect(sql).toContain('ADD CONSTRAINT chk_cms_pages_status CHECK');
    });

    it('should generate MongoDB schema', async () => {
      const schema = await schemaAnalyzer.generateDatabaseSchema(mockSchema, 'mongodb');
      const parsed = JSON.parse(schema);

      expect(parsed.collections).toHaveLength(1);
      expect(parsed.collections[0].name).toBe('cms_pages');
      expect(parsed.collections[0].validator).toBeDefined();
      expect(parsed.collections[0].validator.$jsonSchema).toBeDefined();
    });

    it('should generate SQLite schema', async () => {
      const sql = await schemaAnalyzer.generateDatabaseSchema(mockSchema, 'sqlite');

      expect(sql).toContain('CREATE TABLE cms_pages');
      expect(sql).toContain('id TEXT NOT NULL');
      expect(sql).toContain('slug VARCHAR(255) NOT NULL');
      expect(sql).toContain('content TEXT NOT NULL');
      expect(sql).toContain('CREATE UNIQUE INDEX idx_cms_pages_slug');
    });

    it('should throw error for unsupported provider', async () => {
      await expect(schemaAnalyzer.generateDatabaseSchema(mockSchema, 'unsupported'))
        .rejects.toThrow('Unsupported database provider: unsupported');
    });
  });

  describe('validateSchemaCompatibility', () => {
    const sourceSchema: SchemaDefinition = {
      version: '1.0.0',
      tables: [
        {
          name: 'cms_pages',
          columns: [
            { name: 'id', type: 'UUID', nullable: false },
            { name: 'slug', type: 'VARCHAR(255)', nullable: false },
            { name: 'title', type: 'VARCHAR(500)', nullable: true }
          ],
          primaryKey: ['id'],
          foreignKeys: []
        }
      ],
      relationships: [],
      indexes: [
        { name: 'idx_pages_slug', table: 'cms_pages', columns: ['slug'], unique: true }
      ],
      constraints: []
    };

    it('should report compatible schemas', async () => {
      const targetSchema = { ...sourceSchema };
      
      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.compatible).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.recommendations).toContain('Schema is fully compatible');
    });

    it('should detect missing tables', async () => {
      const targetSchema: SchemaDefinition = {
        ...sourceSchema,
        tables: [] // No tables
      };

      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.compatible).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('breaking');
      expect(report.issues[0].description).toContain("Table 'cms_pages' missing");
    });

    it('should detect missing columns', async () => {
      const targetSchema: SchemaDefinition = {
        ...sourceSchema,
        tables: [
          {
            ...sourceSchema.tables[0],
            columns: sourceSchema.tables[0].columns.filter(c => c.name !== 'title')
          }
        ]
      };

      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.compatible).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('breaking');
      expect(report.issues[0].description).toContain("Column 'title' missing");
    });

    it('should detect type mismatches', async () => {
      const targetSchema: SchemaDefinition = {
        ...sourceSchema,
        tables: [
          {
            ...sourceSchema.tables[0],
            columns: sourceSchema.tables[0].columns.map(c => 
              c.name === 'slug' ? { ...c, type: 'TEXT' } : c
            )
          }
        ]
      };

      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.compatible).toBe(true); // Type mismatch is warning, not breaking
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('warning');
      expect(report.issues[0].description).toContain('Type mismatch');
    });

    it('should detect missing indexes', async () => {
      const targetSchema: SchemaDefinition = {
        ...sourceSchema,
        indexes: [] // No indexes
      };

      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.compatible).toBe(true); // Missing index is warning, not breaking
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe('warning');
      expect(report.issues[0].category).toBe('performance');
    });

    it('should provide appropriate recommendations', async () => {
      const targetSchema: SchemaDefinition = {
        ...sourceSchema,
        tables: []
      };

      const report = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

      expect(report.recommendations).toContain('Review and resolve compatibility issues before migration');
      expect(report.recommendations).toContain('Breaking changes detected - manual intervention required');
    });
  });

  describe('field analysis', () => {
    it('should correctly identify field types', async () => {
      mockedGlob.mockResolvedValue(['/data/test.json'] as any);
      
      const testData = {
        stringField: 'test',
        integerField: 42,
        numberField: 3.14,
        booleanField: true,
        nullField: null,
        arrayField: [1, 2, 3],
        objectField: { nested: 'value' }
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(testData));

      const schema = await schemaAnalyzer.analyzeJsonStructure('/data');
      const table = schema.tables[0];

      // String fields should be VARCHAR
      const stringCol = table.columns.find(c => c.name === 'stringField');
      expect(stringCol?.type).toBe('VARCHAR(500)');

      // Integer fields should be INTEGER
      const intCol = table.columns.find(c => c.name === 'integerField');
      expect(intCol?.type).toBe('INTEGER');

      // Number fields should be DECIMAL
      const numCol = table.columns.find(c => c.name === 'numberField');
      expect(numCol?.type).toBe('DECIMAL(10,2)');

      // Boolean fields should be BOOLEAN
      const boolCol = table.columns.find(c => c.name === 'booleanField');
      expect(boolCol?.type).toBe('BOOLEAN');

      // Null fields should be nullable
      const nullCol = table.columns.find(c => c.name === 'nullField');
      expect(nullCol?.nullable).toBe(true);

      // Complex types (arrays, objects) should not create columns
      expect(table.columns.find(c => c.name === 'arrayField')).toBeUndefined();
      expect(table.columns.find(c => c.name === 'objectField')).toBeUndefined();
    });
  });

  describe('relationship analysis', () => {
    it('should detect relationships between entities', async () => {
      mockedGlob.mockResolvedValue([
        '/data/pages/home.json',
        '/data/blocks/hero.json'
      ] as any);

      const pageContent = JSON.stringify({
        id: 'home',
        blocks: [{ blockId: 'hero-1' }]
      });

      const blockContent = JSON.stringify({
        id: 'hero-1',
        componentType: 'Hero'
      });

      mockedFs.readFile
        .mockResolvedValueOnce(pageContent)
        .mockResolvedValueOnce(blockContent);

      const schema = await schemaAnalyzer.analyzeJsonStructure('/data');

      // Should detect relationship between pages and blocks
      expect(schema.relationships.length).toBeGreaterThan(0);
      
      const relationship = schema.relationships.find(r => 
        r.source === 'cms_pages' && r.target === 'cms_blocks'
      );
      expect(relationship).toBeDefined();
    });
  });
});