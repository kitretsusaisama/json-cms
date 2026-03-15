/**
 * Content Versioning and Audit System
 * 
 * This module provides comprehensive content versioning, audit trails, 
 * and approval workflows for the JSON CMS boilerplate system.
 */

// Main system
export { ContentVersioningSystem } from './versioning-system';

// Core managers
export { VersionManager, InMemoryVersionStorage } from './version-manager';
export { AuditTrailManager, InMemoryAuditStorage } from './audit-manager';
export { WorkflowApprovalManager, InMemoryApprovalStorage } from './approval-manager';

// Storage interfaces
export type { VersionStorage } from './version-manager';
export type { AuditStorage } from './audit-manager';
export type { ApprovalStorage } from './approval-manager';

// All interfaces and types
export * from './interfaces';

// Utility functions
export const createVersioningSystem = (config?: Partial<import('./interfaces').VersioningConfig>) => {
  return new ContentVersioningSystem(undefined, undefined, undefined, config);
};

export const createVersioningSystemWithStorages = (
  versionStorage: import('./version-manager').VersionStorage,
  auditStorage: import('./audit-manager').AuditStorage,
  approvalStorage: import('./approval-manager').ApprovalStorage,
  config?: Partial<import('./interfaces').VersioningConfig>
) => {
  return new ContentVersioningSystem(versionStorage, auditStorage, approvalStorage, config);
};