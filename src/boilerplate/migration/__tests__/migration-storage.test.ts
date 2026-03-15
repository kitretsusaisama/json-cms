/**
 * Migration Storage Tests
 * 
 * Tests for migration plan and record persistence.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FileMigrationStorage } from '../migration-storage';
import { MigrationPlan, MigrationRecord, MigrationStatus } from '../interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file system
jest.mock('fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileMigrationStorage', () => {
  let storage: FileMigrationStorage;
  const testStorageDir = './test-migrations';

  const mockPlan: MigrationPlan = {
    id: 'plan-123',
    source: {
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
    },
    target: {
      type: 'database',
      config: {
        provider: 'postgresql',
        connectionString: 'postgresql://localhost:5432/test'
      }
    },
    steps: [
      {
        id: 'step-1',
        type: 'schema',
        operation: 'create_schema',
        description: 'Create database schema',
        dependencies: [],
        estimatedDuration: 30000
      }
    ],
    estimatedDuration: 30000,
    risks: [],
    createdAt: '2023-01-01T00:00:00Z',
    metadata: {
      totalItems: 100,
      totalSize: 1024000,
      dependencies: []
    }
  };

  const mockRecord: MigrationRecord = {
    id: 'migration-123',
    planId: 'plan-123',
    status: 'completed',
    startTime: '2023-01-01T00:00:00Z',
    endTime: '2023-01-01T00:05:00Z',
    duration: 300000,
    source: mockPlan.source,
    target: mockPlan.target,
    result: {
      migrationId: 'migration-123',
      status: 'success',
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T00:05:00Z',
      duration: 300000,
      stepsExecuted: 1,
      stepsTotal: 1,
      itemsProcessed: 100,
      itemsTotal: 100,
      errors: [],
      warnings: [],
      rollbackAvailable: true,
      metadata: {
        performance: {
          throughput: 20,
          memoryUsage: 256,
          cpuUsage: 45,
          networkIO: 1024,
          diskIO: 2048
        },
        dataIntegrity: {
          checksumValidation: true,
          referenceIntegrity: true,
          dataConsistency: true,
          schemaCompliance: true,
          duplicateCheck: true
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new FileMigrationStorage(testStorageDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create storage directories on init', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);

      await storage.init();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        path.join(testStorageDir, 'plans'), 
        { recursive: true }
      );
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        path.join(testStorageDir, 'records'), 
        { recursive: true }
      );
    });
  });

  describe('plan storage', () => {
    it('should store migration plan', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await storage.storePlan(mockPlan);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'plans', 'plan-123.json'),
        JSON.stringify(mockPlan, null, 2),
        'utf-8'
      );
    });

    it('should retrieve migration plan', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPlan));

      const result = await storage.getPlan('plan-123');

      expect(result).toEqual(mockPlan);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'plans', 'plan-123.json'),
        'utf-8'
      );
    });

    it('should return null for non-existent plan', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockedFs.readFile.mockRejectedValue(error);

      const result = await storage.getPlan('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for other file system errors', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.getPlan('plan-123'))
        .rejects.toThrow('Permission denied');
    });

    it('should delete migration plan', async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await storage.deletePlan('plan-123');

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        path.join(testStorageDir, 'plans', 'plan-123.json')
      );
    });

    it('should handle delete of non-existent plan gracefully', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockedFs.unlink.mockRejectedValue(error);

      // Should not throw
      await storage.deletePlan('non-existent');

      expect(mockedFs.unlink).toHaveBeenCalled();
    });
  });

  describe('record storage', () => {
    it('should store migration record', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await storage.storeRecord(mockRecord);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'records', 'migration-123.json'),
        JSON.stringify(mockRecord, null, 2),
        'utf-8'
      );
    });

    it('should retrieve migration record', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRecord));

      const result = await storage.getRecord('migration-123');

      expect(result).toEqual(mockRecord);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'records', 'migration-123.json'),
        'utf-8'
      );
    });

    it('should return null for non-existent record', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockedFs.readFile.mockRejectedValue(error);

      const result = await storage.getRecord('non-existent');

      expect(result).toBeNull();
    });

    it('should update migration record', async () => {
      // Mock existing record retrieval
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRecord));
      mockedFs.writeFile.mockResolvedValue(undefined);

      const updates = { status: 'failed' as MigrationStatus };
      await storage.updateRecord('migration-123', updates);

      const expectedUpdated = { ...mockRecord, ...updates };
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'records', 'migration-123.json'),
        JSON.stringify(expectedUpdated, null, 2),
        'utf-8'
      );
    });

    it('should throw error when updating non-existent record', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockedFs.readFile.mockRejectedValue(error);

      await expect(storage.updateRecord('non-existent', { status: 'failed' }))
        .rejects.toThrow('Migration record not found: non-existent');
    });

    it('should delete migration record', async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await storage.deleteRecord('migration-123');

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        path.join(testStorageDir, 'records', 'migration-123.json')
      );
    });
  });

  describe('getAllRecords', () => {
    it('should retrieve all migration records', async () => {
      const record1 = { ...mockRecord, id: 'migration-1', startTime: '2023-01-01T00:00:00Z' };
      const record2 = { ...mockRecord, id: 'migration-2', startTime: '2023-01-02T00:00:00Z' };

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['migration-1.json', 'migration-2.json'] as any);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(record1))
        .mockResolvedValueOnce(JSON.stringify(record2));

      const result = await storage.getAllRecords();

      expect(result).toHaveLength(2);
      // Should be sorted by start time, newest first
      expect(result[0].id).toBe('migration-2');
      expect(result[1].id).toBe('migration-1');
    });

    it('should handle empty records directory', async () => {
      const error = new Error('Directory not found') as any;
      error.code = 'ENOENT';
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockRejectedValue(error);

      const result = await storage.getAllRecords();

      expect(result).toEqual([]);
    });

    it('should skip invalid JSON files', async () => {
      const validRecord = { ...mockRecord, id: 'migration-1' };

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['migration-1.json', 'invalid.json'] as any);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(validRecord))
        .mockRejectedValueOnce(new Error('Invalid JSON'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await storage.getAllRecords();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('migration-1');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should filter out non-JSON files', async () => {
      const validRecord = { ...mockRecord, id: 'migration-1' };

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['migration-1.json', 'readme.txt', '.DS_Store'] as any);
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(validRecord));

      const result = await storage.getAllRecords();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('migration-1');
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle file system permission errors', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.storePlan(mockPlan))
        .rejects.toThrow('Permission denied');
    });

    it('should handle disk space errors', async () => {
      const error = new Error('No space left on device') as any;
      error.code = 'ENOSPC';
      mockedFs.writeFile.mkRejectedValue(error);

      await expect(storage.storeRecord(mockRecord))
        .rejects.toThrow('No space left on device');
    });

    it('should handle corrupted JSON files', async () => {
      mockedFs.readFile.mockResolvedValue('invalid json content');

      await expect(storage.getPlan('plan-123'))
        .rejects.toThrow();
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent plan storage', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const plan1 = { ...mockPlan, id: 'plan-1' };
      const plan2 = { ...mockPlan, id: 'plan-2' };

      // Store plans concurrently
      await Promise.all([
        storage.storePlan(plan1),
        storage.storePlan(plan2)
      ]);

      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent record updates', async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRecord));
      mockedFs.writeFile.mockResolvedValue(undefined);

      const updates1 = { status: 'in_progress' as MigrationStatus };
      const updates2 = { status: 'completed' as MigrationStatus };

      // Update record concurrently
      await Promise.all([
        storage.updateRecord('migration-123', updates1),
        storage.updateRecord('migration-123', updates2)
      ]);

      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
    });
  });
});