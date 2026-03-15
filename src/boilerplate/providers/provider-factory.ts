/**
 * Provider Factory
 * 
 * Creates and manages content provider instances based on configuration
 */

import { 
  ContentProvider, 
  ProviderFactory, 
  ProviderConfig, 
  DatabaseProviderConfig, 
  FileProviderConfig 
} from '../interfaces/content-provider';
import { FileProvider } from './file-provider';
import { BaseDatabaseProvider } from './database-provider';
import { PostgreSQLAdapter } from './adapters/postgresql-adapter';
import { MongoDBAdapter } from './adapters/mongodb-adapter';
import { SQLiteAdapter } from './adapters/sqlite-adapter';

export class ContentProviderFactory implements ProviderFactory {
  private static instance: ContentProviderFactory;
  private providers = new Map<string, ContentProvider>();

  static getInstance(): ContentProviderFactory {
    if (!ContentProviderFactory.instance) {
      ContentProviderFactory.instance = new ContentProviderFactory();
    }
    return ContentProviderFactory.instance;
  }

  async createProvider(config: ProviderConfig): Promise<ContentProvider> {
    const configKey = this.getConfigKey(config);
    
    // Return existing provider if already created
    if (this.providers.has(configKey)) {
      return this.providers.get(configKey)!;
    }

    let provider: ContentProvider;

    switch (config.type) {
      case 'file':
        provider = await this.createFileProvider(config as FileProviderConfig);
        break;
        
      case 'database':
        provider = await this.createDatabaseProvider(config as DatabaseProviderConfig);
        break;
        
      case 'memory':
        provider = await this.createMemoryProvider(config);
        break;
        
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Cache the provider
    this.providers.set(configKey, provider);
    
    return provider;
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    try {
      switch (config.type) {
        case 'file':
          return this.validateFileConfig(config as FileProviderConfig);
          
        case 'database':
          return this.validateDatabaseConfig(config as DatabaseProviderConfig);
          
        case 'memory':
          return this.validateMemoryConfig(config);
          
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async destroyProvider(config: ProviderConfig): Promise<void> {
    const configKey = this.getConfigKey(config);
    const provider = this.providers.get(configKey);
    
    if (provider) {
      // If it's a database provider, clean up connections
      if ('destroy' in provider && typeof provider.destroy === 'function') {
        await (provider as any).destroy();
      }
      
      this.providers.delete(configKey);
    }
  }

  async destroyAllProviders(): Promise<void> {
    const destroyPromises = Array.from(this.providers.entries()).map(async ([key, provider]) => {
      if ('destroy' in provider && typeof provider.destroy === 'function') {
        await (provider as any).destroy();
      }
    });
    
    await Promise.all(destroyPromises);
    this.providers.clear();
  }

  getActiveProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // Private methods
  private async createFileProvider(config: FileProviderConfig): Promise<ContentProvider> {
    const provider = new FileProvider(config);
    
    // Validate that the provider can perform basic operations
    const healthCheck = await provider.healthCheck();
    if (!healthCheck.healthy) {
      throw new Error(`File provider health check failed: ${JSON.stringify(healthCheck.details)}`);
    }
    
    return provider;
  }

  private async createDatabaseProvider(config: DatabaseProviderConfig): Promise<ContentProvider> {
    let adapter;
    
    switch (config.options.database) {
      case 'postgresql':
        adapter = new PostgreSQLAdapter();
        break;
        
      case 'mongodb':
        adapter = new MongoDBAdapter();
        break;
        
      case 'sqlite':
        adapter = new SQLiteAdapter();
        break;
        
      default:
        throw new Error(`Unsupported database type: ${config.options.database}`);
    }

    const provider = new DatabaseProviderImpl(config, adapter);
    await provider.initialize();
    
    return provider;
  }

  private async createMemoryProvider(config: ProviderConfig): Promise<ContentProvider> {
    return new MemoryProvider(config);
  }

  private validateFileConfig(config: FileProviderConfig): boolean {
    if (!config.options.dataDir) {
      throw new Error('File provider requires dataDir option');
    }
    
    // Additional validation could check if directory exists and is writable
    return true;
  }

  private validateDatabaseConfig(config: DatabaseProviderConfig): boolean {
    if (!config.options.connectionString) {
      throw new Error('Database provider requires connectionString option');
    }
    
    if (!['postgresql', 'mongodb', 'sqlite'].includes(config.options.database)) {
      throw new Error('Database provider requires valid database type (postgresql, mongodb, sqlite)');
    }
    
    return true;
  }

  private validateMemoryConfig(config: ProviderConfig): boolean {
    // Memory provider has no specific requirements
    return true;
  }

  private getConfigKey(config: ProviderConfig): string {
    // Create a unique key for the configuration
    const keyData = {
      type: config.type,
      options: config.options
    };
    
    return JSON.stringify(keyData);
  }
}

// Database Provider Implementation
class DatabaseProviderImpl extends BaseDatabaseProvider {
  // This class extends BaseDatabaseProvider and provides the concrete implementation
}

// Memory Provider Implementation
class MemoryProvider implements ContentProvider {
  private pages = new Map<string, any>();
  private blocks = new Map<string, any>();
  private seo = new Map<string, any>();
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async getPage(slug: string, context: any): Promise<any> {
    const key = this.getKey('page', slug, context);
    return this.pages.get(key) || null;
  }

  async setPage(slug: string, data: any, context: any): Promise<any> {
    const key = this.getKey('page', slug, context);
    const pageData = {
      ...data,
      id: slug,
      tenantId: context.tenantId,
      updatedAt: new Date().toISOString()
    };
    
    this.pages.set(key, pageData);
    return pageData;
  }

  async deletePage(slug: string, context: any): Promise<void> {
    const key = this.getKey('page', slug, context);
    this.pages.delete(key);
  }

  async listPages(filters: any, context: any): Promise<any> {
    const items = Array.from(this.pages.values())
      .filter(page => !context.tenantId || page.tenantId === context.tenantId);
    
    return {
      items,
      total: items.length,
      hasMore: false
    };
  }

  async getBlock(id: string, context: any): Promise<any> {
    const key = this.getKey('block', id, context);
    return this.blocks.get(key) || null;
  }

  async setBlock(id: string, data: any, context: any): Promise<any> {
    const key = this.getKey('block', id, context);
    const blockData = {
      ...data,
      id,
      tenantId: context.tenantId,
      updatedAt: new Date().toISOString()
    };
    
    this.blocks.set(key, blockData);
    return blockData;
  }

  async deleteBlock(id: string, context: any): Promise<void> {
    const key = this.getKey('block', id, context);
    this.blocks.delete(key);
  }

  async listBlocks(filters: any, context: any): Promise<any> {
    const items = Array.from(this.blocks.values())
      .filter(block => !context.tenantId || block.tenantId === context.tenantId);
    
    return {
      items,
      total: items.length,
      hasMore: false
    };
  }

  async getSEO(type: string, id: string, context: any): Promise<any> {
    const key = this.getKey('seo', `${type}/${id}`, context);
    return this.seo.get(key) || null;
  }

  async setSEO(type: string, id: string, data: any, context: any): Promise<any> {
    const key = this.getKey('seo', `${type}/${id}`, context);
    const seoData = {
      ...data,
      type,
      referenceId: id,
      tenantId: context.tenantId,
      updatedAt: new Date().toISOString()
    };
    
    this.seo.set(key, seoData);
    return seoData;
  }

  async deleteSEO(type: string, id: string, context: any): Promise<void> {
    const key = this.getKey('seo', `${type}/${id}`, context);
    this.seo.delete(key);
  }

  async listSEO(type: string, filters: any, context: any): Promise<any> {
    const items = Array.from(this.seo.values())
      .filter(seo => seo.type === type && (!context.tenantId || seo.tenantId === context.tenantId));
    
    return {
      items,
      total: items.length,
      hasMore: false
    };
  }

  async getContent(type: any, id: string, context: any): Promise<any> {
    switch (type) {
      case 'page': return this.getPage(id, context);
      case 'block': return this.getBlock(id, context);
      case 'seo': 
        const [seoType, seoId] = id.split('/');
        return this.getSEO(seoType, seoId, context);
      default: return null;
    }
  }

  async setContent(type: any, id: string, data: any, context: any): Promise<any> {
    switch (type) {
      case 'page': return this.setPage(id, data, context);
      case 'block': return this.setBlock(id, data, context);
      case 'seo':
        const [seoType, seoId] = id.split('/');
        return this.setSEO(seoType, seoId, data, context);
      default: throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async deleteContent(type: any, id: string, context: any): Promise<void> {
    switch (type) {
      case 'page': return this.deletePage(id, context);
      case 'block': return this.deleteBlock(id, context);
      case 'seo':
        const [seoType, seoId] = id.split('/');
        return this.deleteSEO(seoType, seoId, context);
      default: throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async listContent(type: any, filters: any, context: any): Promise<any> {
    switch (type) {
      case 'page': return this.listPages(filters, context);
      case 'block': return this.listBlocks(filters, context);
      case 'seo':
        const seoType = filters.category || 'page';
        return this.listSEO(seoType, filters, context);
      default: throw new Error(`Unsupported content type: ${type}`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    return {
      healthy: true,
      details: {
        provider: 'memory',
        pages: this.pages.size,
        blocks: this.blocks.size,
        seo: this.seo.size
      }
    };
  }

  async getStats(): Promise<Record<string, unknown>> {
    return {
      provider: 'memory',
      pages: this.pages.size,
      blocks: this.blocks.size,
      seo: this.seo.size
    };
  }

  private getKey(type: string, id: string, context: any): string {
    return `${context.tenantId || 'default'}:${type}:${id}`;
  }
}

// Utility functions
export function createFileProvider(dataDir: string, options?: Partial<FileProviderConfig['options']>): Promise<ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  return factory.createProvider({
    type: 'file',
    options: {
      dataDir,
      ...options
    }
  });
}

export function createDatabaseProvider(
  database: 'postgresql' | 'mongodb' | 'sqlite',
  connectionString: string,
  options?: Partial<DatabaseProviderConfig['options']>
): Promise<ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  return factory.createProvider({
    type: 'database',
    options: {
      database,
      connectionString,
      ...options
    }
  });
}

export function createMemoryProvider(): Promise<ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  return factory.createProvider({
    type: 'memory',
    options: {}
  });
}

// Configuration from environment
export function createProviderFromEnv(): Promise<ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  
  const providerType = process.env.CMS_PROVIDER || 'file';
  
  switch (providerType) {
    case 'file':
      return factory.createProvider({
        type: 'file',
        options: {
          dataDir: process.env.DATA_DIR || './src/data',
          enableBackup: process.env.CMS_ENABLE_BACKUP === 'true',
          backupDir: process.env.CMS_BACKUP_DIR
        }
      });
      
    case 'database':
      const database = process.env.CMS_DATABASE as 'postgresql' | 'mongodb' | 'sqlite';
      const connectionString = process.env.CMS_CONNECTION_STRING;
      
      if (!database || !connectionString) {
        throw new Error('Database provider requires CMS_DATABASE and CMS_CONNECTION_STRING environment variables');
      }
      
      return factory.createProvider({
        type: 'database',
        options: {
          database,
          connectionString,
          poolSize: parseInt(process.env.CMS_POOL_SIZE || '10'),
          timeout: parseInt(process.env.CMS_TIMEOUT || '30000'),
          ssl: process.env.CMS_SSL === 'true'
        }
      });
      
    case 'memory':
      return factory.createProvider({
        type: 'memory',
        options: {}
      });
      
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

export default ContentProviderFactory;