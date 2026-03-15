/**
 * Audit Manager Implementation
 * 
 * Handles audit trail logging, compliance reporting, and audit log management.
 */

import { 
  AuditEntry, 
  AuditAction, 
  AuditMetadata, 
  AuditResult,
  AuditManager,
  AuditQueryOptions,
  AuditSearchCriteria,
  ComplianceReport,
  ComplianceViolation,
  VersioningConfig
} from './interfaces';

export class AuditTrailManager implements AuditManager {
  private config: VersioningConfig;
  private storage: AuditStorage;

  constructor(storage: AuditStorage, config: Partial<VersioningConfig> = {}) {
    this.storage = storage;
    this.config = {
      maxVersionsPerContent: 50,
      autoCleanupEnabled: true,
      cleanupAfterDays: 365,
      compressionEnabled: true,
      diffAlgorithm: 'json',
      auditRetentionDays: 2555, // 7 years
      approvalRequired: false,
      defaultApprovers: [],
      ...config
    };
  }

  async logAction(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    userId: string,
    metadata: Partial<AuditMetadata> = {},
    tenantId?: string,
    request?: {
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: this.generateAuditId(),
      correlationId: request?.correlationId || this.generateCorrelationId(),
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
      ipAddress: request?.ipAddress,
      userAgent: request?.userAgent,
      metadata: {
        sessionId: this.extractSessionId(request?.userAgent),
        requestId: this.generateRequestId(),
        ...metadata
      },
      result: 'success' // Default, can be updated
    };

    await this.storage.saveAuditEntry(entry);
    
    // Auto-cleanup old audit logs if enabled
    if (this.config.autoCleanupEnabled) {
      await this.cleanupOldAuditLogs();
    }

    return entry;
  }

  async getAuditTrail(resourceId: string, options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
    return await this.storage.getAuditEntries({ resourceIds: [resourceId] }, options);
  }

  async searchAuditLogs(criteria: AuditSearchCriteria): Promise<AuditEntry[]> {
    return await this.storage.getAuditEntries(criteria);
  }

  async generateComplianceReport(
    tenantId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ComplianceReport> {
    const criteria: AuditSearchCriteria = {
      tenantId,
      dateRange: { start: startDate, end: endDate }
    };

    const auditEntries = await this.searchAuditLogs(criteria);
    
    // Calculate summary statistics
    const uniqueUsers = new Set(auditEntries.map(e => e.userId)).size;
    const contentChanges = auditEntries.filter(e => 
      ['create', 'update', 'delete', 'publish', 'unpublish'].includes(e.action)
    ).length;
    const approvalWorkflows = auditEntries.filter(e => 
      ['approve', 'reject'].includes(e.action)
    ).length;
    const securityEvents = auditEntries.filter(e => 
      e.result === 'failure' || this.isSecurityEvent(e)
    ).length;

    // Calculate breakdown statistics
    const actionsByType = this.groupByAction(auditEntries);
    const actionsByUser = this.groupByUser(auditEntries);
    const actionsByResource = this.groupByResource(auditEntries);
    const failureRate = auditEntries.length > 0 
      ? auditEntries.filter(e => e.result === 'failure').length / auditEntries.length 
      : 0;

    // Detect violations
    const violations = await this.detectViolations(auditEntries);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(auditEntries, violations);

    return {
      tenantId,
      reportPeriod: { start: startDate, end: endDate },
      summary: {
        totalActions: auditEntries.length,
        uniqueUsers,
        contentChanges,
        approvalWorkflows,
        securityEvents
      },
      breakdown: {
        actionsByType,
        actionsByUser,
        actionsByResource,
        failureRate
      },
      violations,
      recommendations
    };
  }

  async exportAuditLogs(
    criteria: AuditSearchCriteria, 
    format: 'json' | 'csv' | 'xlsx'
  ): Promise<Buffer> {
    const auditEntries = await this.searchAuditLogs(criteria);
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(auditEntries, null, 2));
      
      case 'csv':
        return this.exportToCsv(auditEntries);
      
      case 'xlsx':
        return this.exportToXlsx(auditEntries);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async updateAuditResult(auditId: string, result: AuditResult, error?: string): Promise<void> {
    await this.storage.updateAuditEntry(auditId, { result, error });
  }

  private async cleanupOldAuditLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.auditRetentionDays);
    
    await this.storage.deleteOldAuditEntries(cutoffDate.toISOString());
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractSessionId(userAgent?: string): string | undefined {
    // Simple session ID extraction - in production, use proper session management
    return userAgent ? `sess_${userAgent.slice(0, 10)}` : undefined;
  }

  private isSecurityEvent(entry: AuditEntry): boolean {
    const securityActions: AuditAction[] = ['delete'];
    const suspiciousPatterns = [
      'unauthorized',
      'forbidden',
      'suspicious',
      'anomaly'
    ];

    return securityActions.includes(entry.action) ||
           suspiciousPatterns.some(pattern => 
             JSON.stringify(entry.metadata).toLowerCase().includes(pattern)
           );
  }

  private groupByAction(entries: AuditEntry[]): Record<AuditAction, number> {
    const groups: Record<string, number> = {};
    
    for (const entry of entries) {
      groups[entry.action] = (groups[entry.action] || 0) + 1;
    }
    
    return groups as Record<AuditAction, number>;
  }

  private groupByUser(entries: AuditEntry[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const entry of entries) {
      groups[entry.userId] = (groups[entry.userId] || 0) + 1;
    }
    
    return groups;
  }

  private groupByResource(entries: AuditEntry[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const entry of entries) {
      const key = `${entry.resourceType}:${entry.resourceId}`;
      groups[key] = (groups[key] || 0) + 1;
    }
    
    return groups;
  }

  private async detectViolations(entries: AuditEntry[]): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Detect unauthorized access attempts
    const failedEntries = entries.filter(e => e.result === 'failure');
    if (failedEntries.length > 0) {
      violations.push({
        id: `violation_${Date.now()}`,
        type: 'unauthorized_access',
        severity: 'medium',
        description: `${failedEntries.length} unauthorized access attempts detected`,
        timestamp: new Date().toISOString(),
        evidence: failedEntries.slice(0, 10) // Limit evidence
      });
    }

    // Detect suspicious activity patterns
    const userActions = this.groupByUser(entries);
    for (const [userId, actionCount] of Object.entries(userActions)) {
      if (actionCount > 100) { // Threshold for suspicious activity
        const userEntries = entries.filter(e => e.userId === userId);
        violations.push({
          id: `violation_${Date.now()}_${userId}`,
          type: 'suspicious_activity',
          severity: 'high',
          description: `User ${userId} performed ${actionCount} actions, which exceeds normal threshold`,
          timestamp: new Date().toISOString(),
          userId,
          evidence: userEntries.slice(0, 5)
        });
      }
    }

    return violations;
  }

  private generateRecommendations(
    entries: AuditEntry[], 
    violations: ComplianceViolation[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (violations.length > 0) {
      recommendations.push('Review and investigate detected compliance violations');
    }
    
    const failureRate = entries.length > 0 
      ? entries.filter(e => e.result === 'failure').length / entries.length 
      : 0;
    
    if (failureRate > 0.05) { // 5% failure rate threshold
      recommendations.push('High failure rate detected - review authentication and authorization mechanisms');
    }
    
    const deleteActions = entries.filter(e => e.action === 'delete').length;
    if (deleteActions > entries.length * 0.1) { // More than 10% delete actions
      recommendations.push('High number of delete operations - consider implementing soft deletes');
    }
    
    return recommendations;
  }

  private exportToCsv(entries: AuditEntry[]): Buffer {
    const headers = [
      'ID', 'Timestamp', 'User ID', 'Action', 'Resource Type', 
      'Resource ID', 'Result', 'IP Address', 'Tenant ID'
    ];
    
    const rows = entries.map(entry => [
      entry.id,
      entry.timestamp,
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.result,
      entry.ipAddress || '',
      entry.tenantId || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return Buffer.from(csvContent);
  }

  private exportToXlsx(entries: AuditEntry[]): Buffer {
    // Simple XLSX export - in production, use a proper XLSX library like 'xlsx'
    // For now, return CSV format as fallback
    return this.exportToCsv(entries);
  }
}

export interface AuditStorage {
  saveAuditEntry(entry: AuditEntry): Promise<void>;
  getAuditEntries(criteria: AuditSearchCriteria, options?: AuditQueryOptions): Promise<AuditEntry[]>;
  updateAuditEntry(auditId: string, updates: Partial<AuditEntry>): Promise<void>;
  deleteOldAuditEntries(cutoffDate: string): Promise<void>;
}

export class InMemoryAuditStorage implements AuditStorage {
  private auditEntries = new Map<string, AuditEntry>();

  async saveAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditEntries.set(entry.id, { ...entry });
  }

  async getAuditEntries(
    criteria: AuditSearchCriteria, 
    options: AuditQueryOptions = {}
  ): Promise<AuditEntry[]> {
    let entries = Array.from(this.auditEntries.values());

    // Apply filters
    if (criteria.tenantId) {
      entries = entries.filter(e => e.tenantId === criteria.tenantId);
    }

    if (criteria.userId) {
      entries = entries.filter(e => e.userId === criteria.userId);
    }

    if (criteria.actions) {
      entries = entries.filter(e => criteria.actions!.includes(e.action));
    }

    if (criteria.resourceTypes) {
      entries = entries.filter(e => criteria.resourceTypes!.includes(e.resourceType));
    }

    if (criteria.resourceIds) {
      entries = entries.filter(e => criteria.resourceIds!.includes(e.resourceId));
    }

    if (criteria.dateRange) {
      entries = entries.filter(e => 
        e.timestamp >= criteria.dateRange!.start && 
        e.timestamp <= criteria.dateRange!.end
      );
    }

    if (criteria.result) {
      entries = entries.filter(e => criteria.result!.includes(e.result));
    }

    if (criteria.correlationId) {
      entries = entries.filter(e => e.correlationId === criteria.correlationId);
    }

    if (criteria.ipAddress) {
      entries = entries.filter(e => e.ipAddress === criteria.ipAddress);
    }

    // Sort
    if (options.sortBy) {
      entries.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    // Pagination
    const offset = criteria.offset || options.offset || 0;
    const limit = criteria.limit || options.limit || entries.length;
    
    return entries.slice(offset, offset + limit).map(e => ({ ...e }));
  }

  async updateAuditEntry(auditId: string, updates: Partial<AuditEntry>): Promise<void> {
    const entry = this.auditEntries.get(auditId);
    if (!entry) {
      throw new Error(`Audit entry ${auditId} not found`);
    }

    const updatedEntry = { ...entry, ...updates };
    this.auditEntries.set(auditId, updatedEntry);
  }

  async deleteOldAuditEntries(cutoffDate: string): Promise<void> {
    for (const [id, entry] of this.auditEntries.entries()) {
      if (entry.timestamp < cutoffDate) {
        this.auditEntries.delete(id);
      }
    }
  }
}