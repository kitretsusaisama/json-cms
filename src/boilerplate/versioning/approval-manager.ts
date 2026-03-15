/**
 * Approval Manager Implementation
 * 
 * Handles content approval workflows, multi-step approvals, and workflow management.
 */

import { 
  ApprovalWorkflow, 
  ApprovalStep, 
  ApprovalStatus, 
  ApprovalStepStatus, 
  ApprovalDecision,
  WorkflowMetadata,
  ApprovalManager,
  WorkflowSearchCriteria,
  VersioningConfig
} from './interfaces';

export class WorkflowApprovalManager implements ApprovalManager {
  private config: VersioningConfig;
  private storage: ApprovalStorage;

  constructor(storage: ApprovalStorage, config: Partial<VersioningConfig> = {}) {
    this.storage = storage;
    this.config = {
      maxVersionsPerContent: 50,
      autoCleanupEnabled: true,
      cleanupAfterDays: 365,
      compressionEnabled: true,
      diffAlgorithm: 'json',
      auditRetentionDays: 2555,
      approvalRequired: true,
      defaultApprovers: [],
      ...config
    };
  }

  async createWorkflow(
    contentId: string,
    contentType: string,
    versionId: string,
    requestedBy: string,
    approvers: string[],
    metadata: Partial<WorkflowMetadata> = {},
    tenantId?: string
  ): Promise<ApprovalWorkflow> {
    if (approvers.length === 0) {
      approvers = this.config.defaultApprovers;
    }

    if (approvers.length === 0) {
      throw new Error('No approvers specified and no default approvers configured');
    }

    const approvalSteps: ApprovalStep[] = approvers.map((approverId, index) => ({
      id: this.generateStepId(),
      stepNumber: index + 1,
      approverId,
      status: index === 0 ? 'pending' : 'pending', // First step is active
      requiredApprovals: 1,
      receivedApprovals: 0
    }));

    const workflow: ApprovalWorkflow = {
      id: this.generateWorkflowId(),
      contentId,
      contentType,
      versionId,
      tenantId,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      approvers: approvalSteps,
      currentStep: 1,
      metadata: {
        priority: 'medium',
        ...metadata
      }
    };

    await this.storage.saveWorkflow(workflow);
    
    // Notify first approver
    await this.notifyApprover(workflow, approvalSteps[0]);

    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    return await this.storage.getWorkflow(workflowId);
  }

  async getWorkflows(criteria: WorkflowSearchCriteria): Promise<ApprovalWorkflow[]> {
    return await this.storage.getWorkflows(criteria);
  }

  async approveStep(
    workflowId: string, 
    stepId: string, 
    approverId: string, 
    comments?: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const step = workflow.approvers.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow`);
    }

    if (step.approverId !== approverId) {
      throw new Error('User is not authorized to approve this step');
    }

    if (step.status !== 'pending' && step.status !== 'in_review') {
      throw new Error(`Step is in ${step.status} status and cannot be approved`);
    }

    // Update step
    step.status = 'approved';
    step.reviewedAt = new Date().toISOString();
    step.comments = comments;
    step.decision = 'approve';
    step.receivedApprovals = step.requiredApprovals;

    // Check if this completes the current step
    if (step.stepNumber === workflow.currentStep) {
      // Move to next step or complete workflow
      const nextStep = workflow.approvers.find(s => s.stepNumber === workflow.currentStep + 1);
      
      if (nextStep) {
        workflow.currentStep++;
        nextStep.status = 'pending';
        await this.notifyApprover(workflow, nextStep);
      } else {
        // All steps completed
        workflow.status = 'approved';
        workflow.completedAt = new Date().toISOString();
        await this.onWorkflowCompleted(workflow);
      }
    }

    await this.storage.updateWorkflow(workflow);
    return workflow;
  }

  async rejectStep(
    workflowId: string, 
    stepId: string, 
    approverId: string, 
    comments: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const step = workflow.approvers.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow`);
    }

    if (step.approverId !== approverId) {
      throw new Error('User is not authorized to reject this step');
    }

    if (step.status !== 'pending' && step.status !== 'in_review') {
      throw new Error(`Step is in ${step.status} status and cannot be rejected`);
    }

    // Update step
    step.status = 'rejected';
    step.reviewedAt = new Date().toISOString();
    step.comments = comments;
    step.decision = 'reject';

    // Reject entire workflow
    workflow.status = 'rejected';
    workflow.completedAt = new Date().toISOString();

    await this.storage.updateWorkflow(workflow);
    await this.onWorkflowRejected(workflow, step);

    return workflow;
  }

  async requestChanges(
    workflowId: string, 
    stepId: string, 
    approverId: string, 
    comments: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const step = workflow.approvers.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow`);
    }

    if (step.approverId !== approverId) {
      throw new Error('User is not authorized to request changes for this step');
    }

    if (step.status !== 'pending' && step.status !== 'in_review') {
      throw new Error(`Step is in ${step.status} status and cannot request changes`);
    }

    // Update step
    step.status = 'rejected';
    step.reviewedAt = new Date().toISOString();
    step.comments = comments;
    step.decision = 'request_changes';

    // Set workflow to rejected status (changes requested)
    workflow.status = 'rejected';
    workflow.completedAt = new Date().toISOString();

    await this.storage.updateWorkflow(workflow);
    await this.onChangesRequested(workflow, step);

    return workflow;
  }

  async cancelWorkflow(workflowId: string, userId: string, reason: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.requestedBy !== userId) {
      throw new Error('Only the workflow requester can cancel the workflow');
    }

    if (workflow.status !== 'pending' && workflow.status !== 'in_review') {
      throw new Error(`Workflow is in ${workflow.status} status and cannot be cancelled`);
    }

    workflow.status = 'cancelled';
    workflow.completedAt = new Date().toISOString();
    
    // Add cancellation reason to metadata
    workflow.metadata = {
      ...workflow.metadata,
      cancellationReason: reason,
      cancelledBy: userId
    };

    await this.storage.updateWorkflow(workflow);
    await this.onWorkflowCancelled(workflow);
  }

  async escalateWorkflow(
    workflowId: string, 
    userId: string, 
    reason: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check if escalation is allowed (e.g., workflow is overdue)
    const isOverdue = this.isWorkflowOverdue(workflow);
    if (!isOverdue) {
      throw new Error('Workflow is not eligible for escalation');
    }

    // Find current step and escalate to next level
    const currentStep = workflow.approvers.find(s => s.stepNumber === workflow.currentStep);
    if (currentStep) {
      // In a real implementation, you would have escalation rules
      // For now, we'll mark it as escalated and notify administrators
      workflow.metadata = {
        ...workflow.metadata,
        escalated: true,
        escalationReason: reason,
        escalatedBy: userId,
        escalatedAt: new Date().toISOString()
      };

      await this.storage.updateWorkflow(workflow);
      await this.onWorkflowEscalated(workflow);
    }

    return workflow;
  }

  async getWorkflowsByApprover(approverId: string, status?: ApprovalStatus[]): Promise<ApprovalWorkflow[]> {
    return await this.getWorkflows({
      approverId,
      status
    });
  }

  async getWorkflowsByRequester(requesterId: string, status?: ApprovalStatus[]): Promise<ApprovalWorkflow[]> {
    return await this.getWorkflows({
      requestedBy: requesterId,
      status
    });
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isWorkflowOverdue(workflow: ApprovalWorkflow): boolean {
    if (!workflow.metadata.deadline) {
      return false;
    }

    const deadline = new Date(workflow.metadata.deadline);
    const now = new Date();
    
    return now > deadline;
  }

  private async notifyApprover(workflow: ApprovalWorkflow, step: ApprovalStep): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.log(`Notification: Approval required for workflow ${workflow.id}, step ${step.stepNumber} by ${step.approverId}`);
  }

  private async onWorkflowCompleted(workflow: ApprovalWorkflow): Promise<void> {
    // In a real implementation, this would trigger content publishing or other actions
    console.log(`Workflow ${workflow.id} completed successfully`);
  }

  private async onWorkflowRejected(workflow: ApprovalWorkflow, step: ApprovalStep): Promise<void> {
    // In a real implementation, this would notify the requester and handle rejection
    console.log(`Workflow ${workflow.id} rejected at step ${step.stepNumber} by ${step.approverId}`);
  }

  private async onChangesRequested(workflow: ApprovalWorkflow, step: ApprovalStep): Promise<void> {
    // In a real implementation, this would notify the requester about requested changes
    console.log(`Changes requested for workflow ${workflow.id} at step ${step.stepNumber} by ${step.approverId}`);
  }

  private async onWorkflowCancelled(workflow: ApprovalWorkflow): Promise<void> {
    // In a real implementation, this would handle workflow cancellation
    console.log(`Workflow ${workflow.id} cancelled by ${workflow.requestedBy}`);
  }

  private async onWorkflowEscalated(workflow: ApprovalWorkflow): Promise<void> {
    // In a real implementation, this would handle workflow escalation
    console.log(`Workflow ${workflow.id} escalated due to: ${workflow.metadata.escalationReason}`);
  }
}

export interface ApprovalStorage {
  saveWorkflow(workflow: ApprovalWorkflow): Promise<void>;
  getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null>;
  getWorkflows(criteria: WorkflowSearchCriteria): Promise<ApprovalWorkflow[]>;
  updateWorkflow(workflow: ApprovalWorkflow): Promise<void>;
  deleteWorkflow(workflowId: string): Promise<void>;
}

export class InMemoryApprovalStorage implements ApprovalStorage {
  private workflows = new Map<string, ApprovalWorkflow>();

  async saveWorkflow(workflow: ApprovalWorkflow): Promise<void> {
    this.workflows.set(workflow.id, { ...workflow });
  }

  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    const workflow = this.workflows.get(workflowId);
    return workflow ? { ...workflow } : null;
  }

  async getWorkflows(criteria: WorkflowSearchCriteria): Promise<ApprovalWorkflow[]> {
    let workflows = Array.from(this.workflows.values());

    // Apply filters
    if (criteria.tenantId) {
      workflows = workflows.filter(w => w.tenantId === criteria.tenantId);
    }

    if (criteria.requestedBy) {
      workflows = workflows.filter(w => w.requestedBy === criteria.requestedBy);
    }

    if (criteria.approverId) {
      workflows = workflows.filter(w => 
        w.approvers.some(a => a.approverId === criteria.approverId)
      );
    }

    if (criteria.status) {
      workflows = workflows.filter(w => criteria.status!.includes(w.status));
    }

    if (criteria.contentType) {
      workflows = workflows.filter(w => w.contentType === criteria.contentType);
    }

    if (criteria.priority) {
      workflows = workflows.filter(w => 
        criteria.priority!.includes(w.metadata.priority)
      );
    }

    if (criteria.dateRange) {
      workflows = workflows.filter(w => 
        w.requestedAt >= criteria.dateRange!.start && 
        w.requestedAt <= criteria.dateRange!.end
      );
    }

    // Pagination
    const offset = criteria.offset || 0;
    const limit = criteria.limit || workflows.length;
    
    return workflows.slice(offset, offset + limit).map(w => ({ ...w }));
  }

  async updateWorkflow(workflow: ApprovalWorkflow): Promise<void> {
    if (!this.workflows.has(workflow.id)) {
      throw new Error(`Workflow ${workflow.id} not found`);
    }
    this.workflows.set(workflow.id, { ...workflow });
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!this.workflows.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    this.workflows.delete(workflowId);
  }
}