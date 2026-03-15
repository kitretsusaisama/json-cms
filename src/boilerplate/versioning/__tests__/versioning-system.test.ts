/**
 * Versioning System Integration Tests
 */

import { ContentVersioningSystem } from '../versioning-system';
import { VersioningConfig } from '../interfaces';

describe('ContentVersioningSystem', () => {
  let versioningSystem: ContentVersioningSystem;

  beforeEach(() => {
    const config: Partial<VersioningConfig> = {
      maxVersionsPerContent: 10,
      approvalRequired: false,
      defaultApprovers: ['admin@example.com']
    };

    versioningSystem = new ContentVersioningSystem(
      undefined, // Use in-memory storage
      undefined,
      undefined,
      config
    );
  });

  describe('createContentVersion', () => {
    test('should create version with audit trail', async () => {
      const result = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page', content: 'Page content' },
        'user-456',
        {
          title: 'Initial page creation',
          description: 'Created new page',
          tenantId: 'tenant-789'
        }
      );

      expect(result.version).toBeDefined();
      expect(result.auditEntry).toBeDefined();
      expect(result.workflow).toBeUndefined(); // No approval required

      expect(result.version.contentId).toBe('page-123');
      expect(result.version.version).toBe(1);
      expect(result.version.createdBy).toBe('user-456');
      expect(result.version.tenantId).toBe('tenant-789');

      expect(result.auditEntry.action).toBe('create');
      expect(result.auditEntry.resourceId).toBe('page-123');
      expect(result.auditEntry.userId).toBe('user-456');
      expect(result.auditEntry.tenantId).toBe('tenant-789');
    });

    test('should create approval workflow when required', async () => {
      const result = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456',
        {
          requireApproval: true,
          approvers: ['editor@example.com', 'admin@example.com']
        }
      );

      expect(result.workflow).toBeDefined();
      expect(result.workflow!.approvers).toHaveLength(2);
      expect(result.workflow!.status).toBe('pending');
    });

    test('should use default approvers when approval required but no approvers specified', async () => {
      // Create system with approval required
      const systemWithApproval = new ContentVersioningSystem(
        undefined,
        undefined,
        undefined,
        { approvalRequired: true, defaultApprovers: ['admin@example.com'] }
      );

      const result = await systemWithApproval.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456'
      );

      expect(result.workflow).toBeDefined();
      expect(result.workflow!.approvers).toHaveLength(1);
      expect(result.workflow!.approvers[0].approverId).toBe('admin@example.com');
    });
  });

  describe('updateContent', () => {
    test('should create new version for content update', async () => {
      // Create initial version
      await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Original Title' },
        'user-456'
      );

      // Update content
      const result = await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Updated Title' },
        'user-456',
        {
          title: 'Updated page title',
          changeReason: 'Title improvement'
        }
      );

      expect(result.version.version).toBe(2);
      expect(result.version.metadata.changeType).toBe('update');
      expect(result.version.metadata.diff).toBeDefined();
      expect(result.auditEntry.action).toBe('create'); // Creates new version
    });
  });

  describe('rollbackContent', () => {
    test('should rollback to previous version', async () => {
      // Create initial version
      const v1 = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Version 1' },
        'user-456'
      );

      // Create second version
      await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Version 2' },
        'user-456'
      );

      // Rollback to first version
      const result = await versioningSystem.rollbackContent(
        'page-123',
        v1.version.id,
        'user-456',
        'Reverting problematic changes',
        'tenant-789'
      );

      expect(result.version.version).toBe(3); // New version created
      expect(result.version.content).toEqual(v1.version.content);
      expect(result.version.metadata.changeType).toBe('rollback');
      expect(result.auditEntry.action).toBe('rollback');
    });
  });

  describe('publishContent', () => {
    test('should publish content without approval when not required', async () => {
      const created = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456'
      );

      const result = await versioningSystem.publishContent(
        created.version.id,
        'user-456',
        'tenant-789'
      );

      expect(result.auditEntry.action).toBe('publish');
    });

    test('should require approval before publishing when configured', async () => {
      // Create system with approval required
      const systemWithApproval = new ContentVersioningSystem(
        undefined,
        undefined,
        undefined,
        { approvalRequired: true, defaultApprovers: ['admin@example.com'] }
      );

      const created = await systemWithApproval.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456'
      );

      // Try to publish without approval
      await expect(
        systemWithApproval.publishContent(created.version.id, 'user-456')
      ).rejects.toThrow('Content must be approved before publishing');
    });

    test('should allow publishing after approval', async () => {
      // Create system with approval required
      const systemWithApproval = new ContentVersioningSystem(
        undefined,
        undefined,
        undefined,
        { approvalRequired: true, defaultApprovers: ['admin@example.com'] }
      );

      const created = await systemWithApproval.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456'
      );

      // Approve the workflow
      await systemWithApproval.approveWorkflowStep(
        created.workflow!.id,
        created.workflow!.approvers[0].id,
        'admin@example.com',
        'Approved for publication'
      );

      // Now publishing should work
      const result = await systemWithApproval.publishContent(
        created.version.id,
        'user-456'
      );

      expect(result.auditEntry.action).toBe('publish');
    });
  });

  describe('getContentHistory', () => {
    beforeEach(async () => {
      // Create multiple versions
      await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Version 1' },
        'user-456'
      );

      await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Version 2' },
        'user-456'
      );

      await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Version 3' },
        'user-456'
      );
    });

    test('should retrieve version history', async () => {
      const history = await versioningSystem.getContentHistory('page-123');

      expect(history.versions).toHaveLength(3);
      expect(history.versions[0].version).toBe(3); // Most recent first
      expect(history.versions[1].version).toBe(2);
      expect(history.versions[2].version).toBe(1);
    });

    test('should include audit trail when requested', async () => {
      const history = await versioningSystem.getContentHistory('page-123', {
        includeAuditTrail: true
      });

      expect(history.auditTrail).toBeDefined();
      expect(history.auditTrail!.length).toBeGreaterThan(0);
    });

    test('should support pagination', async () => {
      const history = await versioningSystem.getContentHistory('page-123', {
        limit: 2,
        offset: 1
      });

      expect(history.versions).toHaveLength(2);
      expect(history.versions[0].version).toBe(2);
      expect(history.versions[1].version).toBe(1);
    });
  });

  describe('compareVersions', () => {
    test('should compare two versions and log audit entry', async () => {
      const v1 = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Original', content: 'Original content' },
        'user-456'
      );

      const v2 = await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Updated', content: 'Updated content' },
        'user-456'
      );

      const diff = await versioningSystem.compareVersions(
        v1.version.id,
        v2.version.id,
        'user-456',
        'tenant-789'
      );

      expect(diff.summary.totalChanges).toBeGreaterThan(0);
      expect(diff.modified.length).toBeGreaterThan(0);
    });
  });

  describe('approval workflow integration', () => {
    test('should handle complete approval workflow', async () => {
      // Create content with approval required
      const created = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456',
        {
          requireApproval: true,
          approvers: ['editor@example.com', 'admin@example.com']
        }
      );

      expect(created.workflow).toBeDefined();
      expect(created.workflow!.status).toBe('pending');

      // First approval
      const firstApproval = await versioningSystem.approveWorkflowStep(
        created.workflow!.id,
        created.workflow!.approvers[0].id,
        'editor@example.com',
        'Editor approval'
      );

      expect(firstApproval.workflow.currentStep).toBe(2);
      expect(firstApproval.auditEntry.action).toBe('approve');

      // Second approval
      const secondApproval = await versioningSystem.approveWorkflowStep(
        created.workflow!.id,
        created.workflow!.approvers[1].id,
        'admin@example.com',
        'Admin approval'
      );

      expect(secondApproval.workflow.status).toBe('approved');
    });

    test('should handle workflow rejection', async () => {
      const created = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456',
        {
          requireApproval: true,
          approvers: ['editor@example.com']
        }
      );

      const rejection = await versioningSystem.rejectWorkflowStep(
        created.workflow!.id,
        created.workflow!.approvers[0].id,
        'editor@example.com',
        'Content needs major revisions'
      );

      expect(rejection.workflow.status).toBe('rejected');
      expect(rejection.auditEntry.action).toBe('reject');
    });
  });

  describe('getPendingApprovals', () => {
    test('should get pending approvals for user', async () => {
      // Create content requiring approval
      await versioningSystem.createContentVersion(
        'page-1',
        'page',
        { title: 'Page 1' },
        'author@example.com',
        {
          requireApproval: true,
          approvers: ['editor@example.com']
        }
      );

      await versioningSystem.createContentVersion(
        'page-2',
        'page',
        { title: 'Page 2' },
        'author@example.com',
        {
          requireApproval: true,
          approvers: ['editor@example.com', 'admin@example.com']
        }
      );

      const pendingApprovals = await versioningSystem.getPendingApprovals(
        'editor@example.com'
      );

      expect(pendingApprovals).toHaveLength(2);
      expect(pendingApprovals.every(w => w.status === 'pending')).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    test('should generate compliance report with audit data', async () => {
      // Create some content and perform various operations
      const created = await versioningSystem.createContentVersion(
        'page-123',
        'page',
        { title: 'Test Page' },
        'user-456',
        { tenantId: 'tenant-789' }
      );

      await versioningSystem.updateContent(
        'page-123',
        'page',
        { title: 'Updated Page' },
        'user-456',
        { tenantId: 'tenant-789' }
      );

      await versioningSystem.publishContent(
        created.version.id,
        'user-456',
        'tenant-789'
      );

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const report = await versioningSystem.generateComplianceReport(
        'tenant-789',
        startDate,
        endDate,
        'admin-user'
      );

      expect(report.tenantId).toBe('tenant-789');
      expect(report.summary.totalActions).toBeGreaterThan(0);
      expect(report.summary.contentChanges).toBeGreaterThan(0);
      expect(report.breakdown).toBeDefined();
    });
  });

  describe('configuration management', () => {
    test('should get current configuration', () => {
      const config = versioningSystem.getConfiguration();

      expect(config.maxVersionsPerContent).toBe(10);
      expect(config.approvalRequired).toBe(false);
      expect(config.defaultApprovers).toEqual(['admin@example.com']);
    });

    test('should update configuration', () => {
      versioningSystem.updateConfiguration({
        maxVersionsPerContent: 20,
        approvalRequired: true
      });

      const config = versioningSystem.getConfiguration();

      expect(config.maxVersionsPerContent).toBe(20);
      expect(config.approvalRequired).toBe(true);
      expect(config.defaultApprovers).toEqual(['admin@example.com']); // Unchanged
    });
  });

  describe('error handling', () => {
    test('should handle non-existent version in rollback', async () => {
      await expect(
        versioningSystem.rollbackContent(
          'page-123',
          'non-existent-version',
          'user-456',
          'Invalid rollback'
        )
      ).rejects.toThrow('Version non-existent-version not found');
    });

    test('should handle non-existent version in restore', async () => {
      await expect(
        versioningSystem.restoreContent('non-existent-version', 'user-456')
      ).rejects.toThrow('Version non-existent-version not found');
    });

    test('should handle non-existent version in publish', async () => {
      await expect(
        versioningSystem.publishContent('non-existent-version', 'user-456')
      ).rejects.toThrow('Version non-existent-version not found');
    });
  });
});