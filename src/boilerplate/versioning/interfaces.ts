/**
 * Content Versioning and Audit System Interfaces
 * 
 * This module defines the interfaces for content version tracking,
 * audit trails, rollback functionality, and approval workflows.
 */

export interface ContentVersion {
  id: string;
  contentId: string;
  contentType: 'page' | 'block' | 'component' | 'seo' | 'settings';
  version: number;
  content: unknown;
  metadata: VersionMetadata;
  createdBy: string;
  createdAt: string;
  tenantId?: string;
  parentVersion?: string;
  tags?: string[];
  status: VersionStatus;
}

export interface VersionMetadata {
  title?: string;
  description?: string;
  changeType: ChangeType;
  changeReason?: string;
  size: number;
  checksum: string;
  diff?: ContentDiff;
}

export interface ContentDiff {
  added: DiffOperation[];
  removed: DiffOperation[];
  modified: DiffOperation[];
  summary: DiffSummary;
}

export interface DiffOperation {
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  type: 'add' | 'remove' | 'modify';
}

export interface DiffSummary {
  totalChanges: number;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  impactLevel: 'minor' | 'major' | 'breaking';
}

export type ChangeType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'restore' 
  | 'merge' 
  | 'rollback'
  | 'publish'
  | 'unpublish';

export type VersionStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'published' 
  | 'archived';

export interface AuditEntry {
  id: string;
  correlationId: string;
  tenantId?: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: AuditMetadata;
  result: AuditResult;
}

export interface AuditMetadata {
  contentVersion?: string;
  previousVersion?: string;
  changes?: ContentDiff;
  context?: Record<string, unknown>;
  sessionId?: string;
  requestId?: string;
}

export type AuditAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'publish' 
  | 'unpublish'
  | 'approve' 
  | 'reject' 
  | 'rollback' 
  | 'restore'
  | 'export'
  | 'import';

export type AuditResult = 'success' | 'failure' | 'partial';

export interface ApprovalWorkflow {
  id: string;
  contentId: string;
  contentType: string;
  versionId: string;
  tenantId?: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvers: ApprovalStep[];
  currentStep: number;
  completedAt?: string;
  metadata: WorkflowMetadata;
}

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  approverId: string;
  approverRole?: string;
  status: ApprovalStepStatus;
  reviewedAt?: string;
  comments?: string;
  decision?: ApprovalDecision;
  requiredApprovals: number;
  receivedApprovals: number;
}

export interface WorkflowMetadata {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  category?: string;
  tags?: string[];
  description?: string;
  attachments?: string[];
}

export type ApprovalStatus = 
  | 'pending' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled' 
  | 'expired';

export type ApprovalStepStatus = 
  | 'pending' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'skipped';

export type ApprovalDecision = 'approve' | 'reject' | 'request_changes';

export interface VersioningManager {
  // Version Management
  createVersion(contentId: string, contentType: string, content: unknown, metadata: Partial<VersionMetadata>, userId: string): Promise<ContentVersion>;
  getVersion(versionId: string): Promise<ContentVersion | null>;
  getVersions(contentId: string, options?: VersionQueryOptions): Promise<ContentVersion[]>;
  deleteVersion(versionId: string, userId: string): Promise<void>;
  
  // Diff and Comparison
  compareVersions(versionId1: string, versionId2: string): Promise<ContentDiff>;
  generateDiff(oldContent: unknown, newContent: unknown): ContentDiff;
  
  // Rollback and Restore
  rollbackToVersion(contentId: string, versionId: string, userId: string): Promise<ContentVersion>;
  restoreVersion(versionId: string, userId: string): Promise<ContentVersion>;
  
  // Publishing
  publishVersion(versionId: string, userId: string): Promise<void>;
  unpublishVersion(versionId: string, userId: string): Promise<void>;
}

export interface AuditManager {
  // Audit Logging
  logAction(action: AuditAction, resourceType: string, resourceId: string, userId: string, metadata?: Partial<AuditMetadata>): Promise<AuditEntry>;
  getAuditTrail(resourceId: string, options?: AuditQueryOptions): Promise<AuditEntry[]>;
  searchAuditLogs(criteria: AuditSearchCriteria): Promise<AuditEntry[]>;
  
  // Compliance and Reporting
  generateComplianceReport(tenantId: string, startDate: string, endDate: string): Promise<ComplianceReport>;
  exportAuditLogs(criteria: AuditSearchCriteria, format: 'json' | 'csv' | 'xlsx'): Promise<Buffer>;
}

export interface ApprovalManager {
  // Workflow Management
  createWorkflow(contentId: string, contentType: string, versionId: string, requestedBy: string, approvers: string[], metadata?: Partial<WorkflowMetadata>): Promise<ApprovalWorkflow>;
  getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null>;
  getWorkflows(criteria: WorkflowSearchCriteria): Promise<ApprovalWorkflow[]>;
  
  // Approval Actions
  approveStep(workflowId: string, stepId: string, approverId: string, comments?: string): Promise<ApprovalWorkflow>;
  rejectStep(workflowId: string, stepId: string, approverId: string, comments: string): Promise<ApprovalWorkflow>;
  requestChanges(workflowId: string, stepId: string, approverId: string, comments: string): Promise<ApprovalWorkflow>;
  
  // Workflow Control
  cancelWorkflow(workflowId: string, userId: string, reason: string): Promise<void>;
  escalateWorkflow(workflowId: string, userId: string, reason: string): Promise<ApprovalWorkflow>;
}

export interface VersionQueryOptions {
  limit?: number;
  offset?: number;
  status?: VersionStatus[];
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  includeContent?: boolean;
  sortBy?: 'version' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  actions?: AuditAction[];
  userId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  result?: AuditResult[];
  sortBy?: 'timestamp' | 'action' | 'userId';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditSearchCriteria {
  tenantId?: string;
  userId?: string;
  actions?: AuditAction[];
  resourceTypes?: string[];
  resourceIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  ipAddress?: string;
  correlationId?: string;
  result?: AuditResult[];
  limit?: number;
  offset?: number;
}

export interface WorkflowSearchCriteria {
  tenantId?: string;
  requestedBy?: string;
  approverId?: string;
  status?: ApprovalStatus[];
  contentType?: string;
  priority?: WorkflowMetadata['priority'][];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  tenantId: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  summary: {
    totalActions: number;
    uniqueUsers: number;
    contentChanges: number;
    approvalWorkflows: number;
    securityEvents: number;
  };
  breakdown: {
    actionsByType: Record<AuditAction, number>;
    actionsByUser: Record<string, number>;
    actionsByResource: Record<string, number>;
    failureRate: number;
  };
  violations?: ComplianceViolation[];
  recommendations?: string[];
}

export interface ComplianceViolation {
  id: string;
  type: 'unauthorized_access' | 'data_breach' | 'policy_violation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  userId?: string;
  resourceId?: string;
  evidence: AuditEntry[];
}

export interface VersioningConfig {
  maxVersionsPerContent: number;
  autoCleanupEnabled: boolean;
  cleanupAfterDays: number;
  compressionEnabled: boolean;
  diffAlgorithm: 'json' | 'text' | 'semantic';
  auditRetentionDays: number;
  approvalRequired: boolean;
  defaultApprovers: string[];
}