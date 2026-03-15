/**
 * Migration System Integration Tests
 * 
 * End-to-end tests for the complete migration system workflow.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createFileMigrationSystem } from '../index';
import { MigrationManager } from '../migration-manager';
import { ContentSource } from '../interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('glob');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

describe('Migration System Integration', () => {
  let migrationManager: MigrationManager;
  const testStorageDir = './test-migrations';

  const mockFileSource: ContentSource = {
    type: 'file',
    config: {
      basePath: './test-data',
      patterns: {
        pages: 'pages/**/*.json',
        blocks: 'blocks/**/*.json',
        seo: 'seo/**/*.json',
        settings: 'settings/**/*.json'
      }
    }
  };

  const mockDatabaseTarget: ContentSource = {
    type: 'database',
    config: {
      provider: 'postgresql',
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

  beforeEach(() => {
    jest.clearAllMocks();
    migrationManager = createFileMigrationSystem(testStorageDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('complete migration workflow', () => {
    it('should execute full migration from planning to completion', async () => {
      // Setup mock data
      setupMockFileSystem();

      // Step 1: Plan migration
      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);

      // Step 2: Execute migration
      const result = await migrationManager.executeMigration(plan);
      
      expect(result.status).toBe('success');
      expect(result.stepsExecuted).toBe(plan.steps.length);
      expect(result.itemsProcessed).toBeGreaterThan(0);

      // Step 3: Validate migration
      const validation = await migrationManager.validateMigration(result.migrationId);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 4: Check migration history
      const history = await migrationManager.getMigrationHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(result.migrationId);
      expect(history[0].status).toBe('completed');
    });

    it('should handle migration failure and rollback', async () => {
      // Setup mock data with some invalid content
      setupMockFileSystemWithErrors();

      // Plan migration
      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);

      // Execute migration (will fail)
      try {
        await migrationManager.executeMigration(plan);
      } catch (error) {
        // Expected to fail
      }

      // Check migration history for failed migration
      const history = await migrationManager.getMigrationHistory();
      const failedMigration = history.find(r => r.status === 'failed');
      
      expect(failedMigration).toBeDefined();

      // Attempt rollback (if rollback is available)
      if (failedMigration?.result?.rollbackAvailable) {
        await migrationManager.rollbackMigration(failedMigration.id);
        
        const updatedHistory = await migrationManager.getMigrationHistory();
        const rolledBackMigration = updatedHistory.find(r => r.id === failedMigration.id);
        
        expect(rolledBackMigration?.status).toBe('rolled_back');
      }
    });

    it('should handle large dataset migration with batching', async () => {
      // Setup large dataset
      setupLargeMockDataset();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);

      expect(result.status).toBe('success');
      expect(result.itemsProcessed).toBe(1000); // Large dataset
      expect(result.metadata.performance.throughput).toBeGreaterThan(0);
    });

    it('should maintain data integrity throughout migration', async () => {
      setupMockFileSystem();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);

      // Verify data integrity
      expect(result.metadata.dataIntegrity.checksumValidation).toBe(true);
      expect(result.metadata.dataIntegrity.referenceIntegrity).toBe(true);
      expect(result.metadata.dataIntegrity.dataConsistency).toBe(true);
      expect(result.metadata.dataIntegrity.schemaCompliance).toBe(true);
      expect(result.metadata.dataIntegrity.duplicateCheck).toBe(true);
    });
  });

  describe('schema analysis and generation', () => {
    it('should analyze complex JSON structures correctly', async () => {
      setupComplexMockData();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);

      // Verify schema analysis detected all content types
      expect(plan.steps.some(s => s.operation === 'transfer_pages')).toBe(true);
      expect(plan.steps.some(s => s.operation === 'transfer_blocks')).toBe(true);
      expect(plan.steps.some(s => s.operation === 'transfer_seo')).toBe(true);
      expect(plan.steps.some(s => s.operation === 'transfer_settings')).toBe(true);
    });

    it('should generate appropriate database schema for different providers', async () => {
      setupMockFileSystem();

      // Test PostgreSQL
      const pgTarget = { ...mockDatabaseTarget, config: { ...mockDatabaseTarget.config, provider: 'postgresql' } };
      const pgPlan = await migrationManager.planMigration(mockFileSource, pgTarget);
      expect(pgPlan.steps.find(s => s.type === 'schema')).toBeDefined();

      // Test SQLite
      const sqliteTarget = { ...mockDatabaseTarget, config: { ...mockDatabaseTarget.config, provider: 'sqlite' } };
      const sqlitePlan = await migrationManager.planMigration(mockFileSource, sqliteTarget);
      expect(sqlitePlan.steps.find(s => s.type === 'schema')).toBeDefined();
    });
  });

  describe('performance and optimization', () => {
    it('should optimize batch sizes based on content size', async () => {
      setupVariableSizeMockData();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);

      // Verify performance metrics are collected
      expect(result.metadata.performance.throughput).toBeGreaterThan(0);
      expect(result.metadata.performance.memoryUsage).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle concurrent batch processing', async () => {
      setupMockFileSystem();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);

      expect(result.status).toBe('success');
      // Verify all items were processed despite concurrent batching
      expect(result.itemsProcessed).toBe(result.itemsTotal);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle partial migration failures gracefully', async () => {
      setupMockFileSystemWithPartialErrors();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);

      expect(result.status).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.itemsProcessed).toBeGreaterThan(0);
      expect(result.itemsProcessed).toBeLessThan(result.itemsTotal);
    });

    it('should provide detailed error reporting', async () => {
      setupMockFileSystemWithErrors();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      
      try {
        await migrationManager.executeMigration(plan);
      } catch (error) {
        // Check that error details are available in migration history
        const history = await migrationManager.getMigrationHistory();
        const failedMigration = history.find(r => r.status === 'failed');
        
        expect(failedMigration?.result?.errors).toBeDefined();
        expect(failedMigration?.result?.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('migration validation and verification', () => {
    it('should validate migration completeness', async () => {
      setupMockFileSystem();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);
      const validation = await migrationManager.validateMigration(result.migrationId);

      expect(validation.valid).toBe(true);
      expect(validation.summary.totalItems).toBe(result.itemsTotal);
      expect(validation.summary.validItems).toBe(result.itemsProcessed);
      expect(validation.summary.invalidItems).toBe(0);
    });

    it('should detect data inconsistencies', async () => {
      setupMockFileSystemWithInconsistentData();

      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);
      const result = await migrationManager.executeMigration(plan);
      const validation = await migrationManager.validateMigration(result.migrationId);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.summary.invalidItems).toBeGreaterThan(0);
    });
  });

  // Helper functions to setup mock data
  function setupMockFileSystem() {
    mockedGlob
      .mockResolvedValueOnce(['./test-data/pages/home.json', './test-data/pages/about.json'] as any)
      .mockResolvedValueOnce(['./test-data/blocks/hero.json'] as any)
      .mockResolvedValueOnce(['./test-data/seo/home-seo.json'] as any)
      .mockResolvedValueOnce(['./test-data/settings/global.json'] as any);

    mockedFs.readFile
      .mockResolvedValueOnce(JSON.stringify({ id: 'home', slug: 'home', title: 'Home' }))
      .mockResolvedValueOnce(JSON.stringify({ id: 'about', slug: 'about', title: 'About' }))
      .mockResolvedValueOnce(JSON.stringify({ id: 'hero', componentType: 'Hero' }))
      .mockResolvedValueOnce(JSON.stringify({ id: 'home-seo', title: 'Home SEO' }))
      .mockResolvedValueOnce(JSON.stringify({ siteName: 'Test Site' }));

    // Mock storage operations
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }

  function setupMockFileSystemWithErrors() {
    mockedGlob.mockResolvedValue(['./test-data/invalid.json'] as any);
    mockedFs.readFile.mockRejectedValue(new Error('File read error'));
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
  }

  function setupMockFileSystemWithPartialErrors() {
    mockedGlob
      .mockResolvedValueOnce(['./test-data/pages/valid.json', './test-data/pages/invalid.json'] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    mockedFs.readFile
      .mockResolvedValueOnce(JSON.stringify({ id: 'valid', slug: 'valid' }))
      .mockRejectedValueOnce(new Error('Invalid JSON'));

    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }

  function setupLargeMockDataset() {
    // Mock 1000 files
    const files = Array.from({ length: 1000 }, (_, i) => `./test-data/pages/page${i}.json`);
    mockedGlob
      .mockResolvedValueOnce(files as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    // Mock file contents
    for (let i = 0; i < 1000; i++) {
      mockedFs.readFile.mockResolvedValueOnce(
        JSON.stringify({ id: `page${i}`, slug: `page-${i}`, title: `Page ${i}` })
      );
    }

    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }

  function setupComplexMockData() {
    mockedGlob
      .mockResolvedValueOnce(['./test-data/pages/complex.json'] as any)
      .mockResolvedValueOnce(['./test-data/blocks/complex.json'] as any)
      .mockResolvedValueOnce(['./test-data/seo/complex.json'] as any)
      .mockResolvedValueOnce(['./test-data/settings/complex.json'] as any);

    const complexPage = {
      id: 'complex',
      slug: 'complex-page',
      title: 'Complex Page',
      blocks: [
        { blockId: 'hero-1', order: 1 },
        { blockId: 'content-1', order: 2 }
      ],
      metadata: {
        author: 'John Doe',
        publishedAt: '2023-01-01T00:00:00Z',
        tags: ['test', 'complex']
      }
    };

    const complexBlock = {
      id: 'hero-1',
      componentType: 'Hero',
      props: {
        title: 'Welcome',
        subtitle: 'To our complex site',
        backgroundImage: { url: '/images/hero.jpg', alt: 'Hero image' }
      },
      constraints: {
        maxWidth: 1200,
        responsive: true
      }
    };

    mockedFs.readFile
      .mockResolvedValueOnce(JSON.stringify(complexPage))
      .mockResolvedValueOnce(JSON.stringify(complexBlock))
      .mockResolvedValueOnce(JSON.stringify({ title: 'Complex SEO', description: 'Complex page SEO' }))
      .mockResolvedValueOnce(JSON.stringify({ theme: 'dark', features: ['analytics', 'seo'] }));

    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }

  function setupVariableSizeMockData() {
    mockedGlob
      .mockResolvedValueOnce(['./test-data/pages/small.json', './test-data/pages/large.json'] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const smallPage = { id: 'small', slug: 'small' };
    const largePage = {
      id: 'large',
      slug: 'large',
      content: Array.from({ length: 1000 }, (_, i) => `Content block ${i}`).join(' ')
    };

    mockedFs.readFile
      .mockResolvedValueOnce(JSON.stringify(smallPage))
      .mockResolvedValueOnce(JSON.stringify(largePage));

    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }

  function setupMockFileSystemWithInconsistentData() {
    mockedGlob
      .mockResolvedValueOnce(['./test-data/pages/inconsistent.json'] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    // Page with missing required fields
    const inconsistentPage = { id: 'inconsistent', title: 'Missing slug' };

    mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(inconsistentPage));
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
  }
});