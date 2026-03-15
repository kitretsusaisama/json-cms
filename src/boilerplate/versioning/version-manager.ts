/**
 * Version Manager Implementation
 * 
 * Handles content version tracking, diff generation, and rollback functionality.
 */

import { createHash } from 'crypto';
import { 
  ContentVersion, 
  VersionMetadata, 
  ContentDiff, 
  DiffOperation, 
  DiffSummary,
  VersioningManager,
  VersionQueryOptions,
  ChangeType,
  VersionStatus,
  VersioningConfig
} from './interfaces';

export class VersionManager implements VersioningManager {
  private config: VersioningConfig;
  private storage: VersionStorage;

  constructor(storage: VersionStorage, config: Partial<VersioningConfig> = {}) {
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

  async createVersion(
    contentId: string,
    contentType: string,
    content: unknown,
    metadata: Partial<VersionMetadata>,
    userId: string,
    tenantId?: string
  ): Promise<ContentVersion> {
    // Get the latest version to calculate diff and version number
    const latestVersion = await this.getLatestVersion(contentId);
    const versionNumber = latestVersion ? latestVersion.version + 1 : 1;
    
    // Generate content diff if there's a previous version
    let diff: ContentDiff | undefined;
    if (latestVersion) {
      diff = this.generateDiff(latestVersion.content, content);
    }

    // Calculate content size and checksum
    const contentString = JSON.stringify(content);
    const size = Buffer.byteLength(contentString, 'utf8');
    const checksum = createHash('sha256').update(contentString).digest('hex');

    // Determine change type
    const changeType: ChangeType = latestVersion ? 'update' : 'create';

    const version: ContentVersion = {
      id: this.generateVersionId(),
      contentId,
      contentType: contentType as ContentVersion['contentType'],
      version: versionNumber,
      content,
      metadata: {
        changeType,
        size,
        checksum,
        diff,
        ...metadata
      },
      createdBy: userId,
      createdAt: new Date().toISOString(),
      tenantId,
      parentVersion: latestVersion?.id,
      status: this.config.approvalRequired ? 'pending_approval' : 'draft'
    };

    // Store the version
    await this.storage.saveVersion(version);

    // Auto-cleanup old versions if enabled
    if (this.config.autoCleanupEnabled) {
      await this.cleanupOldVersions(contentId);
    }

    return version;
  }

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    return await this.storage.getVersion(versionId);
  }

  async getVersions(contentId: string, options: VersionQueryOptions = {}): Promise<ContentVersion[]> {
    return await this.storage.getVersions(contentId, options);
  }

  async deleteVersion(versionId: string, userId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Don't allow deletion of published versions
    if (version.status === 'published') {
      throw new Error('Cannot delete published version');
    }

    await this.storage.deleteVersion(versionId);
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<ContentDiff> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    return this.generateDiff(version1.content, version2.content);
  }

  generateDiff(oldContent: unknown, newContent: unknown): ContentDiff {
    const operations: DiffOperation[] = [];
    
    // Convert to JSON for comparison
    const oldJson = JSON.stringify(oldContent, null, 2);
    const newJson = JSON.stringify(newContent, null, 2);
    
    if (oldJson === newJson) {
      return {
        added: [],
        removed: [],
        modified: [],
        summary: {
          totalChanges: 0,
          addedLines: 0,
          removedLines: 0,
          modifiedLines: 0,
          impactLevel: 'minor'
        }
      };
    }

    // Simple diff implementation - in production, use a proper diff library
    const diff = this.computeJsonDiff(oldContent, newContent, '');
    
    const added = diff.filter(op => op.type === 'add');
    const removed = diff.filter(op => op.type === 'remove');
    const modified = diff.filter(op => op.type === 'modify');

    const summary: DiffSummary = {
      totalChanges: diff.length,
      addedLines: added.length,
      removedLines: removed.length,
      modifiedLines: modified.length,
      impactLevel: this.calculateImpactLevel(diff)
    };

    return {
      added,
      removed,
      modified,
      summary
    };
  }

  async rollbackToVersion(contentId: string, versionId: string, userId: string): Promise<ContentVersion> {
    const targetVersion = await this.getVersion(versionId);
    if (!targetVersion) {
      throw new Error(`Version ${versionId} not found`);
    }

    if (targetVersion.contentId !== contentId) {
      throw new Error('Version does not belong to the specified content');
    }

    // Create a new version with the content from the target version
    return await this.createVersion(
      contentId,
      targetVersion.contentType,
      targetVersion.content,
      {
        title: `Rollback to version ${targetVersion.version}`,
        description: `Rolled back to version ${targetVersion.version} (${targetVersion.id})`,
        changeType: 'rollback'
      },
      userId,
      targetVersion.tenantId
    );
  }

  async restoreVersion(versionId: string, userId: string): Promise<ContentVersion> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Create a new version with restored content
    return await this.createVersion(
      version.contentId,
      version.contentType,
      version.content,
      {
        title: `Restore version ${version.version}`,
        description: `Restored version ${version.version} (${version.id})`,
        changeType: 'restore'
      },
      userId,
      version.tenantId
    );
  }

  async publishVersion(versionId: string, userId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Update version status
    version.status = 'published';
    await this.storage.updateVersion(version);

    // Unpublish other versions of the same content
    const otherVersions = await this.getVersions(version.contentId, {
      status: ['published']
    });

    for (const otherVersion of otherVersions) {
      if (otherVersion.id !== versionId) {
        otherVersion.status = 'archived';
        await this.storage.updateVersion(otherVersion);
      }
    }
  }

  async unpublishVersion(versionId: string, userId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    version.status = 'archived';
    await this.storage.updateVersion(version);
  }

  private async getLatestVersion(contentId: string): Promise<ContentVersion | null> {
    const versions = await this.getVersions(contentId, {
      limit: 1,
      sortBy: 'version',
      sortOrder: 'desc'
    });
    
    return versions.length > 0 ? versions[0] : null;
  }

  private async cleanupOldVersions(contentId: string): Promise<void> {
    const versions = await this.getVersions(contentId, {
      sortBy: 'version',
      sortOrder: 'desc'
    });

    if (versions.length <= this.config.maxVersionsPerContent) {
      return;
    }

    // Keep the most recent versions and published versions
    const versionsToDelete = versions
      .slice(this.config.maxVersionsPerContent)
      .filter(v => v.status !== 'published');

    for (const version of versionsToDelete) {
      await this.storage.deleteVersion(version.id);
    }
  }

  private generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private computeJsonDiff(oldObj: unknown, newObj: unknown, path: string): DiffOperation[] {
    const operations: DiffOperation[] = [];

    if (typeof oldObj !== typeof newObj) {
      operations.push({
        path,
        oldValue: oldObj,
        newValue: newObj,
        type: 'modify'
      });
      return operations;
    }

    if (oldObj === null || newObj === null || typeof oldObj !== 'object') {
      if (oldObj !== newObj) {
        operations.push({
          path,
          oldValue: oldObj,
          newValue: newObj,
          type: 'modify'
        });
      }
      return operations;
    }

    const oldKeys = Object.keys(oldObj as Record<string, unknown>);
    const newKeys = Object.keys(newObj as Record<string, unknown>);
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = (oldObj as Record<string, unknown>)[key];
      const newValue = (newObj as Record<string, unknown>)[key];

      if (!(key in (oldObj as Record<string, unknown>))) {
        operations.push({
          path: currentPath,
          newValue,
          type: 'add'
        });
      } else if (!(key in (newObj as Record<string, unknown>))) {
        operations.push({
          path: currentPath,
          oldValue,
          type: 'remove'
        });
      } else {
        operations.push(...this.computeJsonDiff(oldValue, newValue, currentPath));
      }
    }

    return operations;
  }

  private calculateImpactLevel(operations: DiffOperation[]): DiffSummary['impactLevel'] {
    const totalChanges = operations.length;
    
    if (totalChanges === 0) return 'minor';
    if (totalChanges <= 5) return 'minor';
    if (totalChanges <= 20) return 'major';
    return 'breaking';
  }
}

export interface VersionStorage {
  saveVersion(version: ContentVersion): Promise<void>;
  getVersion(versionId: string): Promise<ContentVersion | null>;
  getVersions(contentId: string, options?: VersionQueryOptions): Promise<ContentVersion[]>;
  updateVersion(version: ContentVersion): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
}

export class InMemoryVersionStorage implements VersionStorage {
  private versions = new Map<string, ContentVersion>();
  private contentVersions = new Map<string, string[]>();

  async saveVersion(version: ContentVersion): Promise<void> {
    this.versions.set(version.id, { ...version });
    
    const contentVersions = this.contentVersions.get(version.contentId) || [];
    contentVersions.push(version.id);
    this.contentVersions.set(version.contentId, contentVersions);
  }

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    const version = this.versions.get(versionId);
    return version ? { ...version } : null;
  }

  async getVersions(contentId: string, options: VersionQueryOptions = {}): Promise<ContentVersion[]> {
    const versionIds = this.contentVersions.get(contentId) || [];
    let versions = versionIds
      .map(id => this.versions.get(id))
      .filter((v): v is ContentVersion => v !== undefined);

    // Apply filters
    if (options.status) {
      versions = versions.filter(v => options.status!.includes(v.status));
    }

    if (options.createdBy) {
      versions = versions.filter(v => v.createdBy === options.createdBy);
    }

    if (options.dateRange) {
      versions = versions.filter(v => 
        v.createdAt >= options.dateRange!.start && 
        v.createdAt <= options.dateRange!.end
      );
    }

    // Sort
    if (options.sortBy) {
      versions.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || versions.length;
    
    return versions.slice(offset, offset + limit).map(v => ({ ...v }));
  }

  async updateVersion(version: ContentVersion): Promise<void> {
    if (!this.versions.has(version.id)) {
      throw new Error(`Version ${version.id} not found`);
    }
    this.versions.set(version.id, { ...version });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    this.versions.delete(versionId);
    
    const contentVersions = this.contentVersions.get(version.contentId) || [];
    const updatedVersions = contentVersions.filter(id => id !== versionId);
    this.contentVersions.set(version.contentId, updatedVersions);
  }
}