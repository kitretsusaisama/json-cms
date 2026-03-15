/**
 * Data Isolation Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RowLevelSecurityStrategy,
  SchemaIsolationStrategy,
  PrefixIsolationStrategy,
  DataIsolationManager,
  TenantDataWrapper,
  DataIsolationMiddlewareManager,
  TenantDataUtils,
  type DataIsolationContext,
  type IsolatedQuery,
  type IsolatedData
} from '../data-isolation';

describe('Data Isolation', () => {
  let context: DataIsolationContext;

  beforeEach(() => {
    context = {
      tenantId: 'tenant123',
      userId: 'user456',
      requestId: 'req789',
      timestamp: '2024-01-01T00:00:00.000Z'
    };
  });

  describe('RowLevelSecurityStrategy', () => {
    let strategy: RowLevelSecurityStrategy;

    beforeEach(() => {
      strategy = new RowLevelSecurityStrategy();
    });

    it('should add tenant_id filter to queries', () => {
      const query: IsolatedQuery = {
        filters: { status: 'active' },
        sort: { createdAt: -1 },
        limit: 10
      };

      const isolatedQuery = strategy.isolateQuery(query, context);

      expect(isolatedQuery.filters.tenant_id).toBe('tenant123');
      expect(isolatedQuery.filters.status).toBe('active');
      expect(isolatedQuery.sort).toEqual({ createdAt: -1 });
      expect(isolatedQuery.limit).toBe(10);
    });

    it('should add tenant_id to data', () => {
      const data = { title: 'Test Page', content: 'Hello World' };

      const isolatedData = strategy.isolateData(data, context);

      expect(isolatedData.tenantId).toBe('tenant123');
      expect(isolatedData.data).toEqual({
        title: 'Test Page',
        content: 'Hello World',
        tenant_id: 'tenant123'
      });
      expect(isolatedData.metadata.createdBy).toBe('user456');
    });

    it('should validate access based on tenant ID', () => {
      const validData: IsolatedData = {
        tenantId: 'tenant123',
        data: { title: 'Test' },
        metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      };

      const invalidData: IsolatedData = {
        tenantId: 'tenant456',
        data: { title: 'Test' },
        metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      };

      expect(strategy.validateAccess(validData, context)).toBe(true);
      expect(strategy.validateAccess(invalidData, context)).toBe(false);
    });
  });

  describe('SchemaIsolationStrategy', () => {
    let strategy: SchemaIsolationStrategy;

    beforeEach(() => {
      strategy = new SchemaIsolationStrategy();
    });

    it('should not modify queries (schema-level isolation)', () => {
      const query: IsolatedQuery = {
        filters: { status: 'active' },
        limit: 10
      };

      const isolatedQuery = strategy.isolateQuery(query, context);

      expect(isolatedQuery).toEqual(query);
    });

    it('should generate schema-specific connection string', () => {
      const baseConnection = 'postgresql://user:pass@localhost/db';
      const connectionString = strategy.getConnectionString(baseConnection, 'tenant123');

      expect(connectionString).toBe('postgresql://user:pass@localhost/db?schema=tenant_tenant123');
    });

    it('should isolate data without modifying structure', () => {
      const data = { title: 'Test Page', content: 'Hello World' };

      const isolatedData = strategy.isolateData(data, context);

      expect(isolatedData.tenantId).toBe('tenant123');
      expect(isolatedData.data).toEqual(data); // No modification to data structure
    });
  });

  describe('PrefixIsolationStrategy', () => {
    let strategy: PrefixIsolationStrategy;

    beforeEach(() => {
      strategy = new PrefixIsolationStrategy();
    });

    it('should generate prefixed collection names', () => {
      const collectionName = strategy.getCollectionName('pages', 'tenant123');
      expect(collectionName).toBe('tenant123_pages');
    });

    it('should not modify queries (prefix handled at storage layer)', () => {
      const query: IsolatedQuery = {
        filters: { status: 'active' }
      };

      const isolatedQuery = strategy.isolateQuery(query, context);
      expect(isolatedQuery).toEqual(query);
    });
  });

  describe('DataIsolationManager', () => {
    let manager: DataIsolationManager;
    let strategy: RowLevelSecurityStrategy;

    beforeEach(() => {
      strategy = new RowLevelSecurityStrategy();
      manager = new DataIsolationManager(strategy);
    });

    it('should create isolation context from tenant info', () => {
      const tenant = {
        id: 'tenant123',
        name: 'Test Tenant',
        domain: 'test.example.com',
        settings: {},
        features: {},
        limits: {},
        metadata: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        status: 'active' as const
      };

      const context = manager.createContext(tenant, 'user456', 'req789');

      expect(context.tenantId).toBe('tenant123');
      expect(context.userId).toBe('user456');
      expect(context.requestId).toBe('req789');
      expect(context.timestamp).toBeDefined();
    });

    it('should filter tenant data arrays', () => {
      const data: IsolatedData[] = [
        {
          tenantId: 'tenant123',
          data: { title: 'Page 1' },
          metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
        },
        {
          tenantId: 'tenant456',
          data: { title: 'Page 2' },
          metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
        },
        {
          tenantId: 'tenant123',
          data: { title: 'Page 3' },
          metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
        }
      ];

      const filtered = manager.filterTenantData(data, context);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].data).toEqual({ title: 'Page 1' });
      expect(filtered[1].data).toEqual({ title: 'Page 3' });
    });
  });

  describe('TenantDataWrapper', () => {
    let wrapper: TenantDataWrapper;
    let manager: DataIsolationManager;

    beforeEach(() => {
      const strategy = new RowLevelSecurityStrategy();
      manager = new DataIsolationManager(strategy);
      wrapper = new TenantDataWrapper(manager, context);
    });

    it('should wrap data for storage', () => {
      const data = { title: 'Test Page', content: 'Hello World' };

      const wrapped = wrapper.wrap(data);

      expect(wrapped.tenantId).toBe('tenant123');
      expect(wrapped.data).toEqual({
        title: 'Test Page',
        content: 'Hello World',
        tenant_id: 'tenant123'
      });
    });

    it('should unwrap data from storage', () => {
      const isolatedData: IsolatedData = {
        tenantId: 'tenant123',
        data: { title: 'Test Page', content: 'Hello World' },
        metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      };

      const unwrapped = wrapper.unwrap(isolatedData);

      expect(unwrapped).toEqual({ title: 'Test Page', content: 'Hello World' });
    });

    it('should throw error when unwrapping data from different tenant', () => {
      const isolatedData: IsolatedData = {
        tenantId: 'tenant456', // Different tenant
        data: { title: 'Test Page' },
        metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      };

      expect(() => wrapper.unwrap(isolatedData)).toThrow('Access denied: Data belongs to different tenant');
    });

    it('should prepare queries with tenant isolation', () => {
      const query: IsolatedQuery = {
        filters: { status: 'active' },
        limit: 10
      };

      const prepared = wrapper.prepareQuery(query);

      expect(prepared.filters.tenant_id).toBe('tenant123');
      expect(prepared.filters.status).toBe('active');
    });
  });

  describe('DataIsolationMiddlewareManager', () => {
    let middlewareManager: DataIsolationMiddlewareManager;

    beforeEach(() => {
      middlewareManager = new DataIsolationMiddlewareManager();
    });

    it('should execute beforeQuery middleware', async () => {
      const middleware = {
        beforeQuery: (query: IsolatedQuery, context: DataIsolationContext) => ({
          ...query,
          filters: { ...query.filters, middleware: 'applied' }
        })
      };

      middlewareManager.addMiddleware(middleware);

      const query: IsolatedQuery = { filters: { status: 'active' } };
      const result = await middlewareManager.executeBeforeQuery(query, context);

      expect(result.filters.middleware).toBe('applied');
      expect(result.filters.status).toBe('active');
    });

    it('should execute afterQuery middleware', async () => {
      const middleware = {
        afterQuery: <T extends IsolatedData>(results: T[], context: DataIsolationContext) => 
          results.map(r => ({ ...r, processed: true }))
      };

      middlewareManager.addMiddleware(middleware);

      const results: IsolatedData[] = [
        {
          tenantId: 'tenant123',
          data: { title: 'Test' },
          metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
        }
      ];

      const processed = await middlewareManager.executeAfterQuery(results, context);

      expect(processed[0]).toHaveProperty('processed', true);
    });

    it('should execute beforeSave middleware', async () => {
      const middleware = {
        beforeSave: (data: unknown, context: DataIsolationContext): IsolatedData => ({
          tenantId: context.tenantId,
          data: { ...data as any, middleware: 'beforeSave' },
          metadata: {
            createdAt: context.timestamp,
            updatedAt: context.timestamp,
            createdBy: context.userId
          }
        })
      };

      middlewareManager.addMiddleware(middleware);

      const data = { title: 'Test Page' };
      const result = await middlewareManager.executeBeforeSave(data, context);

      expect(result.data).toHaveProperty('middleware', 'beforeSave');
      expect(result.tenantId).toBe('tenant123');
    });

    it('should execute afterLoad middleware', async () => {
      const middleware = {
        afterLoad: <T>(data: IsolatedData, context: DataIsolationContext): T => 
          ({ ...data.data, loaded: true } as T)
      };

      middlewareManager.addMiddleware(middleware);

      const isolatedData: IsolatedData = {
        tenantId: 'tenant123',
        data: { title: 'Test Page' },
        metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      };

      const result = await middlewareManager.executeAfterLoad(isolatedData, context);

      expect(result).toHaveProperty('loaded', true);
      expect(result).toHaveProperty('title', 'Test Page');
    });
  });

  describe('TenantDataUtils', () => {
    it('should create tenant-scoped IDs', () => {
      const scopedId = TenantDataUtils.createTenantScopedId('tenant123', 'page456');
      expect(scopedId).toBe('tenant123:page456');
    });

    it('should parse tenant-scoped IDs', () => {
      const parsed = TenantDataUtils.parseTenantScopedId('tenant123:page456');
      expect(parsed).toEqual({ tenantId: 'tenant123', id: 'page456' });
    });

    it('should return null for invalid scoped IDs', () => {
      const parsed = TenantDataUtils.parseTenantScopedId('invalid-id');
      expect(parsed).toBeNull();
    });

    it('should validate tenant resource access', () => {
      expect(TenantDataUtils.validateTenantResource('tenant123', 'tenant123')).toBe(true);
      expect(TenantDataUtils.validateTenantResource('tenant123', 'tenant456')).toBe(false);
    });

    it('should create tenant-aware cache keys', () => {
      const cacheKey = TenantDataUtils.createTenantCacheKey('tenant123', 'pages:list');
      expect(cacheKey).toBe('tenant:tenant123:pages:list');
    });
  });
});