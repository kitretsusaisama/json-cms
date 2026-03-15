/**
 * Multi-Tenant Architecture Module
 * 
 * Provides comprehensive multi-tenant support with domain, subdomain, header, 
 * and path-based resolution, data isolation, and access control.
 */

// Core tenant management
export { 
  DefaultTenantManager, 
  createTenantManager,
  type TenantManagerConfig,
  type TenantStorage 
} from './tenant-manager';

// Storage implementations
export {
  InMemoryTenantStorage,
  FileTenantStorage,
  DatabaseTenantStorage,
  createTenantStorage
} from './tenant-storage';

// React context and hooks
export {
  TenantProvider,
  useTenant,
  useFeature,
  useLimit,
  withTenant,
  FeatureGate,
  LimitGate,
  TenantErrorBoundary,
  type TenantProviderProps,
  type FeatureGateProps,
  type LimitGateProps
} from './tenant-context';

// Data isolation
export {
  DataIsolationStrategy,
  RowLevelSecurityStrategy,
  SchemaIsolationStrategy,
  PrefixIsolationStrategy,
  DataIsolationManager,
  TenantDataWrapper,
  DataIsolationMiddlewareManager,
  IsolationStrategies,
  TenantDataUtils,
  type DataIsolationContext,
  type IsolatedQuery,
  type IsolatedData,
  type DataIsolationMiddleware
} from './data-isolation';

// Access control
export {
  TenantAccessControl,
  TenantValidator,
  TenantAccessMiddleware,
  DefaultAccessRules,
  createTenantAccessControl,
  type AccessControlContext,
  type AccessRule,
  type AccessCondition,
  type ValidationResult
} from './access-control';

// Re-export interfaces
export type {
  TenantContext,
  TenantSettings,
  FeatureFlags,
  TenantLimits,
  TenantUser,
  TenantUsage,
  TenantManager,
  TenantRequest,
  CreateTenantData,
  TenantFilters,
  TenantResolver,
  DomainTenantResolver,
  SubdomainTenantResolver,
  HeaderTenantResolver,
  PathTenantResolver
} from '../interfaces/tenant';

/**
 * Default tenant configuration factory
 */
export function createDefaultTenantConfig() {
  return {
    resolvers: [
      // Try header first (for API access)
      { type: 'header', headerName: 'x-tenant-id' },
      // Then subdomain (for web access)
      { type: 'subdomain', baseDomain: process.env.BASE_DOMAIN || 'localhost' },
      // Then path-based (for shared domains)
      { type: 'path', pathPrefix: '/tenant' },
      // Finally domain mapping (for custom domains)
      { type: 'domain', domainMap: {} }
    ],
    storage: {
      type: process.env.TENANT_STORAGE_TYPE || 'file',
      config: {
        dataDir: process.env.TENANT_DATA_DIR || './data/tenants'
      }
    },
    cache: {
      enabled: process.env.TENANT_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.TENANT_CACHE_TTL || '300000') // 5 minutes
    },
    isolation: {
      strategy: process.env.TENANT_ISOLATION_STRATEGY || 'row-level',
      middleware: true
    },
    accessControl: {
      enabled: process.env.TENANT_ACCESS_CONTROL_ENABLED !== 'false',
      defaultRules: true
    }
  };
}

/**
 * Initialize complete tenant system
 */
export async function initializeTenantSystem(config = createDefaultTenantConfig()) {
  // Create storage
  const storage = createTenantStorage(
    config.storage.type as 'memory' | 'file' | 'database',
    config.storage.config
  );

  // Create tenant manager
  const tenantManager = createTenantManager({
    storage,
    cacheEnabled: config.cache.enabled,
    cacheTTL: config.cache.ttl
  });

  // Create access control
  const accessControl = config.accessControl.enabled 
    ? createTenantAccessControl() 
    : null;

  // Create data isolation
  const isolationStrategy = config.isolation.strategy === 'schema' 
    ? IsolationStrategies.schema()
    : config.isolation.strategy === 'prefix'
    ? IsolationStrategies.prefix()
    : IsolationStrategies.rowLevel();

  const isolationManager = new DataIsolationManager(isolationStrategy);

  return {
    tenantManager,
    accessControl,
    isolationManager,
    storage
  };
}

/**
 * Utility functions for common tenant operations
 */
export const TenantUtils = {
  /**
   * Extract tenant ID from various sources
   */
  extractTenantId: (request: any): string | null => {
    // Try header first
    const headerTenantId = request.headers?.['x-tenant-id'] || request.headers?.['X-Tenant-ID'];
    if (headerTenantId) return headerTenantId;

    // Try subdomain
    const hostname = request.hostname || request.headers?.host;
    if (hostname) {
      const baseDomain = process.env.BASE_DOMAIN || 'localhost';
      if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
        return hostname.replace(`.${baseDomain}`, '');
      }
    }

    // Try path
    const pathname = request.pathname || request.url;
    if (pathname?.startsWith('/tenant/')) {
      const segments = pathname.split('/');
      return segments[2] || null;
    }

    return null;
  },

  /**
   * Create tenant-scoped cache key
   */
  createCacheKey: (tenantId: string, key: string): string => {
    return `tenant:${tenantId}:${key}`;
  },

  /**
   * Validate tenant status
   */
  isActiveTenant: (tenant: TenantContext | null): boolean => {
    return tenant?.status === 'active';
  },

  /**
   * Check if tenant has feature enabled
   */
  hasFeature: (tenant: TenantContext | null, feature: string): boolean => {
    return tenant?.features?.[feature] === true;
  },

  /**
   * Get tenant setting with fallback
   */
  getSetting: <T>(tenant: TenantContext | null, path: string, defaultValue: T): T => {
    if (!tenant?.settings) return defaultValue;
    
    const keys = path.split('.');
    let current: any = tenant.settings;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current ?? defaultValue;
  }
};