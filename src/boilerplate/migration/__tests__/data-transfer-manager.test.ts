/**
 * Data Transfer Manager Tests
 * 
 * Tests for batch data transfer, validation, and integrity checks.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DataTransferManager } from '../data-transfer-manager';
import { 
  ContentSource, 
  DataBatch, 
  ContentItem, 
  TransferResult,
  ValidationResult 
} from '../interfaces';
import * as fs from 'fs/promises';
import { glob } from 'glob';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('glob');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

describe('DataTransferManager', () => {
  let dataTransferManager: DataTransferManager;

  const mockFileSource: ContentSource = {
    type: 'file',
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

  beforeEach(() => {
    jest.clearAllMocks();
    dataTransferManager = new DataTransferManager({
      batchSize: 10,
      maxConcurrentBatches: 2,
      retryAttempts: 2
    });
  });

  describe('createBatches', () => {
    it('should create batches from file source', async () => {
      // Mock file discovery
      mockedGlob
        .mockResolvedValueOnce(['./data/pages/page1.json', './data/pages/page2.json'] as any)
        .mockResolvedValueOnce(['./data/blocks/block1.json'] as any)
        .mockResolvedValueOnce([] as any) // seo
        .mockResolvedValueOnce([] as any); // settings

      // Mock file contents
      const page1Content = JSON.stringify({ id: 'page1', slug: 'page-1', title: 'Page 1' });
      const page2Content = JSON.stringify({ id: 'page2', slug: 'page-2', title: 'Page 2' });
      const block1Content = JSON.stringify({ id: 'block1', componentType: 'Hero' });

      mockedFs.readFile
        .mockResolvedValueOnce(page1Content)
        .mockResolvedValueOnce(page2Content)
        .mockResolvedValueOnce(block1Content);

      // Execute
      const batches = await dataTransferManager.createBatches(mockFileSource, 5);

      // Verify
      expect(batches).toHaveLength(2); // One for pages, one for blocks
      
      const pagesBatch = batches.find(b => b.type === 'pages');
      expect(pagesBatch).toBeDefined();
      expect(pagesBatch!.items).toHaveLength(2);
      expect(pagesBatch!.items[0].id).toBe('page1');
      expect(pagesBatch!.items[1].id).toBe('page2');

      const blocksBatch = batches.find(b => b.type === 'blocks');
      expect(blocksBatch).toBeDefined();
      expect(blocksBatch!.items).toHaveLength(1);
      expect(blocksBatch!.items[0].id).toBe('block1');
    });

    it('should handle file reading errors gracefully', async () => {
      mockedGlob.mockResolvedValue(['./data/invalid.json'] as any);
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const batches = await dataTransferManager.createBatches(mockFileSource);

      expect(batches).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should create multiple batches when items exceed batch size', async () => {
      // Create 15 mock files
      const files = Array.from({ length: 15 }, (_, i) => `./data/pages/page${i}.json`);
      mockedGlob
        .mockResolvedValueOnce(files as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);

      // Mock file contents
      for (let i = 0; i < 15; i++) {
        mockedFs.readFile.mockResolvedValueOnce(
          JSON.stringify({ id: `page${i}`, slug: `page-${i}` })
        );
      }

      // Execute with batch size of 10
      const batches = await dataTransferManager.createBatches(mockFileSource, 10);

      // Should create 2 batches for pages (10 + 5 items)
      const pagesBatches = batches.filter(b => b.type === 'pages');
      expect(pagesBatches).toHaveLength(2);
      expect(pagesBatches[0].items).toHaveLength(10);
      expect(pagesBatches[1].items).toHaveLength(5);
    });

    it('should throw error for database source (not implemented)', async () => {
      const dbSource: ContentSource = {
        type: 'database',
        config: {
          provider: 'postgresql',
          connectionString: 'postgresql://localhost:5432/test'
        }
      };

      await expect(dataTransferManager.createBatches(dbSource))
        .rejects.toThrow('Database source batching not yet implemented');
    });
  });

  describe('validateBatch', () => {
    const createMockBatch = (items: Partial<ContentItem>[] = []): DataBatch => {
      const fullItems: ContentItem[] = items.map((item, index) => ({
        id: item.id || `item-${index}`,
        type: item.type || 'pages',
        data: item.data || { id: `item-${index}` },
        metadata: {
          source: item.metadata?.source || `./data/item-${index}.json`,
          checksum: item.metadata?.checksum || 'valid-checksum',
          size: item.metadata?.size || 100,
          dependencies: item.metadata?.dependencies || []
        }
      }));

      return {
        id: 'batch-123',
        type: 'pages',
        items: fullItems,
        size: fullItems.reduce((sum, item) => sum + item.metadata.size, 0),
        checksum: 'batch-checksum'
      };
    };

    it('should validate a valid batch successfully', async () => {
      const batch = createMockBatch([
        { id: 'page1', data: { id: 'page1', slug: 'page-1' } },
        { id: 'page2', data: { id: 'page2', slug: 'page-2' } }
      ]);

      // Mock checksum calculation to match
      jest.spyOn(dataTransferManager as any, 'calculateBatchChecksum')
        .mockReturnValue('batch-checksum');
      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const result = await dataTransferManager.validateBatch(batch);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.validItems).toBe(2);
      expect(result.summary.invalidItems).toBe(0);
    });

    it('should detect batch checksum mismatch', async () => {
      const batch = createMockBatch([{ id: 'page1' }]);

      // Mock checksum calculation to not match
      jest.spyOn(dataTransferManager as any, 'calculateBatchChecksum')
        .mockReturnValue('different-checksum');

      const result = await dataTransferManager.validateBatch(batch);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Batch checksum mismatch');
    });

    it('should detect item validation errors', async () => {
      const batch = createMockBatch([
        { id: '', data: {} }, // Invalid item - missing ID
        { id: 'page2', data: { id: 'page2' } } // Valid item
      ]);

      jest.spyOn(dataTransferManager as any, 'calculateBatchChecksum')
        .mockReturnValue('batch-checksum');
      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const result = await dataTransferManager.validateBatch(batch);

      expect(result.valid).toBe(false);
      expect(result.summary.validItems).toBe(1);
      expect(result.summary.invalidItems).toBe(1);
    });

    it('should detect duplicate items', async () => {
      const batch = createMockBatch([
        { id: 'page1', data: { id: 'page1' } },
        { id: 'page1', data: { id: 'page1' } } // Duplicate
      ]);

      jest.spyOn(dataTransferManager as any, 'calculateBatchChecksum')
        .mockReturnValue('batch-checksum');
      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const result = await dataTransferManager.validateBatch(batch);

      expect(result.warnings).toContain('Found 1 duplicate items in batch');
      expect(result.errors.some(e => e.message.includes('Duplicate item'))).toBe(true);
    });
  });

  describe('transferBatch', () => {
    it('should transfer batch successfully', async () => {
      const batch = createMockBatch([
        { id: 'page1', data: { id: 'page1', slug: 'page-1' } },
        { id: 'page2', data: { id: 'page2', slug: 'page-2' } }
      ]);

      // Mock validation to pass
      jest.spyOn(dataTransferManager, 'validateBatch').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        summary: { totalItems: 2, validItems: 2, invalidItems: 0, missingItems: 0 }
      });

      // Mock successful transfer
      jest.spyOn(dataTransferManager as any, 'transferItem').mockResolvedValue(undefined);

      const result = await dataTransferManager.transferBatch(batch);

      expect(result.status).toBe('success');
      expect(result.itemsProcessed).toBe(2);
      expect(result.itemsTotal).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle validation failures', async () => {
      const batch = createMockBatch([{ id: 'invalid' }]);

      // Mock validation to fail
      jest.spyOn(dataTransferManager, 'validateBatch').mockResolvedValue({
        valid: false,
        errors: [
          {
            type: 'schema',
            item: 'invalid',
            message: 'Invalid item',
            severity: 'error'
          }
        ],
        warnings: [],
        summary: { totalItems: 1, validItems: 0, invalidItems: 1, missingItems: 0 }
      });

      const result = await dataTransferManager.transferBatch(batch);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('validation');
    });

    it('should retry failed transfers', async () => {
      const batch = createMockBatch([{ id: 'page1' }]);

      // Mock validation to pass
      jest.spyOn(dataTransferManager, 'validateBatch').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        summary: { totalItems: 1, validItems: 1, invalidItems: 0, missingItems: 0 }
      });

      // Mock transfer to fail once, then succeed
      jest.spyOn(dataTransferManager as any, 'transferItem')
        .mockRejectedValueOnce(new Error('Transfer failed'))
        .mockResolvedValueOnce(undefined);

      const result = await dataTransferManager.transferBatch(batch);

      expect(result.status).toBe('success');
      expect(result.itemsProcessed).toBe(1);
    });

    it('should mark batch as failed after max retries', async () => {
      const batch = createMockBatch([{ id: 'page1' }]);

      // Mock validation to pass
      jest.spyOn(dataTransferManager, 'validateBatch').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        summary: { totalItems: 1, validItems: 1, invalidItems: 0, missingItems: 0 }
      });

      // Mock transfer to always fail
      jest.spyOn(dataTransferManager as any, 'transferItem')
        .mockRejectedValue(new Error('Transfer failed'));

      const result = await dataTransferManager.transferBatch(batch);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to transfer item after 2 attempts');
    });

    it('should mark batch as partial when some items fail', async () => {
      const batch = createMockBatch([
        { id: 'page1' },
        { id: 'page2' },
        { id: 'page3' }
      ]);

      // Mock validation to pass
      jest.spyOn(dataTransferManager, 'validateBatch').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        summary: { totalItems: 3, validItems: 3, invalidItems: 0, missingItems: 0 }
      });

      // Mock transfer to fail for one item
      jest.spyOn(dataTransferManager as any, 'transferItem')
        .mockResolvedValueOnce(undefined) // page1 succeeds
        .mockRejectedValue(new Error('Transfer failed')) // page2 fails
        .mockResolvedValueOnce(undefined); // page3 succeeds

      const result = await dataTransferManager.transferBatch(batch);

      expect(result.status).toBe('partial');
      expect(result.itemsProcessed).toBe(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('item validation', () => {
    it('should validate page data correctly', async () => {
      const pageItem: ContentItem = {
        id: 'page1',
        type: 'pages',
        data: { id: 'page1', slug: 'page-1', title: 'Page 1' },
        metadata: {
          source: './data/page1.json',
          checksum: 'valid-checksum',
          size: 100,
          dependencies: []
        }
      };

      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const validation = await (dataTransferManager as any).validateItem(pageItem);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields in pages', async () => {
      const pageItem: ContentItem = {
        id: 'page1',
        type: 'pages',
        data: { id: 'page1', title: 'Page 1' }, // Missing slug
        metadata: {
          source: './data/page1.json',
          checksum: 'valid-checksum',
          size: 100,
          dependencies: []
        }
      };

      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const validation = await (dataTransferManager as any).validateItem(pageItem);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('slug'))).toBe(true);
    });

    it('should validate block data correctly', async () => {
      const blockItem: ContentItem = {
        id: 'block1',
        type: 'blocks',
        data: { id: 'block1', componentType: 'Hero' },
        metadata: {
          source: './data/block1.json',
          checksum: 'valid-checksum',
          size: 100,
          dependencies: []
        }
      };

      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const validation = await (dataTransferManager as any).validateItem(blockItem);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing componentType in blocks', async () => {
      const blockItem: ContentItem = {
        id: 'block1',
        type: 'blocks',
        data: { id: 'block1' }, // Missing componentType
        metadata: {
          source: './data/block1.json',
          checksum: 'valid-checksum',
          size: 100,
          dependencies: []
        }
      };

      jest.spyOn(dataTransferManager as any, 'calculateChecksum')
        .mockReturnValue('valid-checksum');

      const validation = await (dataTransferManager as any).validateItem(blockItem);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('componentType'))).toBe(true);
    });
  });

  function createMockBatch(items: Partial<ContentItem>[] = []): DataBatch {
    const fullItems: ContentItem[] = items.map((item, index) => ({
      id: item.id || `item-${index}`,
      type: item.type || 'pages',
      data: item.data || { id: `item-${index}` },
      metadata: {
        source: item.metadata?.source || `./data/item-${index}.json`,
        checksum: item.metadata?.checksum || 'valid-checksum',
        size: item.metadata?.size || 100,
        dependencies: item.metadata?.dependencies || []
      }
    }));

    return {
      id: 'batch-123',
      type: 'pages',
      items: fullItems,
      size: fullItems.reduce((sum, item) => sum + item.metadata.size, 0),
      checksum: 'batch-checksum'
    };
  }
});