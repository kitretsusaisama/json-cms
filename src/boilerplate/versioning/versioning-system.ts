/**
 * Versioning System Integration
 * 
 * Main class that integrates version management, audit trails, and approval workflows.
 */

import { 
  VersioningManager, 
  AuditManager, 
  ApprovalManager,
  ContentVersion,
  AuditEntry,
  ApprovalWorkflow,
  VersioningConfig,
  ChangeType,
  AuditAction
} from './interfaces';

import { VersionManager, VersionStorage, InMemoryVersionStorage } from './version-manager';
import { AuditTrailManager, AuditStorage, InMemoryAuditStorage } from './audit-manager';
import { WorkflowApprovalManager, ApprovalStorage, InMemoryApprovalStorage } from './approval-manager';

export class ContentVersioningSystem {
  private versionManager: VersioningManager;
  private auditManager: AuditManager;
  private approvalManager: ApprovalManager;
  private config: VersioningConfig;

  constructor(
    versionStorage?: VersionStorage,
    auditStorage?: AuditStorage,
    approvalStorage?: ApprovalStorage,
    config: Partial<VersioningConfig> = {}
  ) {
    this.config = {
      maxVersionsPerContent: 50,
      autoCleanupEnabled: true,
      cleanupAfterDays: 365,
      compressionEnabled: true,
      diffAlgorithm: 'json',
      auditRetentionDays: 2555,
      approvalRequired: false,
      defaultApprovers: [],
      ...config
    };

    // Initialize managers with storage adapters
    this.versionManager = new VersionManager(
      versionStorage || new InMemoryVersionStorage(),
      this.config
    );

    this.auditManager = new AuditTrailManager(
      auditStorage || new InMemoryAuditStorage(),
      this.config
    );

    this.approvalManager = new WorkflowApprovalManager(
      approvalStorage || new InMemoryApprovalStorage(),
      this.config
    );
  }

  /**
   * Create a new content version with full audit trail and optional approval workflow
   */
  async createContentVersion(
    contentId: string,
    contentType: string,
    content: unknown,
    userId: string,
    options: {
      title?: string;
      description?: string;
      changeReason?: string;
      tenantId?: string;
      requireApproval?: boolean;
      approvers?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<{
    version: ContentVersion;
    auditEntry: AuditEntry;
    workflow?: ApprovalWorkflow;
  }> {
    const { tenantId, requireApproval, approvers, ...versionMetadata } = options;

    // Create version
    const version = await this.versionManager.createVersion(
      contentId,
      contentType,
      content,
      versionMetadata,
      userId,
      tenantId
    );

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'create',
      contentType,
      contentId,
      userId,
      {
        contentVersion: version.id,
        changes: version.metadata.diff,
        context: options.metadata
      },
      tenantId
    );

    // Create approval workflow if required
    let workflow: ApprovalWorkflow | undefined;
    if (requireApproval || this.config.approvalRequired) {
      const workflowApprovers = approvers || this.config.defaultApprovers;
      if (workflowApprovers.length > 0) {
        workflow = await this.approvalManager.createWorkflow(
          contentId,
          contentType,
          version.id,
          userId,
          workflowApprovers,
          {
            title: versionMetadata.title,
            description: versionMetadata.description,
            priority: 'medium'
          },
          tenantId
        );
      }
    }

    return { version, auditEntry, workflow };
  }

  /**
   * Update existing content with versioning
   */
  async updateContent(
    contentId: string,
    contentType: string,
    content: unknown,
    userId: string,
    options: {
      title?: string;
      description?: string;
      changeReason?: string;
      tenantId?: string;
      requireApproval?: boolean;
      approvers?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<{
    version: ContentVersion;
    auditEntry: AuditEntry;
    workflow?: ApprovalWorkflow;
  }> {
    return await this.createContentVersion(contentId, contentType, content, userId, {
      ...options,
      changeReason: options.changeReason || 'Content update'
    });
  }

  /**
   * Rollback content to a previous version
   */
  async rollbackContent(
    contentId: string,
    targetVersionId: string,
    userId: string,
    reason: string,
    tenantId?: string
  ): Promise<{
    version: ContentVersion;
    auditEntry: AuditEntry;
  }> {
    // Perform rollback
    const version = await this.versionManager.rollbackToVersion(contentId, targetVersionId, userId);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'rollback',
      version.contentType,
      contentId,
      userId,
      {
        contentVersion: version.id,
        previousVersion: targetVersionId,
        context: { reason }
      },
      tenantId
    );

    return { version, auditEntry };
  }

  /**
   * Restore a deleted version
   */
  async restoreContent(
    versionId: string,
    userId: string,
    tenantId?: string
  ): Promise<{
    version: ContentVersion;
    auditEntry: AuditEntry;
  }> {
    // Perform restore
    const version = await this.versionManager.restoreVersion(versionId, userId);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'restore',
      version.contentType,
      version.contentId,
      userId,
      {
        contentVersion: version.id,
        previousVersion: versionId
      },
      tenantId
    );

    return { version, auditEntry };
  }

  /**
   * Publish a content version
   */
  async publishContent(
    versionId: string,
    userId: string,
    tenantId?: string
  ): Promise<{
    auditEntry: AuditEntry;
  }> {
    const version = await this.versionManager.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Check if approval is required and workflow is approved
    if (this.config.approvalRequired) {
      const workflows = await this.approvalManager.getWorkflows({
        versionId,
        status: ['approved']
      });

      if (workflows.length === 0) {
        throw new Error('Content must be approved before publishing');
      }
    }

    // Publish version
    await this.versionManager.publishVersion(versionId, userId);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'publish',
      version.contentType,
      version.contentId,
      userId,
      {
        contentVersion: versionId
      },
      tenantId
    );

    return { auditEntry };
  }

  /**
   * Unpublish a content version
   */
  async unpublishContent(
    versionId: string,
    userId: string,
    reason: string,
    tenantId?: string
  ): Promise<{
    auditEntry: AuditEntry;
  }> {
    const version = await this.versionManager.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Unpublish version
    await this.versionManager.unpublishVersion(versionId, userId);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'unpublish',
      version.contentType,
      version.contentId,
      userId,
      {
        contentVersion: versionId,
        context: { reason }
      },
      tenantId
    );

    return { auditEntry };
  }

  /**
   * Get content version history with audit trail
   */
  async getContentHistory(
    contentId: string,
    options: {
      includeAuditTrail?: boolean;
      includeWorkflows?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    versions: ContentVersion[];
    auditTrail?: AuditEntry[];
    workflows?: ApprovalWorkflow[];
  }> {
    const versions = await this.versionManager.getVersions(contentId, {
      limit: options.limit,
      offset: options.offset,
      sortBy: 'version',
      sortOrder: 'desc'
    });

    let auditTrail: AuditEntry[] | undefined;
    let workflows: ApprovalWorkflow[] | undefined;

    if (options.includeAuditTrail) {
      auditTrail = await this.auditManager.getAuditTrail(contentId);
    }

    if (options.includeWorkflows) {
      workflows = await this.approvalManager.getWorkflows({
        contentId
      });
    }

    return { versions, auditTrail, workflows };
  }

  /**
   * Compare two content versions
   */
  async compareVersions(versionId1: string, versionId2: string, userId: string, tenantId?: string) {
    const diff = await this.versionManager.compareVersions(versionId1, versionId2);

    // Log audit entry for comparison
    await this.auditManager.logAction(
      'read',
      'version_comparison',
      `${versionId1}_vs_${versionId2}`,
      userId,
      {
        context: {
          action: 'compare_versions',
          version1: versionId1,
          version2: versionId2
        }
      },
      tenantId
    );

    return diff;
  }

  /**
   * Get approval workflows for a user
   */
  async getPendingApprovals(
    approverId: string,
    tenantId?: string
  ): Promise<ApprovalWorkflow[]> {
    return await this.approvalManager.getWorkflows({
      approverId,
      status: ['pending', 'in_review'],
      tenantId
    });
  }

  /**
   * Approve a workflow step
   */
  async approveWorkflowStep(
    workflowId: string,
    stepId: string,
    approverId: string,
    comments?: string,
    tenantId?: string
  ): Promise<{
    workflow: ApprovalWorkflow;
    auditEntry: AuditEntry;
  }> {
    const workflow = await this.approvalManager.approveStep(workflowId, stepId, approverId, comments);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'approve',
      'approval_workflow',
      workflowId,
      approverId,
      {
        context: {
          stepId,
          comments,
          workflowStatus: workflow.status
        }
      },
      tenantId
    );

    return { workflow, auditEntry };
  }

  /**
   * Reject a workflow step
   */
  async rejectWorkflowStep(
    workflowId: string,
    stepId: string,
    approverId: string,
    comments: string,
    tenantId?: string
  ): Promise<{
    workflow: ApprovalWorkflow;
    auditEntry: AuditEntry;
  }> {
    const workflow = await this.approvalManager.rejectStep(workflowId, stepId, approverId, comments);

    // Log audit entry
    const auditEntry = await this.auditManager.logAction(
      'reject',
      'approval_workflow',
      workflowId,
      approverId,
      {
        context: {
          stepId,
          comments,
          workflowStatus: workflow.status
        }
      },
      tenantId
    );

    return { workflow, auditEntry };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    startDate: string,
    endDate: string,
    userId: string
  ) {
    const report = await this.auditManager.generateComplianceReport(tenantId, startDate, endDate);

    // Log audit entry for report generation
    await this.auditManager.logAction(
      'export',
      'compliance_report',
      `${tenantId}_${startDate}_${endDate}`,
      userId,
      {
        context: {
          reportPeriod: { start: startDate, end: endDate },
          totalActions: report.summary.totalActions
        }
      },
      tenantId
    );

    return report;
  }

  /**
   * Get system configuration
   */
  getConfiguration(): VersioningConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  updateConfiguration(updates: Partial<VersioningConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export default ContentVersioningSystem;