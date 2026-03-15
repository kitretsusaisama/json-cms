/**
 * Version Manager Tests
 */

import { VersionManager, InMemoryVersionStorage } from '../version-manager';
import { ContentVersion, VersioningConfig } from '../interfaces';

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let storage: InMemoryVersionStorage;

  beforeEach(() => {
    storage = new InMemoryVersionStorage();
    versionManager = new VersionManager(storage, {
      maxVersionsPerContent: 5,
      autoCleanupEnabled: true
    });
  });

  describe('createVersion', () => {
    test('should create first version with version number 1', async () => {
      const version = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Test Page' },
        { title: 'Initial version' },
        'user-1'
      );

      expect(version.version).toBe(1);
      expect(version.contentId).toBe('content-1');
      expect(version.contentType).toBe('page');
      expect(version.createdBy).toBe('user-1');
      expect(version.status).toBe('draft');
      expect(version.metadata.changeType).toBe('create');
    });

    test('should increment version number for subsequent versions', async () => {
      // Create first version
      await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Test Page' },
        { title: 'Initial version' },
        'user-1'
      );

      // Create second version
      const version2 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Updated Page' },
        { title: 'Updated version' },
        'user-1'
      );

      expect(version2.version).toBe(2);
      expect(version2.metadata.changeType).toBe('update');
    });

    test('should generate diff for updated content', async () => {
      // Create first version
      await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Original Title', content: 'Original content' },
        { title: 'Initial version' },
        'user-1'
      );

      // Create second version with changes
      const version2 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Updated Title', content: 'Original content' },
        { title: 'Updated version' },
        'user-1'
      );

      expect(version2.metadata.diff).toBeDefined();
      expect(version2.metadata.diff!.summary.totalChanges).toBeGreaterThan(0);
    });

    test('should set parent version reference', async () => {
      // Create first version
      const version1 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Test Page' },
        { title: 'Initial version' },
        'user-1'
      );

      // Create second version
      const version2 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Updated Page' },
        { title: 'Updated version' },
        'user-1'
      );

      expect(version2.parentVersion).toBe(version1.id);
    });
  });

  describe('getVersion', () => {
    test('should retrieve version by id', async () => {
      const created = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Test Page' },
        { title: 'Initial version' },
        'user-1'
      );

      const retrieved = await versionManager.getVersion(created.id);

      expect(retrieved).toEqual(created);
    });

    test('should return null for non-existent version', async () => {
      const retrieved = await versionManager.getVersion('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('getVersions', () => {
    beforeEach(async () => {
      // Create multiple versions
      for (let i = 1; i <= 3; i++) {
        await versionManager.createVersion(
          'content-1',
          'page',
          { title: `Page ${i}` },
          { title: `Version ${i}` },
          'user-1'
        );
      }
    });

    test('should retrieve all versions for content', async () => {
      const versions = await versionManager.getVersions('content-1');

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });

    test('should support pagination', async () => {
      const versions = await versionManager.getVersions('content-1', {
        limit: 2,
        offset: 1
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2);
      expect(versions[1].version).toBe(3);
    });

    test('should support sorting', async () => {
      const versions = await versionManager.getVersions('content-1', {
        sortBy: 'version',
        sortOrder: 'desc'
      });

      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    test('should filter by status', async () => {
      // Publish one version
      const versions = await versionManager.getVersions('content-1');
      await versionManager.publishVersion(versions[0].id, 'user-1');

      const draftVersions = await versionManager.getVersions('content-1', {
        status: ['draft']
      });

      expect(draftVersions).toHaveLength(2);
    });
  });

  describe('compareVersions', () => {
    test('should generate diff between two versions', async () => {
      const version1 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Original', content: 'Original content' },
        { title: 'Initial version' },
        'user-1'
      );

      const version2 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Updated', content: 'Updated content' },
        { title: 'Updated version' },
        'user-1'
      );

      const diff = await versionManager.compareVersions(version1.id, version2.id);

      expect(diff.summary.totalChanges).toBeGreaterThan(0);
      expect(diff.modified.length).toBeGreaterThan(0);
    });

    test('should throw error for non-existent versions', async () => {
      await expect(
        versionManager.compareVersions('non-existent-1', 'non-existent-2')
      ).rejects.toThrow('One or both versions not found');
    });
  });

  describe('rollbackToVersion', () => {
    test('should create new version with content from target version', async () => {
      const version1 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Original' },
        { title: 'Initial version' },
        'user-1'
      );

      await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Updated' },
        { title: 'Updated version' },
        'user-1'
      );

      const rollbackVersion = await versionManager.rollbackToVersion(
        'content-1',
        version1.id,
        'user-1'
      );

      expect(rollbackVersion.version).toBe(3);
      expect(rollbackVersion.content).toEqual(version1.content);
      expect(rollbackVersion.metadata.changeType).toBe('rollback');
    });

    test('should throw error for non-existent version', async () => {
      await expect(
        versionManager.rollbackToVersion('content-1', 'non-existent', 'user-1')
      ).rejects.toThrow('Version non-existent not found');
    });
  });

  describe('publishVersion', () => {
    test('should set version status to published', async () => {
      const version = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Test Page' },
        { title: 'Initial version' },
        'user-1'
      );

      await versionManager.publishVersion(version.id, 'user-1');

      const updated = await versionManager.getVersion(version.id);
      expect(updated!.status).toBe('published');
    });

    test('should unpublish other versions of same content', async () => {
      const version1 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Version 1' },
        { title: 'Initial version' },
        'user-1'
      );

      const version2 = await versionManager.createVersion(
        'content-1',
        'page',
        { title: 'Version 2' },
        { title: 'Updated version' },
        'user-1'
      );

      // Publish first version
      await versionManager.publishVersion(version1.id, 'user-1');

      // Publish second version
      await versionManager.publishVersion(version2.id, 'user-1');

      // Check that first version is now archived
      const updated1 = await versionManager.getVersion(version1.id);
      const updated2 = await versionManager.getVersion(version2.id);

      expect(updated1!.status).toBe('archived');
      expect(updated2!.status).toBe('published');
    });
  });

  describe('generateDiff', () => {
    test('should detect added properties', () => {
      const oldContent = { title: 'Test' };
      const newContent = { title: 'Test', description: 'Added description' };

      const diff = versionManager.generateDiff(oldContent, newContent);

      expect(diff.added.length).toBe(1);
      expect(diff.added[0].path).toBe('description');
      expect(diff.added[0].newValue).toBe('Added description');
    });

    test('should detect removed properties', () => {
      const oldContent = { title: 'Test', description: 'Will be removed' };
      const newContent = { title: 'Test' };

      const diff = versionManager.generateDiff(oldContent, newContent);

      expect(diff.removed.length).toBe(1);
      expect(diff.removed[0].path).toBe('description');
      expect(diff.removed[0].oldValue).toBe('Will be removed');
    });

    test('should detect modified properties', () => {
      const oldContent = { title: 'Original Title' };
      const newContent = { title: 'Updated Title' };

      const diff = versionManager.generateDiff(oldContent, newContent);

      expect(diff.modified.length).toBe(1);
      expect(diff.modified[0].path).toBe('title');
      expect(diff.modified[0].oldValue).toBe('Original Title');
      expect(diff.modified[0].newValue).toBe('Updated Title');
    });

    test('should return empty diff for identical content', () => {
      const content = { title: 'Test', description: 'Same content' };

      const diff = versionManager.generateDiff(content, content);

      expect(diff.summary.totalChanges).toBe(0);
      expect(diff.added.length).toBe(0);
      expect(diff.removed.length).toBe(0);
      expect(diff.modified.length).toBe(0);
    });
  });

  describe('auto cleanup', () => {
    test('should cleanup old versions when limit exceeded', async () => {
      // Create more versions than the limit
      for (let i = 1; i <= 7; i++) {
        await versionManager.createVersion(
          'content-1',
          'page',
          { title: `Page ${i}` },
          { title: `Version ${i}` },
          'user-1'
        );
      }

      const versions = await versionManager.getVersions('content-1');

      // Should only keep the configured maximum
      expect(versions.length).toBeLessThanOrEqual(5);
    });

    test('should not delete published versions during cleanup', async () => {
      // Create versions and publish one
      for (let i = 1; i <= 7; i++) {
        const version = await versionManager.createVersion(
          'content-1',
          'page',
          { title: `Page ${i}` },
          { title: `Version ${i}` },
          'user-1'
        );

        if (i === 3) {
          await versionManager.publishVersion(version.id, 'user-1');
        }
      }

      const versions = await versionManager.getVersions('content-1');
      const publishedVersions = versions.filter(v => v.status === 'published');

      expect(publishedVersions.length).toBe(1);
      expect(publishedVersions[0].version).toBe(3);
    });
  });
});