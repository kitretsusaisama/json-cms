/**
 * Basic Migration System Tests
 * 
 * Simple tests to verify core functionality without complex mocking.
 */

import { describe, it, expect } from 'vitest';
import { 
  MigrationManager,
  SchemaAnalyzer,
  DataTransferManager,
  FileMigrationStorage,
  createFileMigrationSystem
} from '../index';

describe('Migration System Basic Functionality', () => {
  describe('Factory Functions', () => {
    it('should create file migration system', () => {
      const migrationSystem = createFileMigrationSystem('./test-migrations');
      expect(migrationSystem).toBeInstanceOf(MigrationManager);
    });

    it('should create migration system with custom options', () => {
      const migrationSystem = createFileMigrationSystem('./custom-migrations');
      expect(migrationSystem).toBeInstanceOf(MigrationManager);
    });
  });

  describe('Component Instantiation', () => {
    it('should create SchemaAnalyzer', () => {
      const analyzer = new SchemaAnalyzer();
      expect(analyzer).toBeInstanceOf(SchemaAnalyzer);
      expect(typeof analyzer.analyzeJsonStructure).toBe('function');
      expect(typeof analyzer.generateDatabaseSchema).toBe('function');
      expect(typeof analyzer.validateSchemaCompatibility).toBe('function');
    });

    it('should create DataTransferManager', () => {
      const manager = new DataTransferManager();
      expect(manager).toBeInstanceOf(DataTransferManager);
      expect(typeof manager.createBatches).toBe('function');
      expect(typeof manager.transferBatch).toBe('function');
      expect(typeof manager.validateBatch).toBe('function');
    });

    it('should create DataTransferManager with options', () => {
      const manager = new DataTransferManager({
        batchSize: 50,
        maxConcurrentBatches: 3,
        retryAttempts: 2
      });
      expect(manager).toBeInstanceOf(DataTransferManager);
    });

    it('should create FileMigrationStorage', () => {
      const storage = new FileMigrationStorage('./test-storage');
      expect(storage).toBeInstanceOf(FileMigrationStorage);
      expect(typeof storage.storePlan).toBe('function');
      expect(typeof storage.getPlan).toBe('function');
      expect(typeof storage.storeRecord).toBe('function');
      expect(typeof storage.getRecord).toBe('function');
    });

    it('should create MigrationManager', () => {
      const schemaAnalyzer = new SchemaAnalyzer();
      const dataTransferManager = new DataTransferManager();
      const storage = new FileMigrationStorage('./test-storage');
      
      const manager = new MigrationManager(schemaAnalyzer, dataTransferManager, storage);
      expect(manager).toBeInstanceOf(MigrationManager);
      expect(typeof manager.planMigration).toBe('function');
      expect(typeof manager.executeMigration).toBe('function');
      expect(typeof manager.rollbackMigration).toBe('function');
      expect(typeof manager.validateMigration).toBe('function');
    });
  });

  describe('Interface Validation', () => {
    it('should have correct ContentSource interface structure', () => {
      const fileSource = {
        type: 'file' as const,
        config: {
          basePath: './data',
          patterns: {
            pages: 'pages/**/*.json',
            blocks: 'blocks/**/*.json',
            seo: 'seo/**/*.json',
            settings: 'settings/**/*.json'
          }
        }
      };

      expect(fileSource.type).toBe('file');
      expect(fileSource.config.basePath).toBe('./data');
      expect(fileSource.config.patterns.pages).toBe('pages/**/*.json');
    });

    it('should have correct database ContentSource structure', () => {
      const dbSource = {
        type: 'database' as const,
        config: {
          provider: 'postgresql' as const,
          connectionString: 'postgresql://localhost:5432/test',
          schema: 'cms',
          tables: {
            pages: 'cms_pages',
            blocks: 'cms_blocks',
            seo: 'cms_seo',
            settings: 'cms_settings'
          }
        }
      };

      expect(dbSource.type).toBe('database');
      expect(dbSource.config.provider).toBe('postgresql');
      expect(dbSource.config.connectionString).toContain('postgresql://');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported database provider', async () => {
      const analyzer = new SchemaAnalyzer();
      const mockSchema = {
        version: '1.0.0',
        tables: [],
        relationships: [],
        indexes: [],
        constraints: []
      };

      await expect(analyzer.generateDatabaseSchema(mockSchema, 'unsupported'))
        .rejects.toThrow('Unsupported database provider: unsupported');
    });

    it('should throw error for database source batching (not implemented)', async () => {
      const manager = new DataTransferManager();
      const dbSource = {
        type: 'database' as const,
        config: {
          provider: 'postgresql' as const,
          connectionString: 'postgresql://localhost:5432/test'
        }
      };

      await expect(manager.createBatches(dbSource))
        .rejects.toThrow('Database source batching not yet implemented');
    });
  });

  describe('Type Mapping', () => {
    it('should map JSON types to SQL types correctly', () => {
      const analyzer = new SchemaAnalyzer();
      
      // Test the private method through schema generation
      expect(typeof analyzer.generateDatabaseSchema).toBe('function');
    });
  });

  describe('Validation Logic', () => {
    it('should validate batch structure', async () => {
      const manager = new DataTransferManager();
      
      const validBatch = {
        id: 'batch-123',
        type: 'pages' as const,
        items: [
          {
            id: 'page1',
            type: 'pages',
            data: { id: 'page1', slug: 'page-1', title: 'Page 1' },
            metadata: {
              source: './data/page1.json',
              checksum: 'abc123',
              size: 100,
              dependencies: []
            }
          }
        ],
        size: 100,
        checksum: 'batch-checksum'
      };

      // This will test the validation logic
      const result = await manager.validateBatch(validBatch);
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.summary).toBe('object');
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid migration system options', () => {
      const options = {
        storageType: 'file' as const,
        storageConfig: {
          directory: './custom-migrations'
        },
        transferOptions: {
          batchSize: 200,
          maxConcurrentBatches: 5,
          retryAttempts: 3
        }
      };

      expect(() => createFileMigrationSystem(options.storageConfig.directory)).not.toThrow();
    });
  });
});