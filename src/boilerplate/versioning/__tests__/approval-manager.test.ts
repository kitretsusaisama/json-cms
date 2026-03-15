/**
 * Approval Manager Tests
 */

import { WorkflowApprovalManager, InMemoryApprovalStorage } from '../approval-manager';
import { ApprovalWorkflow, ApprovalStatus } from '../interfaces';

describe('WorkflowApprovalManager', () => {
  let approvalManager: WorkflowApprovalManager;
  let storage: InMemoryApprovalStorage;

  beforeEach(() => {
    storage = new InMemoryApprovalStorage();
    approvalManager = new WorkflowApprovalManager(storage, {
      approvalRequired: true,
      defaultApprovers: ['admin@example.com']
    });
  });

  describe('createWorkflow', () => {
    test('should create workflow with specified approvers', async () => {
      const workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com', 'admin@example.com'],
        {
          title: 'Review new page',
          priority: 'high'
        }
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.contentId).toBe('content-1');
      expect(workflow.contentType).toBe('page');
      expect(workflow.versionId).toBe('version-1');
      expect(workflow.requestedBy).toBe('author@example.com');
      expect(workflow.status).toBe('pending');
      expect(workflow.currentStep).toBe(1);
      expect(workflow.approvers).toHaveLength(2);
      expect(workflow.metadata.priority).toBe('high');
    });

    test('should use default approvers when none specified', async () => {
      const workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        []
      );

      expect(workflow.approvers).toHaveLength(1);
      expect(workflow.approvers[0].approverId).toBe('admin@example.com');
    });

    test('should throw error when no approvers available', async () => {
      const managerWithoutDefaults = new WorkflowApprovalManager(storage, {
        defaultApprovers: []
      });

      await expect(
        managerWithoutDefaults.createWorkflow(
          'content-1',
          'page',
          'version-1',
          'author@example.com',
          []
        )
      ).rejects.toThrow('No approvers specified and no default approvers configured');
    });

    test('should set up approval steps correctly', async () => {
      const workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com', 'admin@example.com']
      );

      expect(workflow.approvers[0].stepNumber).toBe(1);
      expect(workflow.approvers[0].status).toBe('pending');
      expect(workflow.approvers[1].stepNumber).toBe(2);
      expect(workflow.approvers[1].status).toBe('pending');
    });
  });

  describe('approveStep', () => {
    let workflow: ApprovalWorkflow;

    beforeEach(async () => {
      workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com', 'admin@example.com']
      );
    });

    test('should approve current step and move to next', async () => {
      const updatedWorkflow = await approvalManager.approveStep(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'Looks good!'
      );

      expect(updatedWorkflow.currentStep).toBe(2);
      expect(updatedWorkflow.approvers[0].status).toBe('approved');
      expect(updatedWorkflow.approvers[0].comments).toBe('Looks good!');
      expect(updatedWorkflow.approvers[0].decision).toBe('approve');
      expect(updatedWorkflow.approvers[1].status).toBe('pending');
      expect(updatedWorkflow.status).toBe('pending');
    });

    test('should complete workflow when all steps approved', async () => {
      // Approve first step
      await approvalManager.approveStep(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'Editor approval'
      );

      // Approve second step
      const finalWorkflow = await approvalManager.approveStep(
        workflow.id,
        workflow.approvers[1].id,
        'admin@example.com',
        'Admin approval'
      );

      expect(finalWorkflow.status).toBe('approved');
      expect(finalWorkflow.completedAt).toBeDefined();
      expect(finalWorkflow.approvers[1].status).toBe('approved');
    });

    test('should throw error for unauthorized approver', async () => {
      await expect(
        approvalManager.approveStep(
          workflow.id,
          workflow.approvers[0].id,
          'unauthorized@example.com',
          'Unauthorized approval'
        )
      ).rejects.toThrow('User is not authorized to approve this step');
    });

    test('should throw error for non-existent workflow', async () => {
      await expect(
        approvalManager.approveStep(
          'non-existent',
          'step-id',
          'editor@example.com',
          'Comment'
        )
      ).rejects.toThrow('Workflow non-existent not found');
    });

    test('should throw error for already processed step', async () => {
      // Approve the step first
      await approvalManager.approveStep(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'First approval'
      );

      // Try to approve again
      await expect(
        approvalManager.approveStep(
          workflow.id,
          workflow.approvers[0].id,
          'editor@example.com',
          'Second approval'
        )
      ).rejects.toThrow('Step is in approved status and cannot be approved');
    });
  });

  describe('rejectStep', () => {
    let workflow: ApprovalWorkflow;

    beforeEach(async () => {
      workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com', 'admin@example.com']
      );
    });

    test('should reject step and workflow', async () => {
      const rejectedWorkflow = await approvalManager.rejectStep(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'Content needs major revisions'
      );

      expect(rejectedWorkflow.status).toBe('rejected');
      expect(rejectedWorkflow.completedAt).toBeDefined();
      expect(rejectedWorkflow.approvers[0].status).toBe('rejected');
      expect(rejectedWorkflow.approvers[0].comments).toBe('Content needs major revisions');
      expect(rejectedWorkflow.approvers[0].decision).toBe('reject');
    });

    test('should throw error for unauthorized rejector', async () => {
      await expect(
        approvalManager.rejectStep(
          workflow.id,
          workflow.approvers[0].id,
          'unauthorized@example.com',
          'Unauthorized rejection'
        )
      ).rejects.toThrow('User is not authorized to reject this step');
    });
  });

  describe('requestChanges', () => {
    let workflow: ApprovalWorkflow;

    beforeEach(async () => {
      workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com']
      );
    });

    test('should request changes and reject workflow', async () => {
      const updatedWorkflow = await approvalManager.requestChanges(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'Please fix the formatting issues'
      );

      expect(updatedWorkflow.status).toBe('rejected');
      expect(updatedWorkflow.approvers[0].status).toBe('rejected');
      expect(updatedWorkflow.approvers[0].decision).toBe('request_changes');
      expect(updatedWorkflow.approvers[0].comments).toBe('Please fix the formatting issues');
    });
  });

  describe('cancelWorkflow', () => {
    let workflow: ApprovalWorkflow;

    beforeEach(async () => {
      workflow = await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com']
      );
    });

    test('should cancel workflow by requester', async () => {
      await approvalManager.cancelWorkflow(
        workflow.id,
        'author@example.com',
        'No longer needed'
      );

      const cancelledWorkflow = await approvalManager.getWorkflow(workflow.id);
      expect(cancelledWorkflow!.status).toBe('cancelled');
      expect(cancelledWorkflow!.completedAt).toBeDefined();
      expect(cancelledWorkflow!.metadata.cancellationReason).toBe('No longer needed');
      expect(cancelledWorkflow!.metadata.cancelledBy).toBe('author@example.com');
    });

    test('should throw error when non-requester tries to cancel', async () => {
      await expect(
        approvalManager.cancelWorkflow(
          workflow.id,
          'other@example.com',
          'Unauthorized cancellation'
        )
      ).rejects.toThrow('Only the workflow requester can cancel the workflow');
    });

    test('should throw error when trying to cancel completed workflow', async () => {
      // Complete the workflow first
      await approvalManager.approveStep(
        workflow.id,
        workflow.approvers[0].id,
        'editor@example.com',
        'Approved'
      );

      await expect(
        approvalManager.cancelWorkflow(
          workflow.id,
          'author@example.com',
          'Too late to cancel'
        )
      ).rejects.toThrow('Workflow is in approved status and cannot be cancelled');
    });
  });

  describe('getWorkflows', () => {
    beforeEach(async () => {
      // Create multiple workflows
      await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author1@example.com',
        ['editor@example.com'],
        { priority: 'high' },
        'tenant-1'
      );

      await approvalManager.createWorkflow(
        'content-2',
        'block',
        'version-2',
        'author2@example.com',
        ['admin@example.com'],
        { priority: 'low' },
        'tenant-2'
      );

      await approvalManager.createWorkflow(
        'content-3',
        'page',
        'version-3',
        'author1@example.com',
        ['editor@example.com'],
        { priority: 'medium' },
        'tenant-1'
      );
    });

    test('should filter workflows by tenant', async () => {
      const workflows = await approvalManager.getWorkflows({
        tenantId: 'tenant-1'
      });

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => w.tenantId === 'tenant-1')).toBe(true);
    });

    test('should filter workflows by requester', async () => {
      const workflows = await approvalManager.getWorkflows({
        requestedBy: 'author1@example.com'
      });

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => w.requestedBy === 'author1@example.com')).toBe(true);
    });

    test('should filter workflows by approver', async () => {
      const workflows = await approvalManager.getWorkflows({
        approverId: 'editor@example.com'
      });

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => 
        w.approvers.some(a => a.approverId === 'editor@example.com')
      )).toBe(true);
    });

    test('should filter workflows by content type', async () => {
      const workflows = await approvalManager.getWorkflows({
        contentType: 'page'
      });

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => w.contentType === 'page')).toBe(true);
    });

    test('should filter workflows by priority', async () => {
      const workflows = await approvalManager.getWorkflows({
        priority: ['high', 'medium']
      });

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => 
        ['high', 'medium'].includes(w.metadata.priority)
      )).toBe(true);
    });

    test('should support pagination', async () => {
      const workflows = await approvalManager.getWorkflows({
        limit: 2,
        offset: 1
      });

      expect(workflows).toHaveLength(2);
    });
  });

  describe('getWorkflowsByApprover', () => {
    beforeEach(async () => {
      await approvalManager.createWorkflow(
        'content-1',
        'page',
        'version-1',
        'author@example.com',
        ['editor@example.com']
      );

      const workflow2 = await approvalManager.createWorkflow(
        'content-2',
        'page',
        'version-2',
        'author@example.com',
        ['editor@example.com']
      );

      // Approve one workflow
      await approvalManager.approveStep(
        workflow2.id,
        workflow2.approvers[0].id,
        'editor@example.com',
        'Approved'
      );
    });

    test('should get all workflows for approver', async () => {
      const workflows = await approvalManager.getWorkflowsByApprover('editor@example.com');

      expect(workflows).toHaveLength(2);
    });

    test('should filter workflows by status for approver', async () => {
      const pendingWorkflows = await approvalManager.getWorkflowsByApprover(
        'editor@example.com',
        ['pending']
      );

      expect(pendingWorkflows).toHaveLength(1);
      expect(pendingWorkflows[0].status).toBe('pending');
    });
  });

  describe('InMemoryApprovalStorage', () => {
    test('should save and retrieve workflows', async () => {
      const workflow: ApprovalWorkflow = {
        id: 'wf-1',
        contentId: 'content-1',
        contentType: 'page',
        versionId: 'version-1',
        requestedBy: 'author@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        approvers: [],
        currentStep: 1,
        metadata: { priority: 'medium' }
      };

      await storage.saveWorkflow(workflow);

      const retrieved = await storage.getWorkflow('wf-1');
      expect(retrieved).toEqual(workflow);
    });

    test('should update workflows', async () => {
      const workflow: ApprovalWorkflow = {
        id: 'wf-1',
        contentId: 'content-1',
        contentType: 'page',
        versionId: 'version-1',
        requestedBy: 'author@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        approvers: [],
        currentStep: 1,
        metadata: { priority: 'medium' }
      };

      await storage.saveWorkflow(workflow);

      workflow.status = 'approved';
      await storage.updateWorkflow(workflow);

      const updated = await storage.getWorkflow('wf-1');
      expect(updated!.status).toBe('approved');
    });

    test('should delete workflows', async () => {
      const workflow: ApprovalWorkflow = {
        id: 'wf-1',
        contentId: 'content-1',
        contentType: 'page',
        versionId: 'version-1',
        requestedBy: 'author@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        approvers: [],
        currentStep: 1,
        metadata: { priority: 'medium' }
      };

      await storage.saveWorkflow(workflow);
      await storage.deleteWorkflow('wf-1');

      const retrieved = await storage.getWorkflow('wf-1');
      expect(retrieved).toBeNull();
    });

    test('should throw error when updating non-existent workflow', async () => {
      const workflow: ApprovalWorkflow = {
        id: 'non-existent',
        contentId: 'content-1',
        contentType: 'page',
        versionId: 'version-1',
        requestedBy: 'author@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        approvers: [],
        currentStep: 1,
        metadata: { priority: 'medium' }
      };

      await expect(
        storage.updateWorkflow(workflow)
      ).rejects.toThrow('Workflow non-existent not found');
    });
  });
});