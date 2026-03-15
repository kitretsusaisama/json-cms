/**
 * Audit Manager Tests
 */

import { AuditTrailManager, InMemoryAuditStorage } from '../audit-manager';
import { AuditEntry, AuditAction, AuditResult } from '../interfaces';

describe('AuditTrailManager', () => {
  let auditManager: AuditTrailManager;
  let storage: InMemoryAuditStorage;

  beforeEach(() => {
    storage = new InMemoryAuditStorage();
    auditManager = new AuditTrailManager(storage, {
      auditRetentionDays: 30
    });
  });

  describe('logAction', () => {
    test('should create audit entry with required fields', async () => {
      const entry = await auditManager.logAction(
        'create',
        'page',
        'page-123',
        'user-456',
        { contentVersion: 'v1' },
        'tenant-789'
      );

      expect(entry.id).toBeDefined();
      expect(entry.action).toBe('create');
      expect(entry.resourceType).toBe('page');
      expect(entry.resourceId).toBe('page-123');
      expect(entry.userId).toBe('user-456');
      expect(entry.tenantId).toBe('tenant-789');
      expect(entry.timestamp).toBeDefined();
      expect(entry.result).toBe('success');
      expect(entry.metadata.contentVersion).toBe('v1');
    });

    test('should generate correlation and request IDs', async () => {
      const entry = await auditManager.logAction(
        'update',
        'page',
        'page-123',
        'user-456'
      );

      expect(entry.correlationId).toBeDefined();
      expect(entry.metadata.requestId).toBeDefined();
    });

    test('should include request information when provided', async () => {
      const entry = await auditManager.logAction(
        'delete',
        'page',
        'page-123',
        'user-456',
        {},
        'tenant-789',
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          correlationId: 'custom-correlation-id'
        }
      );

      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0...');
      expect(entry.correlationId).toBe('custom-correlation-id');
    });
  });

  describe('getAuditTrail', () => {
    beforeEach(async () => {
      // Create sample audit entries
      await auditManager.logAction('create', 'page', 'page-123', 'user-1');
      await auditManager.logAction('update', 'page', 'page-123', 'user-2');
      await auditManager.logAction('delete', 'page', 'page-456', 'user-1');
    });

    test('should retrieve audit trail for specific resource', async () => {
      const trail = await auditManager.getAuditTrail('page-123');

      expect(trail).toHaveLength(2);
      expect(trail.every(entry => entry.resourceId === 'page-123')).toBe(true);
    });

    test('should support pagination in audit trail', async () => {
      const trail = await auditManager.getAuditTrail('page-123', {
        limit: 1,
        offset: 0
      });

      expect(trail).toHaveLength(1);
    });

    test('should support sorting in audit trail', async () => {
      const trail = await auditManager.getAuditTrail('page-123', {
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      expect(trail[0].action).toBe('update'); // Most recent first
      expect(trail[1].action).toBe('create');
    });
  });

  describe('searchAuditLogs', () => {
    beforeEach(async () => {
      // Create diverse audit entries
      await auditManager.logAction('create', 'page', 'page-1', 'user-1', {}, 'tenant-1');
      await auditManager.logAction('update', 'page', 'page-1', 'user-2', {}, 'tenant-1');
      await auditManager.logAction('create', 'block', 'block-1', 'user-1', {}, 'tenant-2');
      await auditManager.logAction('delete', 'page', 'page-2', 'user-3', {}, 'tenant-1');
    });

    test('should filter by tenant ID', async () => {
      const results = await auditManager.searchAuditLogs({
        tenantId: 'tenant-1'
      });

      expect(results).toHaveLength(3);
      expect(results.every(entry => entry.tenantId === 'tenant-1')).toBe(true);
    });

    test('should filter by user ID', async () => {
      const results = await auditManager.searchAuditLogs({
        userId: 'user-1'
      });

      expect(results).toHaveLength(2);
      expect(results.every(entry => entry.userId === 'user-1')).toBe(true);
    });

    test('should filter by actions', async () => {
      const results = await auditManager.searchAuditLogs({
        actions: ['create', 'delete']
      });

      expect(results).toHaveLength(3);
      expect(results.every(entry => ['create', 'delete'].includes(entry.action))).toBe(true);
    });

    test('should filter by resource types', async () => {
      const results = await auditManager.searchAuditLogs({
        resourceTypes: ['page']
      });

      expect(results).toHaveLength(3);
      expect(results.every(entry => entry.resourceType === 'page')).toBe(true);
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const results = await auditManager.searchAuditLogs({
        dateRange: {
          start: oneHourAgo.toISOString(),
          end: oneHourFromNow.toISOString()
        }
      });

      expect(results).toHaveLength(4); // All entries should be within range
    });

    test('should support pagination', async () => {
      const results = await auditManager.searchAuditLogs({
        limit: 2,
        offset: 1
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      // Create audit entries with different characteristics
      await auditManager.logAction('create', 'page', 'page-1', 'user-1', {}, 'tenant-1');
      await auditManager.logAction('update', 'page', 'page-1', 'user-1', {}, 'tenant-1');
      await auditManager.logAction('delete', 'page', 'page-2', 'user-2', {}, 'tenant-1');
      await auditManager.logAction('create', 'page', 'page-3', 'user-3', {}, 'tenant-1');

      // Simulate a failed action
      const failedEntry = await auditManager.logAction('update', 'page', 'page-1', 'user-1', {}, 'tenant-1');
      await auditManager.updateAuditResult(failedEntry.id, 'failure', 'Unauthorized access');
    });

    test('should generate comprehensive compliance report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const report = await auditManager.generateComplianceReport(
        'tenant-1',
        startDate,
        endDate
      );

      expect(report.tenantId).toBe('tenant-1');
      expect(report.summary.totalActions).toBe(5);
      expect(report.summary.uniqueUsers).toBe(3);
      expect(report.summary.contentChanges).toBe(5); // All actions are content changes
      expect(report.breakdown.failureRate).toBeGreaterThan(0);
    });

    test('should detect violations in compliance report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const report = await auditManager.generateComplianceReport(
        'tenant-1',
        startDate,
        endDate
      );

      expect(report.violations).toBeDefined();
      expect(report.violations!.length).toBeGreaterThan(0);
      
      const unauthorizedViolation = report.violations!.find(v => v.type === 'unauthorized_access');
      expect(unauthorizedViolation).toBeDefined();
    });

    test('should provide recommendations in compliance report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const report = await auditManager.generateComplianceReport(
        'tenant-1',
        startDate,
        endDate
      );

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations!.length).toBeGreaterThan(0);
    });
  });

  describe('exportAuditLogs', () => {
    beforeEach(async () => {
      await auditManager.logAction('create', 'page', 'page-1', 'user-1');
      await auditManager.logAction('update', 'page', 'page-1', 'user-2');
    });

    test('should export audit logs as JSON', async () => {
      const buffer = await auditManager.exportAuditLogs({}, 'json');
      const data = JSON.parse(buffer.toString());

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('action');
    });

    test('should export audit logs as CSV', async () => {
      const buffer = await auditManager.exportAuditLogs({}, 'csv');
      const csvContent = buffer.toString();

      expect(csvContent).toContain('ID,Timestamp,User ID');
      expect(csvContent.split('\n').length).toBeGreaterThan(2); // Header + data rows
    });

    test('should throw error for unsupported format', async () => {
      await expect(
        auditManager.exportAuditLogs({}, 'xml' as any)
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('updateAuditResult', () => {
    test('should update audit entry result', async () => {
      const entry = await auditManager.logAction('update', 'page', 'page-1', 'user-1');

      await auditManager.updateAuditResult(entry.id, 'failure', 'Validation error');

      const trail = await auditManager.getAuditTrail('page-1');
      const updatedEntry = trail.find(e => e.id === entry.id);

      expect(updatedEntry!.result).toBe('failure');
    });
  });

  describe('InMemoryAuditStorage', () => {
    test('should save and retrieve audit entries', async () => {
      const entry: AuditEntry = {
        id: 'audit-1',
        correlationId: 'corr-1',
        userId: 'user-1',
        action: 'create',
        resourceType: 'page',
        resourceId: 'page-1',
        timestamp: new Date().toISOString(),
        metadata: {},
        result: 'success'
      };

      await storage.saveAuditEntry(entry);

      const retrieved = await storage.getAuditEntries({
        resourceIds: ['page-1']
      });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(entry);
    });

    test('should filter audit entries by criteria', async () => {
      const entries: AuditEntry[] = [
        {
          id: 'audit-1',
          correlationId: 'corr-1',
          userId: 'user-1',
          action: 'create',
          resourceType: 'page',
          resourceId: 'page-1',
          timestamp: '2024-01-01T00:00:00Z',
          metadata: {},
          result: 'success',
          tenantId: 'tenant-1'
        },
        {
          id: 'audit-2',
          correlationId: 'corr-2',
          userId: 'user-2',
          action: 'update',
          resourceType: 'page',
          resourceId: 'page-2',
          timestamp: '2024-01-02T00:00:00Z',
          metadata: {},
          result: 'failure',
          tenantId: 'tenant-2'
        }
      ];

      for (const entry of entries) {
        await storage.saveAuditEntry(entry);
      }

      // Filter by tenant
      const tenant1Entries = await storage.getAuditEntries({
        tenantId: 'tenant-1'
      });
      expect(tenant1Entries).toHaveLength(1);

      // Filter by result
      const failedEntries = await storage.getAuditEntries({
        result: ['failure']
      });
      expect(failedEntries).toHaveLength(1);

      // Filter by date range
      const dateFilteredEntries = await storage.getAuditEntries({
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z'
        }
      });
      expect(dateFilteredEntries).toHaveLength(1);
    });

    test('should delete old audit entries', async () => {
      const oldEntry: AuditEntry = {
        id: 'audit-old',
        correlationId: 'corr-old',
        userId: 'user-1',
        action: 'create',
        resourceType: 'page',
        resourceId: 'page-1',
        timestamp: '2020-01-01T00:00:00Z',
        metadata: {},
        result: 'success'
      };

      const newEntry: AuditEntry = {
        id: 'audit-new',
        correlationId: 'corr-new',
        userId: 'user-1',
        action: 'create',
        resourceType: 'page',
        resourceId: 'page-2',
        timestamp: new Date().toISOString(),
        metadata: {},
        result: 'success'
      };

      await storage.saveAuditEntry(oldEntry);
      await storage.saveAuditEntry(newEntry);

      await storage.deleteOldAuditEntries('2021-01-01T00:00:00Z');

      const remaining = await storage.getAuditEntries({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('audit-new');
    });
  });
});