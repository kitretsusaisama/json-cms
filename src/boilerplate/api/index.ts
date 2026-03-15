/**
 * API Bridge System - Main Export
 * 
 * Exports all components of the enhanced API bridge system
 */

// Core interfaces
export * from '../interfaces/content-provider';

// Providers
export { FileProvider } from '../providers/file-provider';
export { BaseDatabaseProvider } from '../providers/database-provider';
export { 
  ContentProviderFactory,
  createFileProvider,
  createDatabaseProvider,
  createMemoryProvider,
  createProviderFromEnv
} from '../providers/provider-factory';

// Database adapters
export { PostgreSQLAdapter, PostgreSQLConnection } from '../providers/adapters/postgresql-adapter';
export { MongoDBAdapter, MongoDBConnection } from '../providers/adapters/mongodb-adapter';
export { SQLiteAdapter, SQLiteConnection } from '../providers/adapters/sqlite-adapter';

// API client
export { 
  APIClient,
  APIClientError,
  createAPIClient,
  createAuthenticatedClient,
  createTenantClient,
  useAPIClient,
  defaultAPIClient
} from './client';
export type { APIClientConfig, RequestOptions } from './client';

// API envelope
export {
  APIEnvelopeBuilder,
  APIErrorBuilder,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  internalErrorResponse,
  badRequestResponse,
  paginatedResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  extractRequestMeta,
  isAPIEnvelope,
  isAPIError,
  handleProviderError,
  wrapProviderCall,
  getHTTPStatus
} from './envelope';

// Utility functions for common patterns
export async function initializeProvider(providerType?: string): Promise<import('../interfaces/content-provider').ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  
  if (providerType) {
    // Create provider based on explicit type
    switch (providerType) {
      case 'file':
        return createFileProvider(process.env.DATA_DIR || './src/data');
      case 'memory':
        return createMemoryProvider();
      case 'database':
        return createProviderFromEnv();
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }
  
  // Create provider from environment
  return createProviderFromEnv();
}

export async function validateProviderConfig(config: import('../interfaces/content-provider').ProviderConfig): Promise<boolean> {
  const factory = ContentProviderFactory.getInstance();
  return factory.validateConfig(config);
}

export async function createProviderWithHealthCheck(config: import('../interfaces/content-provider').ProviderConfig): Promise<import('../interfaces/content-provider').ContentProvider> {
  const factory = ContentProviderFactory.getInstance();
  const provider = await factory.createProvider(config);
  
  const health = await provider.healthCheck();
  if (!health.healthy) {
    throw new Error(`Provider health check failed: ${JSON.stringify(health.details)}`);
  }
  
  return provider;
}

// Default configuration helpers
export const DEFAULT_FILE_CONFIG: import('../interfaces/content-provider').FileProviderConfig = {
  type: 'file',
  options: {
    dataDir: './src/data',
    enableBackup: false,
    enableCompression: false
  }
};

export const DEFAULT_MEMORY_CONFIG: import('../interfaces/content-provider').ProviderConfig = {
  type: 'memory',
  options: {}
};

export function createDefaultDatabaseConfig(
  database: 'postgresql' | 'mongodb' | 'sqlite',
  connectionString: string
): import('../interfaces/content-provider').DatabaseProviderConfig {
  return {
    type: 'database',
    options: {
      database,
      connectionString,
      poolSize: 10,
      timeout: 30000,
      ssl: false
    }
  };
}

// Environment variable helpers
export function getProviderConfigFromEnv(): import('../interfaces/content-provider').ProviderConfig {
  const providerType = process.env.CMS_PROVIDER || 'file';
  
  switch (providerType) {
    case 'file':
      return {
        type: 'file',
        options: {
          dataDir: process.env.DATA_DIR || './src/data',
          enableBackup: process.env.CMS_ENABLE_BACKUP === 'true',
          backupDir: process.env.CMS_BACKUP_DIR,
          enableCompression: process.env.CMS_ENABLE_COMPRESSION === 'true'
        }
      };
      
    case 'database':
      const database = process.env.CMS_DATABASE as 'postgresql' | 'mongodb' | 'sqlite';
      const connectionString = process.env.CMS_CONNECTION_STRING;
      
      if (!database || !connectionString) {
        throw new Error('Database provider requires CMS_DATABASE and CMS_CONNECTION_STRING environment variables');
      }
      
      return {
        type: 'database',
        options: {
          database,
          connectionString,
          poolSize: parseInt(process.env.CMS_POOL_SIZE || '10'),
          timeout: parseInt(process.env.CMS_TIMEOUT || '30000'),
          ssl: process.env.CMS_SSL === 'true'
        }
      };
      
    case 'memory':
      return {
        type: 'memory',
        options: {}
      };
      
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

// API client configuration helpers
export function createAPIClientFromEnv(): APIClient {
  return createAPIClient({
    baseUrl: process.env.CMS_API_BASE_URL || '/api/cms',
    timeout: parseInt(process.env.CMS_API_TIMEOUT || '30000'),
    retries: parseInt(process.env.CMS_API_RETRIES || '3'),
    retryDelay: parseInt(process.env.CMS_API_RETRY_DELAY || '1000'),
    cache: process.env.CMS_API_CACHE !== 'false',
    cacheTTL: parseInt(process.env.CMS_API_CACHE_TTL || '300000'), // 5 minutes
    authToken: process.env.CMS_API_AUTH_TOKEN,
    tenantId: process.env.CMS_TENANT_ID
  });
}

// Type exports for convenience
export type {
  ContentProvider,
  RequestContext,
  ContentFilters,
  ContentList,
  PageData,
  BlockData,
  SEOData,
  ContentType,
  APIEnvelope,
  APIError,
  ProviderFactory,
  ProviderConfig,
  DatabaseProviderConfig,
  FileProviderConfig
} from '../interfaces/content-provider';