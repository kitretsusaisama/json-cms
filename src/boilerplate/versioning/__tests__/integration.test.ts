/**
 * Versioning System Integration Tests
 * 
 * Tests the complete integration of versioning, audit, and approval systems
 */

import { createVersioningSystem } from '../index';
import { ContentVersioningSystem } from '../versioning-system';

describe('Versioning System Integration', () => {
  let system: ContentVersioningSystem;

  beforeEach(() => {
    system = createVersioningSystem({
      maxVersionsPerContent: 5,
      approvalRequired: true,
      defaultApprovers: ['admin@example.com'],
      auditRetentionDays: 30
    });
  });

  describe('Complete Content Lifecycle', () => {
    test('should handle complete content lifecycle with approvals', async () => {
      // 1. Create initial content version
      const created = await system.createContentVersion(
        'article-123',
        'article',
        {
          title: 'My First Article',
          content: 'This is the initial content of my article.',
          author: 'john.doe@example.com',
          tags: ['tech', 'javascript']
        },
        'john.doe@example.com',
        {
          title: 'Initial article draft',
          description: 'Created first draft of the article',
          tenantId: 'company-abc',
          approvers: ['editor@example.com', 'admin@example.com']
        }
      );

      expect(created.version.version).toBe(1);
      expect(created.workflow).toBeDefined();
      expect(created.workflow!.status).toBe('pending');
      expect(created.auditEntry.action).toBe('create');

      // 2. Editor reviews and requests changes
      const changesRequested = await system.rejectWorkflowStep(
        created.workflow!.id,
        created.workflow!.approvers[0].id,
        'editor@example.com',
        'Please add more technical details and fix grammar issues.'
      );

      expect(changesRequested.workflow.status).toBe('rejected');

      // 3. Author makes revisions
      const revised = await system.updateContent(
        'article-123',
        'article',
        {
          title: 'My First Article - Revised',
          content: 'This is the revised content with more technical details and improved grammar.',
          author: 'john.doe@example.com',
          tags: ['tech', 'javascript', 'tutorial']
        },
        'john.doe@example.com',
        {
          title: 'Revised article based on editor feedback',
          description: 'Added technical details and fixed grammar',
          tenantId: 'company-abc',
          approvers: ['editor@example.com', 'admin@example.com']
        }
      );

      expect(revised.version.version).toBe(2);
      expect(revised.workflow).toBeDefined();

      // 4. Editor approves the revision
      const editorApproval = await system.approveWorkflowStep(
        revised.workflow!.id,
        revised.workflow!.approvers[0].id,
        'editor@example.com',
        'Much better! The technical details are clear and grammar is fixed.'
      );

      expect(editorApproval.workflow.currentStep).toBe(2);
      expect(editorApproval.workflow.status).toBe('pending');

      // 5. Admin approves for publication
      const adminApproval = await system.approveWorkflowStep(
        revised.workflow!.id,
        revised.workflow!.approvers[1].id,
        'admin@example.com',
        'Approved for publication. Great work!'
      );

      expect(adminApproval.workflow.status).toBe('approved');

      // 6. Publish the content
      const published = await system.publishContent(
        revised.version.id,
        'john.doe@example.com',
        'company-abc'
      );

      expect(published.auditEntry.action).toBe('publish');

      // 7. Get complete content history
      const history = await system.getContentHistory('article-123', {
        includeAuditTrail: true,
        includeWorkflows: true
      });

      expect(history.versions).toHaveLength(2);
      expect(history.auditTrail).toBeDefined();
      expect(history.auditTrail!.length).toBeGreaterThan(0);
      expect(history.workflows).toBeDefined();
      expect(history.workflows!.length).toBe(2);

      // 8. Generate compliance report
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const report = await system.generateComplianceReport(
        'company-abc',
        startDate,
        endDate,
        'admin@example.com'
      );

      expect(report.summary.totalActions).toBeGreaterThan(0);
      expect(report.summary.approvalWorkflows).toBe(2);
      expect(report.breakdown.actionsByType).toBeDefined();
    });

    test('should handle content rollback scenario', async () => {
      // Create initial version
      const v1 = await system.createContentVersion(
        'page-456',
        'page',
        { title: 'Original Page', content: 'Original content' },
        'author@example.com',
        { tenantId: 'company-xyz' }
      );

      // Approve and publish
      await system.approveWorkflowStep(
        v1.workflow!.id,
        v1.workflow!.approvers[0].id,
        'admin@example.com',
        'Initial approval'
      );
      await system.publishContent(v1.version.id, 'author@example.com');

      // Create problematic version
      const v2 = await system.updateContent(
        'page-456',
        'page',
        { title: 'Broken Page', content: 'This content has issues' },
        'author@example.com',
        { tenantId: 'company-xyz' }
      );

      // Approve and publish problematic version
      await system.approveWorkflowStep(
        v2.workflow!.id,
        v2.workflow!.approvers[0].id,
        'admin@example.com',
        'Approved'
      );
      await system.publishContent(v2.version.id, 'author@example.com');

      // Rollback to original version
      const rollback = await system.rollbackContent(
        'page-456',
        v1.version.id,
        'admin@example.com',
        'Rolling back due to reported issues with v2',
        'company-xyz'
      );

      expect(rollback.version.version).toBe(3);
      expect(rollback.version.content).toEqual(v1.version.content);
      expect(rollback.auditEntry.action).toBe('rollback');

      // Verify audit trail shows the rollback
      const auditTrail = await system.getContentHistory('page-456', {
        includeAuditTrail: true
      });

      const rollbackAudit = auditTrail.auditTrail!.find(
        entry => entry.action === 'rollback'
      );
      expect(rollbackAudit).toBeDefined();
      expect(rollbackAudit!.metadata.previousVersion).toBe(v1.version.id);
    });

    test('should handle multi-tenant isolation', async () => {
      // Create content for tenant A
      const tenantAContent = await system.createContentVersion(
        'shared-id-123',
        'page',
        { title: 'Tenant A Page' },
        'user-a@example.com',
        { tenantId: 'tenant-a' }
      );

      // Create content for tenant B with same ID
      const tenantBContent = await system.createContentVersion(
        'shared-id-123',
        'page',
        { title: 'Tenant B Page' },
        'user-b@example.com',
        { tenantId: 'tenant-b' }
      );

      // Both should be created successfully (different tenants)
      expect(tenantAContent.version.tenantId).toBe('tenant-a');
      expect(tenantBContent.version.tenantId).toBe('tenant-b');

      // Generate compliance reports for each tenant
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const reportA = await system.generateComplianceReport(
        'tenant-a',
        startDate,
        endDate,
        'admin-a@example.com'
      );

      const reportB = await system.generateComplianceReport(
        'tenant-b',
        startDate,
        endDate,
        'admin-b@example.com'
      );

      // Each tenant should only see their own data
      expect(reportA.tenantId).toBe('tenant-a');
      expect(reportB.tenantId).toBe('tenant-b');
      expect(reportA.summary.totalActions).toBeGreaterThan(0);
      expect(reportB.summary.totalActions).toBeGreaterThan(0);
    });

    test('should handle version comparison and diff analysis', async () => {
      // Create initial version
      const v1 = await system.createContentVersion(
        'document-789',
        'document',
        {
          title: 'Technical Specification',
          sections: [
            { name: 'Introduction', content: 'This document describes...' },
            { name: 'Requirements', content: 'The system must...' }
          ],
          version: '1.0',
          lastModified: '2024-01-01'
        },
        'tech.writer@example.com'
      );

      // Create updated version
      const v2 = await system.updateContent(
        'document-789',
        'document',
        {
          title: 'Technical Specification - Updated',
          sections: [
            { name: 'Introduction', content: 'This document describes the updated system...' },
            { name: 'Requirements', content: 'The system must...' },
            { name: 'Architecture', content: 'The system architecture includes...' }
          ],
          version: '1.1',
          lastModified: '2024-01-15'
        },
        'tech.writer@example.com'
      );

      // Compare versions
      const diff = await system.compareVersions(
        v1.version.id,
        v2.version.id,
        'reviewer@example.com'
      );

      expect(diff.summary.totalChanges).toBeGreaterThan(0);
      expect(diff.added.length).toBeGreaterThan(0); // New architecture section
      expect(diff.modified.length).toBeGreaterThan(0); // Modified title and introduction

      // Verify comparison was audited
      const auditTrail = await system.getContentHistory('document-789', {
        includeAuditTrail: true
      });

      const comparisonAudit = auditTrail.auditTrail!.find(
        entry => entry.action === 'read' && 
        entry.resourceType === 'version_comparison'
      );
      expect(comparisonAudit).toBeDefined();
    });

    test('should handle approval workflow escalation', async () => {
      // Create content with deadline
      const created = await system.createContentVersion(
        'urgent-content',
        'announcement',
        { title: 'Urgent Announcement', content: 'This is urgent!' },
        'author@example.com',
        {
          approvers: ['manager@example.com'],
          metadata: {
            deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            priority: 'urgent'
          }
        }
      );

      // Simulate workflow escalation (in real scenario, this would be triggered by a scheduler)
      const escalated = await system.approvalManager.escalateWorkflow(
        created.workflow!.id,
        'system@example.com',
        'Workflow overdue - escalating to senior management'
      );

      expect(escalated.metadata.escalated).toBe(true);
      expect(escalated.metadata.escalationReason).toContain('overdue');
    });

    test('should handle bulk operations and performance', async () => {
      const contentIds: string[] = [];
      const startTime = Date.now();

      // Create multiple content versions
      for (let i = 1; i <= 10; i++) {
        const contentId = `bulk-content-${i}`;
        contentIds.push(contentId);

        await system.createContentVersion(
          contentId,
          'article',
          {
            title: `Article ${i}`,
            content: `Content for article ${i}`,
            index: i
          },
          'bulk.author@example.com',
          {
            title: `Bulk creation ${i}`,
            tenantId: 'bulk-tenant'
          }
        );
      }

      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Generate compliance report for bulk operations
      const startDate = new Date(startTime).toISOString();
      const endDate = new Date().toISOString();

      const report = await system.generateComplianceReport(
        'bulk-tenant',
        startDate,
        endDate,
        'admin@example.com'
      );

      expect(report.summary.totalActions).toBe(10); // One create action per content
      expect(report.summary.contentChanges).toBe(10);
      expect(report.breakdown.actionsByUser['bulk.author@example.com']).toBe(10);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle concurrent version creation', async () => {
      const contentId = 'concurrent-test';

      // Simulate concurrent version creation
      const promises = [
        system.createContentVersion(
          contentId,
          'page',
          { title: 'Version A', user: 'user-a' },
          'user-a@example.com'
        ),
        system.createContentVersion(
          contentId,
          'page',
          { title: 'Version B', user: 'user-b' },
          'user-b@example.com'
        )
      ];

      const results = await Promise.all(promises);

      // Both should succeed with different version numbers
      expect(results[0].version.version).not.toBe(results[1].version.version);
      expect(results[0].version.contentId).toBe(contentId);
      expect(results[1].version.contentId).toBe(contentId);
    });

    test('should handle invalid approval attempts', async () => {
      const created = await system.createContentVersion(
        'test-content',
        'page',
        { title: 'Test Page' },
        'author@example.com',
        { approvers: ['approver@example.com'] }
      );

      // Try to approve with wrong user
      await expect(
        system.approveWorkflowStep(
          created.workflow!.id,
          created.workflow!.approvers[0].id,
          'wrong.user@example.com',
          'Unauthorized approval'
        )
      ).rejects.toThrow('User is not authorized to approve this step');

      // Try to approve non-existent workflow
      await expect(
        system.approveWorkflowStep(
          'non-existent-workflow',
          'step-id',
          'approver@example.com',
          'Invalid workflow'
        )
      ).rejects.toThrow('Workflow non-existent-workflow not found');
    });

    test('should maintain data integrity during failures', async () => {
      const created = await system.createContentVersion(
        'integrity-test',
        'page',
        { title: 'Original' },
        'author@example.com'
      );

      // Simulate failure during update (by trying to rollback to non-existent version)
      await expect(
        system.rollbackContent(
          'integrity-test',
          'non-existent-version',
          'author@example.com',
          'Invalid rollback'
        )
      ).rejects.toThrow();

      // Verify original version is still intact
      const history = await system.getContentHistory('integrity-test');
      expect(history.versions).toHaveLength(1);
      expect(history.versions[0].id).toBe(created.version.id);
    });
  });

  describe('Configuration and Customization', () => {
    test('should respect version limits and cleanup', async () => {
      const systemWithLimits = createVersioningSystem({
        maxVersionsPerContent: 3,
        autoCleanupEnabled: true
      });

      const contentId = 'cleanup-test';

      // Create more versions than the limit
      for (let i = 1; i <= 5; i++) {
        await systemWithLimits.createContentVersion(
          contentId,
          'page',
          { title: `Version ${i}`, iteration: i },
          'author@example.com'
        );
      }

      // Should only keep the configured maximum
      const history = await systemWithLimits.getContentHistory(contentId);
      expect(history.versions.length).toBeLessThanOrEqual(3);

      // Most recent versions should be kept
      const versions = history.versions.sort((a, b) => b.version - a.version);
      expect(versions[0].version).toBe(5);
      expect(versions[1].version).toBe(4);
      expect(versions[2].version).toBe(3);
    });

    test('should handle custom approval workflows', async () => {
      const customSystem = createVersioningSystem({
        approvalRequired: true,
        defaultApprovers: ['level1@example.com', 'level2@example.com', 'level3@example.com']
      });

      const created = await customSystem.createContentVersion(
        'multi-level-approval',
        'policy',
        { title: 'Company Policy Update' },
        'policy.author@example.com'
      );

      expect(created.workflow!.approvers).toHaveLength(3);

      // Go through multi-level approval
      for (let i = 0; i < 3; i++) {
        const approver = created.workflow!.approvers[i];
        await customSystem.approveWorkflowStep(
          created.workflow!.id,
          approver.id,
          approver.approverId,
          `Level ${i + 1} approval`
        );
      }

      const finalWorkflow = await customSystem.approvalManager.getWorkflow(
        created.workflow!.id
      );
      expect(finalWorkflow!.status).toBe('approved');
    });
  });
});