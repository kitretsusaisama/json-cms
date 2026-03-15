/**
 * Data Isolation Patterns for Multi-Tenant Architecture
 * 
 * Provides patterns and utilities for isolating tenant data across different storage backends.
 */

import { TenantContext } from '../interfaces/tenant';

export interface DataIsolationContext {
  tenantId: string;
  userId?: string;
  requestId?: string;
  timestamp: string;
}

export interface IsolatedQuery {
  filters: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  offset?: number;
}

export interface IsolatedData {
  tenantId: string;
  data: unknown;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
  };
}

/**
 * Base class for data isolation strategies
 */
export abstract class DataIsolationStrategy {
  abstract isolateQuery(query: IsolatedQuery, context: DataIsolationContext): IsolatedQuery;
  abstract isolateData(data: unknown, context: DataIsolationContext): IsolatedData;
  abstract validateAccess(data: IsolatedData, context: DataIsolationContext): boolean;
}

/**
 * Row-Level Security (RLS) isolation strategy
 * Adds tenant_id filter to all queries
 */
export class RowLevelSecurityStrategy extends DataIsolationStrategy {
  isolateQuery(query: IsolatedQuery, context: DataIsolationContext): IsolatedQuery {
    return {
      ...query,
      filters: {
        ...query.filters,
        tenant_id: context.tenantId
      }
    };
  }

  isolateData(data: unknown, context: DataIsolationContext): IsolatedData {
    return {
      tenantId: context.tenantId,
      data: {
        ...data as Record<string, unknown>,
        tenant_id: context.tenantId
      },
      metadata: {
        createdAt: context.timestamp,
        updatedAt: context.timestamp,
        createdBy: context.userId,
        updatedBy: context.userId
      }
    };
  }

  validateAccess(data: IsolatedData, context: DataIsolationContext): boolean {
    return data.tenantId === context.tenantId;
  }
}

/**
 * Schema-based isolation strategy
 * Uses separate schemas/databases per tenant
 */
export class SchemaIsolationStrategy extends DataIsolationStrategy {
  private getSchemaName(tenantId: string): string {
    return `tenant_${tenantId}`;
  }

  isolateQuery(query: IsolatedQuery, context: DataIsolationContext): IsolatedQuery {
    // Schema isolation doesn't need query modification
    // The connection/schema is selected based on tenant
    return query;
  }

  isolateData(data: unknown, context: DataIsolationContext): IsolatedData {
    return {
      tenantId: context.tenantId,
      data,
      metadata: {
        createdAt: context.timestamp,
        updatedAt: context.timestamp,
        createdBy: context.userId,
        updatedBy: context.userId
      }
    };
  }

  validateAccess(data: IsolatedData, context: DataIsolationContext): boolean {
    return data.tenantId === context.tenantId;
  }

  getConnectionString(baseConnectionString: string, tenantId: string): string {
    const schema = this.getSchemaName(tenantId);
    return `${baseConnectionString}?schema=${schema}`;
  }
}

/**
 * Collection/Table prefix isolation strategy
 * Prefixes collection/table names with tenant ID
 */
export class PrefixIsolationStrategy extends DataIsolationStrategy {


  isolateQuery(query: IsolatedQuery, context: DataIsolationContext): IsolatedQuery {
    // Collection prefix is handled at the storage layer
    return query;
  }

  isolateData(data: unknown, context: DataIsolationContext): IsolatedData {
    return {
      tenantId: context.tenantId,
      data,
      metadata: {
        createdAt: context.timestamp,
        updatedAt: context.timestamp,
        createdBy: context.userId,
        updatedBy: context.userId
      }
    };
  }

  validateAccess(data: IsolatedData, context: DataIsolationContext): boolean {
    return data.tenantId === context.tenantId;
  }

  getCollectionName(baseName: string, tenantId: string): string {
    return `${tenantId}_${baseName}`;
  }
}

/**
 * Data isolation manager
 */
export class DataIsolationManager {
  private strategy: DataIsolationStrategy;

  constructor(strategy: DataIsolationStrategy) {
    this.strategy = strategy;
  }

  /**
   * Create isolation context from tenant and user info
   */
  createContext(tenant: TenantContext, userId?: string, requestId?: string): DataIsolationContext {
    return {
      tenantId: tenant.id,
      userId,
      requestId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Isolate a query for tenant access
   */
  isolateQuery(query: IsolatedQuery, context: DataIsolationContext): IsolatedQuery {
    return this.strategy.isolateQuery(query, context);
  }

  /**
   * Isolate data for tenant storage
   */
  isolateData(data: unknown, context: DataIsolationContext): IsolatedData {
    return this.strategy.isolateData(data, context);
  }

  /**
   * Validate tenant access to data
   */
  validateAccess(data: IsolatedData, context: DataIsolationContext): boolean {
    return this.strategy.validateAccess(data, context);
  }

  /**
   * Filter array of data for tenant access
   */
  filterTenantData<T extends IsolatedData>(data: T[], context: DataIsolationContext): T[] {
    return data.filter(item => this.validateAccess(item, context));
  }
}

/**
 * Tenant-aware data wrapper
 */
export class TenantDataWrapper<T = unknown> {
  private isolationManager: DataIsolationManager;
  private context: DataIsolationContext;

  constructor(isolationManager: DataIsolationManager, context: DataIsolationContext) {
    this.isolationManager = isolationManager;
    this.context = context;
  }

  /**
   * Wrap data for storage
   */
  wrap(data: T): IsolatedData {
    return this.isolationManager.isolateData(data, this.context);
  }

  /**
   * Unwrap data from storage
   */
  unwrap(isolatedData: IsolatedData): T {
    if (!this.isolationManager.validateAccess(isolatedData, this.context)) {
      throw new Error('Access denied: Data belongs to different tenant');
    }
    return isolatedData.data as T;
  }

  /**
   * Prepare query for execution
   */
  prepareQuery(query: IsolatedQuery): IsolatedQuery {
    return this.isolationManager.isolateQuery(query, this.context);
  }

  /**
   * Filter results for tenant access
   */
  filterResults<U extends IsolatedData>(results: U[]): U[] {
    return this.isolationManager.filterTenantData(results, this.context);
  }
}

/**
 * Middleware for automatic data isolation
 */
export interface DataIsolationMiddleware {
  beforeQuery?: (query: IsolatedQuery, context: DataIsolationContext) => IsolatedQuery;
  afterQuery?: <T extends IsolatedData>(results: T[], context: DataIsolationContext) => T[];
  beforeSave?: (data: unknown, context: DataIsolationContext) => IsolatedData;
  afterLoad?: <T>(data: IsolatedData, context: DataIsolationContext) => T;
}

export class DataIsolationMiddlewareManager {
  private middlewares: DataIsolationMiddleware[] = [];

  addMiddleware(middleware: DataIsolationMiddleware): void {
    this.middlewares.push(middleware);
  }

  removeMiddleware(middleware: DataIsolationMiddleware): void {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
    }
  }

  async executeBeforeQuery(query: IsolatedQuery, context: DataIsolationContext): Promise<IsolatedQuery> {
    let result = query;
    for (const middleware of this.middlewares) {
      if (middleware.beforeQuery) {
        result = middleware.beforeQuery(result, context);
      }
    }
    return result;
  }

  async executeAfterQuery<T extends IsolatedData>(results: T[], context: DataIsolationContext): Promise<T[]> {
    let result = results;
    for (const middleware of this.middlewares) {
      if (middleware.afterQuery) {
        result = middleware.afterQuery(result, context);
      }
    }
    return result;
  }

  async executeBeforeSave(data: unknown, context: DataIsolationContext): Promise<IsolatedData> {
    let result: IsolatedData | null = null;
    for (const middleware of this.middlewares) {
      if (middleware.beforeSave) {
        result = middleware.beforeSave(data, context);
        break; // Only use the first middleware that handles beforeSave
      }
    }
    
    if (!result) {
      // Default isolation if no middleware handles it
      const strategy = new RowLevelSecurityStrategy();
      result = strategy.isolateData(data, context);
    }
    
    return result;
  }

  async executeAfterLoad<T>(data: IsolatedData, context: DataIsolationContext): Promise<T> {
    for (const middleware of this.middlewares) {
      if (middleware.afterLoad) {
        return middleware.afterLoad<T>(data, context);
      }
    }
    
    // Default: return the data as-is
    return data.data as T;
  }
}

/**
 * Factory functions for common isolation strategies
 */
export const IsolationStrategies = {
  rowLevel: () => new RowLevelSecurityStrategy(),
  schema: () => new SchemaIsolationStrategy(),
  prefix: () => new PrefixIsolationStrategy(),
};

/**
 * Utility functions for tenant data operations
 */
export const TenantDataUtils = {
  /**
   * Create a tenant-scoped ID
   */
  createTenantScopedId(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  },

  /**
   * Parse tenant-scoped ID
   */
  parseTenantScopedId(scopedId: string): { tenantId: string; id: string } | null {
    const parts = scopedId.split(':');
    if (parts.length !== 2) {
      return null;
    }
    return { tenantId: parts[0], id: parts[1] };
  },

  /**
   * Validate tenant access to resource
   */
  validateTenantResource(resourceTenantId: string, contextTenantId: string): boolean {
    return resourceTenantId === contextTenantId;
  },

  /**
   * Create tenant-aware cache key
   */
  createTenantCacheKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }
};