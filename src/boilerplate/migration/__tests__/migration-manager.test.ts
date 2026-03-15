/**
 * Migration Manager Tests
 * 
 * Comprehensive tests for the migration manager functionality
 * including planning, execution, rollback, and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MigrationManager } from '../migration-manager';
import { SchemaAnalyzer } from '../schema-analyzer';
import { DataTransferManager } from '../data-transfer-manager';
import { FileMigrationStorage } from '../migration-storage';
import { 
  ContentSource, 
  MigrationPlan, 
  MigrationResult,
  ValidationResult,
  MigrationStatus
} from '../interfaces';

// Mock dependencies
vi.mock('../schema-analyzer');
vi.mock('../data-transfer-manager');
vi.mock('../migration-storage');

const MockedSchemaAnalyzer = SchemaAnalyzer as any;
const MockedDataTransferManager = DataTransferManager as any;
const MockedFileMigrationStorage = FileMigrationStorage as any;

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;
  let mockSchemaAnalyzer: any;
  let mockDataTransferManager: any;
  let mockMigrationStorage: any;

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
    // Reset mocks
    vi.clearAllMocks();

    // Create mock instances
    mockSchemaAnalyzer = new MockedSchemaAnalyzer();
    mockDataTransferManager = new MockedDataTransferManager();
    mockMigrationStorage = new MockedFileMigrationStorage();

    // Create migration manager with mocked dependencies
    migrationManager = new MigrationManager(
      mockSchemaAnalyzer,
      mockDataTransferManager,
      mockMigrationStorage
    );
  });

  describe('planMigration', () => {
    it('should create a comprehensive migration plan', async () => {
      // Setup mocks
      const mockSchema = {
        version: '1.0.0',
        tables: [
          {
            name: 'cms_pages',
            columns: [
              { name: 'id', type: 'UUID', nullable: false },
              { name: 'slug', type: 'VARCHAR(255)', nullable: false },
              { name: 'content', type: 'JSONB', nullable: false }
            ],
            primaryKey: ['id'],
            foreignKeys: []
          }
        ],
        relationships: [],
        indexes: [],
        constraints: []
      };

      mockSchemaAnalyzer.analyzeJsonStructure.mockResolvedValue(mockSchema);
      mockMigrationStorage.storePlan.mockResolvedValue();

      // Execute
      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);

      // Verify
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.source).toEqual(mockFileSource);
      expect(plan.target).toEqual(mockDatabaseTarget);
      expect(plan.steps).toHaveLength(6); // Schema + 4 content types + validation
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.risks).toHaveLength(3); // Data loss, downtime, performance
      expect(plan.createdAt).toBeDefined();
      expect(plan.metadata).toBeDefined();

      // Verify schema analyzer was called
      expect(mockSchemaAnalyzer.analyzeJsonStructure).toHaveBeenCalledWith('./data');
      
      // Verify plan was stored
      expect(mockMigrationStorage.storePlan).toHaveBeenCalledWith(plan);
    });

    it('should handle schema analysis errors', async () => {
      // Setup mock to throw error
      mockSchemaAnalyzer.analyzeJsonStructure.mockRejectedValue(new Error('Schema analysis failed'));

      // Execute and verify error
      await expect(migrationManager.planMigration(mockFileSource, mockDatabaseTarget))
        .rejects.toThrow('Failed to create migration plan: Schema analysis failed');
    });

    it('should generate appropriate migration steps for file to database migration', async () => {
      // Setup mocks
      const mockSchema = { version: '1.0.0', tables: [], relationships: [], indexes: [], constraints: [] };
      mockSchemaAnalyzer.analyzeJsonStructure.mockResolvedValue(mockSchema);
      mockMigrationStorage.storePlan.mockResolvedValue();

      // Execute
      const plan = await migrationManager.planMigration(mockFileSource, mockDatabaseTarget);

      // Verify step types and dependencies
      const schemaStep = plan.steps.find(s => s.type === 'schema');
      const dataSteps = plan.steps.filter(s => s.type === 'data');
      const validationStep = plan.steps.find(s => s.type === 'validation');

      expect(schemaStep).toBeDefined();
      expect(dataSteps).toHaveLength(4); // pages, blocks, seo, settings
      expect(validationStep).toBeDefined();

      // Verify dependencies
      for (const dataStep of dataSteps) {
        expect(dataStep.dependencies).toContain(schemaStep!.id);
      }
      
      expect(validationStep!.dependencies).toEqual(dataSteps.map(s => s.id));
    });
  });

  describe('executeMigration', () => {
    const mockPlan: MigrationPlan = {
      id: 'plan-123',
      source: mockFileSource,
      target: mockDatabaseTarget,
      steps: [
        {
          id: 'step-1',
          type: 'schema',
          operation: 'create_schema',
          description: 'Create database schema',
          dependencies: [],
          estimatedDuration: 30000,
          rollbackOperation: 'drop_schema'
        },
        {
          id: 'step-2',
          type: 'data',
          operation: 'transfer_pages',
          description: 'Transfer pages data',
          dependencies: ['step-1'],
          estimatedDuration: 60000,
          rollbackOperation: 'delete_pages_data'
        }
      ],
      estimatedDuration: 90000,
      risks: [],
      createdAt: '2023-01-01T00:00:00Z',
      metadata: {
        totalItems: 100,
        totalSize: 1024000,
        dependencies: []
      }
    };

    it('should execute migration successfully', async () => {
      // Setup mocks
      mockMigrationStorage.storeRecord.mockResolvedValue();
      mockMigrationStorage.updateRecord.mockResolvedValue();

      // Mock validation to return success
      const mockValidation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        summary: { totalItems: 100, validItems: 100, invalidItems: 0, missingItems: 0 }
      };
      
      // Mock the validateMigration method
      vi.spyOn(migrationManager, 'validateMigration').mockResolvedValue(mockValidation);

      // Execute
      const result = await migrationManager.executeMigration(mockPlan);

      // Verify
      expect(result.status).toBe('success');
      expect(result.stepsExecuted).toBe(2);
      expect(result.stepsTotal).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.rollbackAvailable).toBe(true);
      expect(result.duration).toBeGreaterThan(0);

      // Verify storage interactions
      expect(mockMigrationStorage.storeRecord).toHaveBeenCalled();
      expect(mockMigrationStorage.updateRecord).toHaveBeenCalledTimes(3); // Progress updates + final
    });

    it('should handle step execution failures', async () => {
      // Setup mocks
      mockMigrationStorage.storeRecord.mockResolvedValue();
      mockMigrationStorage.updateRecord.mockResolvedValue();

      // Create a plan with a step that will fail
      const failingPlan = {
        ...mockPlan,
        steps: [
          {
            id: 'failing-step',
            type: 'data' as const,
            operation: 'transfer_invalid',
            description: 'This will fail',
            dependencies: [],
            estimatedDuration: 1000
          }
        ]
      };

      // Execute and expect failure
      await expect(migrationManager.executeMigration(failingPlan))
        .rejects.toThrow();

      // Verify error was recorded
      expect(mockMigrationStorage.updateRecord).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'failed'
        })
      );
    });

    it('should mark migration as partial when validation fails', async () => {
      // Setup mocks
      mockMigrationStorage.storeRecord.mockResolvedValue();
      mockMigrationStorage.updateRecord.mockResolvedValue();

      // Mock validation to return failure
      const mockValidation: ValidationResult = {
        valid: false,
        errors: [
          {
            type: 'data',
            item: 'test-item',
            message: 'Validation failed',
            severity: 'error'
          }
        ],
        warnings: [],
        summary: { totalItems: 100, validItems: 90, invalidItems: 10, missingItems: 0 }
      };
      
      vi.spyOn(migrationManager, 'validateMigration').mockResolvedValue(mockValidation);

      // Execute
      const result = await migrationManager.executeMigration(mockPlan);

      // Verify
      expect(result.status).toBe('partial');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('validation');
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback migration successfully', async () => {
      const migrationId = 'migration-123';
      const mockRecord = {
        id: migrationId,
        planId: 'plan-123',
        status: 'completed' as MigrationStatus,
        startTime: '2023-01-01T00:00:00Z',
        source: mockFileSource,
        target: mockDatabaseTarget,
        result: {
          rollbackAvailable: true
        } as any
      };

      const mockPlan: MigrationPlan = {
        id: 'plan-123',
        source: mockFileSource,
        target: mockDatabaseTarget,
        steps: [
          {
            id: 'step-1',
            type: 'schema',
            operation: 'create_schema',
            description: 'Create schema',
            dependencies: [],
            estimatedDuration: 30000,
            rollbackOperation: 'drop_schema'
          }
        ],
        estimatedDuration: 30000,
        risks: [],
        createdAt: '2023-01-01T00:00:00Z',
        metadata: { totalItems: 0, totalSize: 0, dependencies: [] }
      };

      // Setup mocks
      mockMigrationStorage.getRecord.mockResolvedValue(mockRecord);
      mockMigrationStorage.getPlan.mockResolvedValue(mockPlan);
      mockMigrationStorage.updateRecord.mockResolvedValue();

      // Execute
      await migrationManager.rollbackMigration(migrationId);

      // Verify
      expect(mockMigrationStorage.getRecord).toHaveBeenCalledWith(migrationId);
      expect(mockMigrationStorage.getPlan).toHaveBeenCalledWith('plan-123');
      expect(mockMigrationStorage.updateRecord).toHaveBeenCalledWith(
        migrationId,
        { status: 'rolled_back' }
      );
    });

    it('should throw error for non-existent migration', async () => {
      mockMigrationStorage.getRecord.mockResolvedValue(null);

      await expect(migrationManager.rollbackMigration('non-existent'))
        .rejects.toThrow('Migration record not found: non-existent');
    });

    it('should throw error for non-rollbackable migration', async () => {
      const mockRecord = {
        id: 'migration-123',
        planId: 'plan-123',
        status: 'completed' as MigrationStatus,
        startTime: '2023-01-01T00:00:00Z',
        source: mockFileSource,
        target: mockDatabaseTarget,
        result: {
          rollbackAvailable: false
        } as any
      };

      mockMigrationStorage.getRecord.mockResolvedValue(mockRecord);

      await expect(migrationManager.rollbackMigration('migration-123'))
        .rejects.toThrow('Migration migration-123 is not rollback-able');
    });
  });

  describe('validateMigration', () => {
    it('should validate database migration successfully', async () => {
      const migrationId = 'migration-123';
      const mockRecord = {
        id: migrationId,
        planId: 'plan-123',
        status: 'completed' as MigrationStatus,
        startTime: '2023-01-01T00:00:00Z',
        source: mockFileSource,
        target: mockDatabaseTarget
      };

      mockMigrationStorage.getRecord.mockResolvedValue(mockRecord);

      // Execute
      const result = await migrationManager.validateMigration(migrationId);

      // Verify
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(100);
      expect(result.summary.validItems).toBe(95);
    });

    it('should handle validation errors', async () => {
      const migrationId = 'migration-123';
      mockMigrationStorage.getRecord.mockRejectedValue(new Error('Storage error'));

      // Execute
      const result = await migrationManager.validateMigration(migrationId);

      // Verify
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Validation failed: Storage error');
    });

    it('should throw error for non-existent migration', async () => {
      mockMigrationStorage.getRecord.mockResolvedValue(null);

      await expect(migrationManager.validateMigration('non-existent'))
        .rejects.toThrow('Migration record not found: non-existent');
    });
  });

  describe('getMigrationHistory', () => {
    it('should return migration history', async () => {
      const mockRecords = [
        {
          id: 'migration-1',
          planId: 'plan-1',
          status: 'completed' as MigrationStatus,
          startTime: '2023-01-01T00:00:00Z',
          source: mockFileSource,
          target: mockDatabaseTarget
        },
        {
          id: 'migration-2',
          planId: 'plan-2',
          status: 'failed' as MigrationStatus,
          startTime: '2023-01-02T00:00:00Z',
          source: mockFileSource,
          target: mockDatabaseTarget
        }
      ];

      mockMigrationStorage.getAllRecords.mockResolvedValue(mockRecords);

      // Execute
      const history = await migrationManager.getMigrationHistory();

      // Verify
      expect(history).toEqual(mockRecords);
      expect(mockMigrationStorage.getAllRecords).toHaveBeenCalled();
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status', async () => {
      const migrationId = 'migration-123';
      const mockRecord = {
        id: migrationId,
        planId: 'plan-123',
        status: 'completed' as MigrationStatus,
        startTime: '2023-01-01T00:00:00Z',
        source: mockFileSource,
        target: mockDatabaseTarget
      };

      mockMigrationStorage.getRecord.mockResolvedValue(mockRecord);

      // Execute
      const status = await migrationManager.getMigrationStatus(migrationId);

      // Verify
      expect(status).toBe('completed');
    });

    it('should throw error for non-existent migration', async () => {
      mockMigrationStorage.getRecord.mockResolvedValue(null);

      await expect(migrationManager.getMigrationStatus('non-existent'))
        .rejects.toThrow('Migration record not found: non-existent');
    });
  });
});