/**
 * File Provider Implementation
 * 
 * Extends the existing file-based system from src/lib/compose/resolve.ts
 * to implement the ContentProvider interface
 */

import { 
  ContentProvider, 
  RequestContext, 
  ContentFilters, 
  ContentList, 
  PageData, 
  BlockData, 
  SEOData, 
  ContentType,
  FileProviderConfig 
} from '../interfaces/content-provider';
import { PageV2, Block } from '@/types/composer';
import { SeoRecord } from '@/types/seo';
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export class FileProvider implements ContentProvider {
  private dataDir: string;
  private enableBackup: boolean;
  private backupDir: string;

  constructor(config: FileProviderConfig) {
    this.dataDir = config.options.dataDir || './src/data';
    this.enableBackup = config.options.enableBackup || false;
    this.backupDir = config.options.backupDir || join(this.dataDir, '.backups');
  }

  // Page operations
  async getPage(slug: string, context: RequestContext): Promise<PageData | null> {
    try {
      const filePath = this.getPagePath(slug, context);
      
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const pageJson = JSON.parse(content);
      
      // Convert to PageData format
      const pageData: PageData = {
        ...pageJson,
        id: pageJson.id || slug,
        tenantId: context.tenantId,
        createdBy: pageJson.createdBy || 'system',
        createdAt: pageJson.createdAt || new Date().toISOString(),
        updatedBy: pageJson.updatedBy || 'system',
        updatedAt: pageJson.updatedAt || new Date().toISOString(),
        publishedAt: pageJson.publishedAt,
        status: pageJson.status || 'published',
        version: pageJson.version || 1,
        metadata: pageJson.metadata || {}
      };

      return pageData;
    } catch (error) {
      console.error(`Failed to get page ${slug}:`, error);
      return null;
    }
  }

  async setPage(slug: string, data: Partial<PageData>, context: RequestContext): Promise<PageData> {
    try {
      const filePath = this.getPagePath(slug, context);
      
      // Ensure directory exists
      await this.ensureDirectoryExists(dirname(filePath));
      
      // Get existing page or create new one
      const existingPage = await this.getPage(slug, context);
      
      const pageData: PageData = {
        ...existingPage,
        ...data,
        id: slug,
        tenantId: context.tenantId,
        updatedBy: context.userId || 'system',
        updatedAt: new Date().toISOString(),
        version: (existingPage?.version || 0) + 1
      } as PageData;

      // Create backup if enabled
      if (this.enableBackup && existingPage) {
        await this.createBackup('page', slug, existingPage, context);
      }

      // Write to file
      await writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
      
      return pageData;
    } catch (error) {
      throw new Error(`Failed to set page ${slug}: ${error}`);
    }
  }

  async deletePage(slug: string, context: RequestContext): Promise<void> {
    try {
      const filePath = this.getPagePath(slug, context);
      
      if (!existsSync(filePath)) {
        return;
      }

      // Create backup before deletion
      if (this.enableBackup) {
        const existingPage = await this.getPage(slug, context);
        if (existingPage) {
          await this.createBackup('page', slug, existingPage, context);
        }
      }

      // For file system, we'll move to a deleted folder instead of actual deletion
      const deletedDir = join(this.dataDir, '.deleted', 'pages');
      await this.ensureDirectoryExists(deletedDir);
      
      const deletedPath = join(deletedDir, `${slug}-${Date.now()}.json`);
      const content = await readFile(filePath, 'utf-8');
      await writeFile(deletedPath, content, 'utf-8');
      
      // Remove original file
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete page ${slug}: ${error}`);
    }
  }

  async listPages(filters: ContentFilters, context: RequestContext): Promise<ContentList<PageData>> {
    try {
      const pagesDir = this.getPagesDir(context);
      
      if (!existsSync(pagesDir)) {
        return { items: [], total: 0, hasMore: false };
      }

      const files = await readdir(pagesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const pages: PageData[] = [];
      
      for (const file of jsonFiles) {
        const slug = file.replace('.json', '');
        const page = await this.getPage(slug, context);
        
        if (page && this.matchesFilters(page, filters)) {
          pages.push(page);
        }
      }

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedPages = pages.slice(offset, offset + limit);
      
      return {
        items: paginatedPages,
        total: pages.length,
        hasMore: offset + limit < pages.length
      };
    } catch (error) {
      throw new Error(`Failed to list pages: ${error}`);
    }
  }

  // Block operations
  async getBlock(id: string, context: RequestContext): Promise<BlockData | null> {
    try {
      const filePath = this.getBlockPath(id, context);
      
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const blockJson = JSON.parse(content);
      
      const blockData: BlockData = {
        ...blockJson,
        id: blockJson.id || id,
        tenantId: context.tenantId,
        category: blockJson.category || 'general',
        tags: blockJson.tags || [],
        usage: blockJson.usage || [],
        createdBy: blockJson.createdBy || 'system',
        createdAt: blockJson.createdAt || new Date().toISOString(),
        updatedAt: blockJson.updatedAt || new Date().toISOString()
      };

      return blockData;
    } catch (error) {
      console.error(`Failed to get block ${id}:`, error);
      return null;
    }
  }

  async setBlock(id: string, data: Partial<BlockData>, context: RequestContext): Promise<BlockData> {
    try {
      const filePath = this.getBlockPath(id, context);
      
      await this.ensureDirectoryExists(dirname(filePath));
      
      const existingBlock = await this.getBlock(id, context);
      
      const blockData: BlockData = {
        ...existingBlock,
        ...data,
        id,
        tenantId: context.tenantId,
        updatedAt: new Date().toISOString()
      } as BlockData;

      if (this.enableBackup && existingBlock) {
        await this.createBackup('block', id, existingBlock, context);
      }

      await writeFile(filePath, JSON.stringify(blockData, null, 2), 'utf-8');
      
      return blockData;
    } catch (error) {
      throw new Error(`Failed to set block ${id}: ${error}`);
    }
  }

  async deleteBlock(id: string, context: RequestContext): Promise<void> {
    try {
      const filePath = this.getBlockPath(id, context);
      
      if (!existsSync(filePath)) {
        return;
      }

      if (this.enableBackup) {
        const existingBlock = await this.getBlock(id, context);
        if (existingBlock) {
          await this.createBackup('block', id, existingBlock, context);
        }
      }

      const deletedDir = join(this.dataDir, '.deleted', 'blocks');
      await this.ensureDirectoryExists(deletedDir);
      
      const deletedPath = join(deletedDir, `${id}-${Date.now()}.json`);
      const content = await readFile(filePath, 'utf-8');
      await writeFile(deletedPath, content, 'utf-8');
      
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete block ${id}: ${error}`);
    }
  }

  async listBlocks(filters: ContentFilters, context: RequestContext): Promise<ContentList<BlockData>> {
    try {
      const blocksDir = this.getBlocksDir(context);
      
      if (!existsSync(blocksDir)) {
        return { items: [], total: 0, hasMore: false };
      }

      const files = await readdir(blocksDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const blocks: BlockData[] = [];
      
      for (const file of jsonFiles) {
        const id = file.replace('.json', '');
        const block = await this.getBlock(id, context);
        
        if (block && this.matchesFilters(block, filters)) {
          blocks.push(block);
        }
      }

      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedBlocks = blocks.slice(offset, offset + limit);
      
      return {
        items: paginatedBlocks,
        total: blocks.length,
        hasMore: offset + limit < blocks.length
      };
    } catch (error) {
      throw new Error(`Failed to list blocks: ${error}`);
    }
  }

  // SEO operations
  async getSEO(type: string, id: string, context: RequestContext): Promise<SEOData | null> {
    try {
      const filePath = this.getSEOPath(type, id, context);
      
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const seoJson = JSON.parse(content);
      
      const seoData: SEOData = {
        ...seoJson,
        tenantId: context.tenantId,
        createdBy: seoJson.createdBy || 'system',
        createdAt: seoJson.createdAt || new Date().toISOString(),
        updatedBy: seoJson.updatedBy || 'system',
        updatedAt: seoJson.updatedAt || new Date().toISOString()
      };

      return seoData;
    } catch (error) {
      console.error(`Failed to get SEO ${type}/${id}:`, error);
      return null;
    }
  }

  async setSEO(type: string, id: string, data: Partial<SEOData>, context: RequestContext): Promise<SEOData> {
    try {
      const filePath = this.getSEOPath(type, id, context);
      
      await this.ensureDirectoryExists(dirname(filePath));
      
      const existingSEO = await this.getSEO(type, id, context);
      
      const seoData: SEOData = {
        ...existingSEO,
        ...data,
        tenantId: context.tenantId,
        updatedBy: context.userId || 'system',
        updatedAt: new Date().toISOString()
      } as SEOData;

      if (this.enableBackup && existingSEO) {
        await this.createBackup('seo', `${type}-${id}`, existingSEO, context);
      }

      await writeFile(filePath, JSON.stringify(seoData, null, 2), 'utf-8');
      
      return seoData;
    } catch (error) {
      throw new Error(`Failed to set SEO ${type}/${id}: ${error}`);
    }
  }

  async deleteSEO(type: string, id: string, context: RequestContext): Promise<void> {
    try {
      const filePath = this.getSEOPath(type, id, context);
      
      if (!existsSync(filePath)) {
        return;
      }

      if (this.enableBackup) {
        const existingSEO = await this.getSEO(type, id, context);
        if (existingSEO) {
          await this.createBackup('seo', `${type}-${id}`, existingSEO, context);
        }
      }

      const deletedDir = join(this.dataDir, '.deleted', 'seo');
      await this.ensureDirectoryExists(deletedDir);
      
      const deletedPath = join(deletedDir, `${type}-${id}-${Date.now()}.json`);
      const content = await readFile(filePath, 'utf-8');
      await writeFile(deletedPath, content, 'utf-8');
      
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete SEO ${type}/${id}: ${error}`);
    }
  }

  async listSEO(type: string, filters: ContentFilters, context: RequestContext): Promise<ContentList<SEOData>> {
    try {
      const seoDir = join(this.getSEODir(context), type);
      
      if (!existsSync(seoDir)) {
        return { items: [], total: 0, hasMore: false };
      }

      const files = await readdir(seoDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const seoItems: SEOData[] = [];
      
      for (const file of jsonFiles) {
        const id = file.replace('.json', '');
        const seo = await this.getSEO(type, id, context);
        
        if (seo && this.matchesFilters(seo, filters)) {
          seoItems.push(seo);
        }
      }

      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedItems = seoItems.slice(offset, offset + limit);
      
      return {
        items: paginatedItems,
        total: seoItems.length,
        hasMore: offset + limit < seoItems.length
      };
    } catch (error) {
      throw new Error(`Failed to list SEO for type ${type}: ${error}`);
    }
  }

  // Generic content operations
  async getContent(type: ContentType, id: string, context: RequestContext): Promise<unknown> {
    switch (type) {
      case 'page':
        return this.getPage(id, context);
      case 'block':
        return this.getBlock(id, context);
      case 'seo':
        // For SEO, we need to parse the type from the id
        const [seoType, seoId] = id.split('/');
        return this.getSEO(seoType, seoId, context);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async setContent(type: ContentType, id: string, data: unknown, context: RequestContext): Promise<unknown> {
    switch (type) {
      case 'page':
        return this.setPage(id, data as Partial<PageData>, context);
      case 'block':
        return this.setBlock(id, data as Partial<BlockData>, context);
      case 'seo':
        const [seoType, seoId] = id.split('/');
        return this.setSEO(seoType, seoId, data as Partial<SEOData>, context);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async deleteContent(type: ContentType, id: string, context: RequestContext): Promise<void> {
    switch (type) {
      case 'page':
        return this.deletePage(id, context);
      case 'block':
        return this.deleteBlock(id, context);
      case 'seo':
        const [seoType, seoId] = id.split('/');
        return this.deleteSEO(seoType, seoId, context);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async listContent(type: ContentType, filters: ContentFilters, context: RequestContext): Promise<ContentList<unknown>> {
    switch (type) {
      case 'page':
        return this.listPages(filters, context);
      case 'block':
        return this.listBlocks(filters, context);
      case 'seo':
        // For SEO listing, we need a type filter
        const seoType = filters.category || 'page';
        return this.listSEO(seoType, filters, context);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  // Health and status
  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    try {
      // Check if data directory exists and is accessible
      const stats = await stat(this.dataDir);
      
      return {
        healthy: stats.isDirectory(),
        details: {
          dataDir: this.dataDir,
          accessible: true,
          enableBackup: this.enableBackup,
          backupDir: this.backupDir
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          dataDir: this.dataDir,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getStats(): Promise<Record<string, unknown>> {
    try {
      const stats = {
        provider: 'file',
        dataDir: this.dataDir,
        pages: 0,
        blocks: 0,
        seo: 0
      };

      // Count pages
      const pagesDir = join(this.dataDir, 'pages');
      if (existsSync(pagesDir)) {
        const pageFiles = await readdir(pagesDir);
        stats.pages = pageFiles.filter(f => f.endsWith('.json')).length;
      }

      // Count blocks
      const blocksDir = join(this.dataDir, 'blocks');
      if (existsSync(blocksDir)) {
        const blockFiles = await readdir(blocksDir);
        stats.blocks = blockFiles.filter(f => f.endsWith('.json')).length;
      }

      // Count SEO files
      const seoDir = join(this.dataDir, 'seo');
      if (existsSync(seoDir)) {
        const seoTypes = await readdir(seoDir);
        let seoCount = 0;
        for (const type of seoTypes) {
          const typeDir = join(seoDir, type);
          const typeStat = await stat(typeDir);
          if (typeStat.isDirectory()) {
            const seoFiles = await readdir(typeDir);
            seoCount += seoFiles.filter(f => f.endsWith('.json')).length;
          }
        }
        stats.seo = seoCount;
      }

      return stats;
    } catch (error) {
      return {
        provider: 'file',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private helper methods
  private getPagePath(slug: string, context: RequestContext): string {
    const baseDir = this.getPagesDir(context);
    return join(baseDir, `${slug}.json`);
  }

  private getBlockPath(id: string, context: RequestContext): string {
    const baseDir = this.getBlocksDir(context);
    return join(baseDir, `${id}.json`);
  }

  private getSEOPath(type: string, id: string, context: RequestContext): string {
    const baseDir = this.getSEODir(context);
    return join(baseDir, type, `${id}.json`);
  }

  private getPagesDir(context: RequestContext): string {
    if (context.tenantId) {
      return join(this.dataDir, 'tenants', context.tenantId, 'pages');
    }
    return join(this.dataDir, 'pages');
  }

  private getBlocksDir(context: RequestContext): string {
    if (context.tenantId) {
      return join(this.dataDir, 'tenants', context.tenantId, 'blocks');
    }
    return join(this.dataDir, 'blocks');
  }

  private getSEODir(context: RequestContext): string {
    if (context.tenantId) {
      return join(this.dataDir, 'tenants', context.tenantId, 'seo');
    }
    return join(this.dataDir, 'seo');
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private async createBackup(type: string, id: string, data: unknown, context: RequestContext): Promise<void> {
    if (!this.enableBackup) return;

    try {
      const backupDir = join(this.backupDir, type);
      await this.ensureDirectoryExists(backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = join(backupDir, `${id}-${timestamp}.json`);
      
      const backupData = {
        ...data,
        _backup: {
          originalId: id,
          backupTime: new Date().toISOString(),
          tenantId: context.tenantId,
          userId: context.userId
        }
      };

      await writeFile(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to create backup for ${type}/${id}:`, error);
      // Don't throw - backup failure shouldn't break the main operation
    }
  }

  private matchesFilters(item: any, filters: ContentFilters): boolean {
    if (filters.status && item.status !== filters.status) {
      return false;
    }

    if (filters.category && item.category !== filters.category) {
      return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const itemTags = item.tags || [];
      const hasMatchingTag = filters.tags.some(tag => itemTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    if (filters.createdBy && item.createdBy !== filters.createdBy) {
      return false;
    }

    if (filters.dateRange) {
      const itemDate = new Date(item.createdAt || item.updatedAt);
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      
      if (itemDate < fromDate || itemDate > toDate) {
        return false;
      }
    }

    return true;
  }
}