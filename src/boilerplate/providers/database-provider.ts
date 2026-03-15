/**
 * Database Provider Interface and Base Implementation
 * 
 * Provides database storage backend for content with support for
 * PostgreSQL, MongoDB, and SQLite adapters
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
  DatabaseProviderConfig 
} from '../interfaces/content-provider';

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }>;
  transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
}

export interface DatabaseAdapter {
  createConnection(connectionString: string, options?: Record<string, unknown>): Promise<DatabaseConnection>;
  validateConnection(connection: DatabaseConnection): Promise<boolean>;
  createTables(connection: DatabaseConnection): Promise<void>;
  dropTables(connection: DatabaseConnection): Promise<void>;
}

export abstract class BaseDatabaseProvider implements ContentProvider {
  protected connection: DatabaseConnection;
  protected adapter: DatabaseAdapter;
  protected config: DatabaseProviderConfig;

  constructor(config: DatabaseProviderConfig, adapter: DatabaseAdapter) {
    this.config = config;
    this.adapter = adapter;
  }

  async initialize(): Promise<void> {
    this.connection = await this.adapter.createConnection(
      this.config.options.connectionString,
      {
        poolSize: this.config.options.poolSize || 10,
        timeout: this.config.options.timeout || 30000,
        ssl: this.config.options.ssl || false
      }
    );

    await this.connection.connect();
    await this.adapter.createTables(this.connection);
  }

  async destroy(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }

  // Page operations
  async getPage(slug: string, context: RequestContext): Promise<PageData | null> {
    try {
      const sql = `
        SELECT * FROM cms_pages 
        WHERE slug = ? AND (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY tenant_id DESC
        LIMIT 1
      `;
      
      const results = await this.connection.query(sql, [slug, context.tenantId]);
      
      if (!results || results.length === 0) {
        return null;
      }

      const row = results[0] as any;
      return this.mapRowToPageData(row);
    } catch (error) {
      console.error(`Failed to get page ${slug}:`, error);
      return null;
    }
  }

  async setPage(slug: string, data: Partial<PageData>, context: RequestContext): Promise<PageData> {
    try {
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

      if (existingPage) {
        // Update existing page
        const sql = `
          UPDATE cms_pages 
          SET title = ?, content = ?, status = ?, version = ?, 
              updated_by = ?, updated_at = ?, published_at = ?, metadata = ?
          WHERE slug = ? AND (tenant_id = ? OR tenant_id IS NULL)
        `;
        
        await this.connection.execute(sql, [
          pageData.title,
          JSON.stringify(pageData),
          pageData.status,
          pageData.version,
          pageData.updatedBy,
          pageData.updatedAt,
          pageData.publishedAt,
          JSON.stringify(pageData.metadata),
          slug,
          context.tenantId
        ]);
      } else {
        // Insert new page
        const sql = `
          INSERT INTO cms_pages 
          (slug, title, content, status, version, tenant_id, created_by, created_at, updated_by, updated_at, published_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        pageData.createdBy = context.userId || 'system';
        pageData.createdAt = new Date().toISOString();
        
        await this.connection.execute(sql, [
          slug,
          pageData.title,
          JSON.stringify(pageData),
          pageData.status,
          pageData.version,
          context.tenantId,
          pageData.createdBy,
          pageData.createdAt,
          pageData.updatedBy,
          pageData.updatedAt,
          pageData.publishedAt,
          JSON.stringify(pageData.metadata)
        ]);
      }

      return pageData;
    } catch (error) {
      throw new Error(`Failed to set page ${slug}: ${error}`);
    }
  }

  async deletePage(slug: string, context: RequestContext): Promise<void> {
    try {
      const sql = `
        DELETE FROM cms_pages 
        WHERE slug = ? AND (tenant_id = ? OR tenant_id IS NULL)
      `;
      
      await this.connection.execute(sql, [slug, context.tenantId]);
    } catch (error) {
      throw new Error(`Failed to delete page ${slug}: ${error}`);
    }
  }

  async listPages(filters: ContentFilters, context: RequestContext): Promise<ContentList<PageData>> {
    try {
      let sql = `
        SELECT * FROM cms_pages 
        WHERE (tenant_id = ? OR tenant_id IS NULL)
      `;
      const params: unknown[] = [context.tenantId];

      // Apply filters
      if (filters.status) {
        sql += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.createdBy) {
        sql += ` AND created_by = ?`;
        params.push(filters.createdBy);
      }

      if (filters.dateRange) {
        sql += ` AND created_at BETWEEN ? AND ?`;
        params.push(filters.dateRange.from, filters.dateRange.to);
      }

      // Count total
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResults = await this.connection.query(countSql, params);
      const total = (countResults[0] as any).total;

      // Apply pagination
      sql += ` ORDER BY updated_at DESC`;
      
      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }

      const results = await this.connection.query(sql, params);
      const pages = results.map(row => this.mapRowToPageData(row as any));

      return {
        items: pages,
        total,
        hasMore: (filters.offset || 0) + pages.length < total
      };
    } catch (error) {
      throw new Error(`Failed to list pages: ${error}`);
    }
  }

  // Block operations
  async getBlock(id: string, context: RequestContext): Promise<BlockData | null> {
    try {
      const sql = `
        SELECT * FROM cms_blocks 
        WHERE block_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY tenant_id DESC
        LIMIT 1
      `;
      
      const results = await this.connection.query(sql, [id, context.tenantId]);
      
      if (!results || results.length === 0) {
        return null;
      }

      const row = results[0] as any;
      return this.mapRowToBlockData(row);
    } catch (error) {
      console.error(`Failed to get block ${id}:`, error);
      return null;
    }
  }

  async setBlock(id: string, data: Partial<BlockData>, context: RequestContext): Promise<BlockData> {
    try {
      const existingBlock = await this.getBlock(id, context);
      
      const blockData: BlockData = {
        ...existingBlock,
        ...data,
        id,
        tenantId: context.tenantId,
        updatedAt: new Date().toISOString()
      } as BlockData;

      if (existingBlock) {
        const sql = `
          UPDATE cms_blocks 
          SET name = ?, category = ?, content = ?, tags = ?, updated_at = ?
          WHERE block_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
        `;
        
        await this.connection.execute(sql, [
          blockData.name,
          blockData.category,
          JSON.stringify(blockData),
          JSON.stringify(blockData.tags),
          blockData.updatedAt,
          id,
          context.tenantId
        ]);
      } else {
        const sql = `
          INSERT INTO cms_blocks 
          (block_id, name, category, content, tags, tenant_id, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        blockData.createdBy = context.userId || 'system';
        blockData.createdAt = new Date().toISOString();
        
        await this.connection.execute(sql, [
          id,
          blockData.name,
          blockData.category,
          JSON.stringify(blockData),
          JSON.stringify(blockData.tags),
          context.tenantId,
          blockData.createdBy,
          blockData.createdAt,
          blockData.updatedAt
        ]);
      }

      return blockData;
    } catch (error) {
      throw new Error(`Failed to set block ${id}: ${error}`);
    }
  }

  async deleteBlock(id: string, context: RequestContext): Promise<void> {
    try {
      const sql = `
        DELETE FROM cms_blocks 
        WHERE block_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
      `;
      
      await this.connection.execute(sql, [id, context.tenantId]);
    } catch (error) {
      throw new Error(`Failed to delete block ${id}: ${error}`);
    }
  }

  async listBlocks(filters: ContentFilters, context: RequestContext): Promise<ContentList<BlockData>> {
    try {
      let sql = `
        SELECT * FROM cms_blocks 
        WHERE (tenant_id = ? OR tenant_id IS NULL)
      `;
      const params: unknown[] = [context.tenantId];

      if (filters.category) {
        sql += ` AND category = ?`;
        params.push(filters.category);
      }

      if (filters.createdBy) {
        sql += ` AND created_by = ?`;
        params.push(filters.createdBy);
      }

      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResults = await this.connection.query(countSql, params);
      const total = (countResults[0] as any).total;

      sql += ` ORDER BY updated_at DESC`;
      
      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }

      const results = await this.connection.query(sql, params);
      const blocks = results.map(row => this.mapRowToBlockData(row as any));

      return {
        items: blocks,
        total,
        hasMore: (filters.offset || 0) + blocks.length < total
      };
    } catch (error) {
      throw new Error(`Failed to list blocks: ${error}`);
    }
  }

  // SEO operations
  async getSEO(type: string, id: string, context: RequestContext): Promise<SEOData | null> {
    try {
      const sql = `
        SELECT * FROM cms_seo 
        WHERE type = ? AND reference_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY tenant_id DESC
        LIMIT 1
      `;
      
      const results = await this.connection.query(sql, [type, id, context.tenantId]);
      
      if (!results || results.length === 0) {
        return null;
      }

      const row = results[0] as any;
      return this.mapRowToSEOData(row);
    } catch (error) {
      console.error(`Failed to get SEO ${type}/${id}:`, error);
      return null;
    }
  }

  async setSEO(type: string, id: string, data: Partial<SEOData>, context: RequestContext): Promise<SEOData> {
    try {
      const existingSEO = await this.getSEO(type, id, context);
      
      const seoData: SEOData = {
        ...existingSEO,
        ...data,
        tenantId: context.tenantId,
        updatedBy: context.userId || 'system',
        updatedAt: new Date().toISOString()
      } as SEOData;

      if (existingSEO) {
        const sql = `
          UPDATE cms_seo 
          SET title = ?, description = ?, canonical = ?, robots = ?, 
              meta_data = ?, structured_data = ?, updated_at = ?
          WHERE type = ? AND reference_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
        `;
        
        await this.connection.execute(sql, [
          seoData.title,
          seoData.description,
          seoData.canonical,
          seoData.robots,
          JSON.stringify(seoData.meta || {}),
          JSON.stringify(seoData.structuredData || []),
          seoData.updatedAt,
          type,
          id,
          context.tenantId
        ]);
      } else {
        const sql = `
          INSERT INTO cms_seo 
          (type, reference_id, title, description, canonical, robots, meta_data, structured_data, tenant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        seoData.createdBy = context.userId || 'system';
        seoData.createdAt = new Date().toISOString();
        
        await this.connection.execute(sql, [
          type,
          id,
          seoData.title,
          seoData.description,
          seoData.canonical,
          seoData.robots,
          JSON.stringify(seoData.meta || {}),
          JSON.stringify(seoData.structuredData || []),
          context.tenantId,
          seoData.createdAt,
          seoData.updatedAt
        ]);
      }

      return seoData;
    } catch (error) {
      throw new Error(`Failed to set SEO ${type}/${id}: ${error}`);
    }
  }

  async deleteSEO(type: string, id: string, context: RequestContext): Promise<void> {
    try {
      const sql = `
        DELETE FROM cms_seo 
        WHERE type = ? AND reference_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
      `;
      
      await this.connection.execute(sql, [type, id, context.tenantId]);
    } catch (error) {
      throw new Error(`Failed to delete SEO ${type}/${id}: ${error}`);
    }
  }

  async listSEO(type: string, filters: ContentFilters, context: RequestContext): Promise<ContentList<SEOData>> {
    try {
      let sql = `
        SELECT * FROM cms_seo 
        WHERE type = ? AND (tenant_id = ? OR tenant_id IS NULL)
      `;
      const params: unknown[] = [type, context.tenantId];

      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResults = await this.connection.query(countSql, params);
      const total = (countResults[0] as any).total;

      sql += ` ORDER BY updated_at DESC`;
      
      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }

      const results = await this.connection.query(sql, params);
      const seoItems = results.map(row => this.mapRowToSEOData(row as any));

      return {
        items: seoItems,
        total,
        hasMore: (filters.offset || 0) + seoItems.length < total
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
        const seoType = filters.category || 'page';
        return this.listSEO(seoType, filters, context);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  // Health and status
  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    try {
      const isConnected = this.connection && this.connection.isConnected();
      
      if (!isConnected) {
        return {
          healthy: false,
          details: {
            provider: 'database',
            database: this.config.options.database,
            connected: false
          }
        };
      }

      // Test with a simple query
      await this.connection.query('SELECT 1');
      
      return {
        healthy: true,
        details: {
          provider: 'database',
          database: this.config.options.database,
          connected: true,
          connectionString: this.config.options.connectionString.replace(/password=[^;]+/i, 'password=***')
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          provider: 'database',
          database: this.config.options.database,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getStats(): Promise<Record<string, unknown>> {
    try {
      const stats = {
        provider: 'database',
        database: this.config.options.database,
        pages: 0,
        blocks: 0,
        seo: 0
      };

      // Count pages
      const pageResults = await this.connection.query('SELECT COUNT(*) as count FROM cms_pages');
      stats.pages = (pageResults[0] as any).count;

      // Count blocks
      const blockResults = await this.connection.query('SELECT COUNT(*) as count FROM cms_blocks');
      stats.blocks = (blockResults[0] as any).count;

      // Count SEO records
      const seoResults = await this.connection.query('SELECT COUNT(*) as count FROM cms_seo');
      stats.seo = (seoResults[0] as any).count;

      return stats;
    } catch (error) {
      return {
        provider: 'database',
        database: this.config.options.database,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Protected helper methods for mapping database rows to data objects
  protected mapRowToPageData(row: any): PageData {
    const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    
    return {
      ...content,
      id: row.slug,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      status: row.status,
      version: row.version,
      metadata: metadata || {}
    };
  }

  protected mapRowToBlockData(row: any): BlockData {
    const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    
    return {
      ...content,
      id: row.block_id,
      tenantId: row.tenant_id,
      category: row.category,
      tags: tags || [],
      usage: [], // This would need to be calculated separately
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  protected mapRowToSEOData(row: any): SEOData {
    const metaData = typeof row.meta_data === 'string' ? JSON.parse(row.meta_data) : row.meta_data;
    const structuredData = typeof row.structured_data === 'string' ? JSON.parse(row.structured_data) : row.structured_data;
    
    return {
      id: `${row.type}-${row.reference_id}`,
      type: row.type,
      referenceId: row.reference_id,
      title: row.title,
      description: row.description,
      canonical: row.canonical,
      robots: row.robots,
      meta: metaData || {},
      structuredData: structuredData || [],
      tenantId: row.tenant_id,
      createdBy: row.created_by || 'system',
      createdAt: row.created_at,
      updatedBy: row.updated_by || 'system',
      updatedAt: row.updated_at
    };
  }
}