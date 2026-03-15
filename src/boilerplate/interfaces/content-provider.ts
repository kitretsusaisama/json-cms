/**
 * Content Provider Interface
 * 
 * Defines the contract for content storage backends (file system, database, etc.)
 */

import { PageV2, Block } from '@/types/composer';
import { SeoRecord } from '@/types/seo';

export interface RequestContext {
  tenantId?: string;
  userId?: string;
  locale?: string;
  environment?: string;
  preview?: boolean;
  headers?: Record<string, string>;
}

export interface ContentFilters {
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  tags?: string[];
  createdBy?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
}

export interface ContentList<T = unknown> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PageData extends PageV2 {
  tenantId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  metadata: Record<string, unknown>;
}

export interface BlockData extends Block {
  tenantId?: string;
  category: string;
  tags: string[];
  usage: BlockUsage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockUsage {
  pageId: string;
  position: number;
  lastUsed: string;
}

export interface SEOData extends SeoRecord {
  tenantId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type ContentType = 'page' | 'block' | 'component' | 'seo' | 'settings' | 'plugin';

export interface APIEnvelope<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    cacheKey?: string;
    tenant?: string;
    requestId?: string;
    status?: string;
  };
  errors?: APIError[];
  warnings?: string[];
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}

/**
 * Content Provider Interface
 * 
 * All content storage backends must implement this interface
 */
export interface ContentProvider {
  // Page operations
  getPage(slug: string, context: RequestContext): Promise<PageData | null>;
  setPage(slug: string, data: Partial<PageData>, context: RequestContext): Promise<PageData>;
  deletePage(slug: string, context: RequestContext): Promise<void>;
  listPages(filters: ContentFilters, context: RequestContext): Promise<ContentList<PageData>>;

  // Block operations
  getBlock(id: string, context: RequestContext): Promise<BlockData | null>;
  setBlock(id: string, data: Partial<BlockData>, context: RequestContext): Promise<BlockData>;
  deleteBlock(id: string, context: RequestContext): Promise<void>;
  listBlocks(filters: ContentFilters, context: RequestContext): Promise<ContentList<BlockData>>;

  // SEO operations
  getSEO(type: string, id: string, context: RequestContext): Promise<SEOData | null>;
  setSEO(type: string, id: string, data: Partial<SEOData>, context: RequestContext): Promise<SEOData>;
  deleteSEO(type: string, id: string, context: RequestContext): Promise<void>;
  listSEO(type: string, filters: ContentFilters, context: RequestContext): Promise<ContentList<SEOData>>;

  // Generic content operations
  getContent(type: ContentType, id: string, context: RequestContext): Promise<unknown>;
  setContent(type: ContentType, id: string, data: unknown, context: RequestContext): Promise<unknown>;
  deleteContent(type: ContentType, id: string, context: RequestContext): Promise<void>;
  listContent(type: ContentType, filters: ContentFilters, context: RequestContext): Promise<ContentList<unknown>>;

  // Health and status
  healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
  getStats(): Promise<Record<string, unknown>>;
}

/**
 * Provider Factory Interface
 */
export interface ProviderFactory {
  createProvider(config: ProviderConfig): Promise<ContentProvider>;
  validateConfig(config: ProviderConfig): Promise<boolean>;
}

export interface ProviderConfig {
  type: 'file' | 'database' | 'memory';
  options: Record<string, unknown>;
}

/**
 * Database Provider Configuration
 */
export interface DatabaseProviderConfig extends ProviderConfig {
  type: 'database';
  options: {
    connectionString: string;
    database: 'postgresql' | 'mongodb' | 'sqlite';
    poolSize?: number;
    timeout?: number;
    ssl?: boolean;
  };
}

/**
 * File Provider Configuration
 */
export interface FileProviderConfig extends ProviderConfig {
  type: 'file';
  options: {
    dataDir: string;
    enableBackup?: boolean;
    backupDir?: string;
    enableCompression?: boolean;
  };
}
