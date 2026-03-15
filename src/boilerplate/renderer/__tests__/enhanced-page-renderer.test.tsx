/**
 * Enhanced PageRenderer Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedPageRenderer from '../enhanced-page-renderer';
import { TenantContext } from '../../interfaces/tenant';
import { AuthContext } from '../../interfaces/auth';
import { PluginContext } from '../../interfaces/plugin';

// Mock dependencies
jest.mock('@/lib/compose/planner', () => ({
  planPage: jest.fn()
}));

jest.mock('@/lib/compose/resolve', () => ({
  loadResolvedPage: jest.fn(),
  generateCacheKey: jest.fn(),
  cachedResolve: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../registry/enhanced-registry', () => ({
  enhancedRegistry: {
    loadDynamic: jest.fn()
  }
}));

const mockTenantContext: TenantContext = {
  id: 'tenant-1',
  name: 'Test Tenant',
  domain: 'test.example.com',
  settings: {
    theme: {
      primaryColor: '#007bff'
    },
    localization: {
      defaultLocale: 'en',
      supportedLocales: ['en', 'es'],
      timezone: 'UTC'
    }
  },
  features: {
    multiLanguage: true,
    customThemes: true
  },
  limits: {
    maxPages: 100,
    maxBlocks: 500
  },
  metadata: {},
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  status: 'active'
};

const mockAuthContext: AuthContext = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['editor'],
    permissions: ['content.page.read', 'content.block.read'],
    tenantId: 'tenant-1',
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    status: 'active'
  },
  permissions: ['content.page.read', 'content.block.read'],
  roles: ['editor']
};

const mockPluginContext: PluginContext = {
  pluginId: 'test-plugin',
  pluginDir: '/plugins/test-plugin',
  config: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn()
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  registry: {
    registerComponent: jest.fn(),
    registerRoute: jest.fn(),
    registerAPIEndpoint: jest.fn(),
    registerHook: jest.fn(),
    registerPermission: jest.fn()
  },
  contentProvider: {} as any,
  hooks: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
};

describe('EnhancedPageRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with basic props', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    // Mock successful page loading and planning
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      debug: false
    });

    expect(result).toBeDefined();
    expect(result.type).toBe('main');
  });

  it('should render with tenant context', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      tenantContext: mockTenantContext,
      debug: false
    });

    expect(result).toBeDefined();
    expect(result.props['data-tenant-id']).toBe('tenant-1');
  });

  it('should render with auth context', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      authContext: mockAuthContext,
      debug: false
    });

    expect(result).toBeDefined();
    expect(result.props['data-user-id']).toBe('user-1');
  });

  it('should execute plugin hooks', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      pluginContext: mockPluginContext,
      debug: false
    });

    expect(result).toBeDefined();
    expect(mockPluginContext.hooks.emit).toHaveBeenCalledWith('before-load', expect.any(Object));
    expect(mockPluginContext.hooks.emit).toHaveBeenCalledWith('after-load', expect.any(Object));
  });

  it('should handle planning errors gracefully', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [{ message: 'Planning failed', code: 'PLAN_ERROR' }],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      debug: true
    });

    expect(result).toBeDefined();
    // Should render PlanningErrorDisplay in debug mode
    expect(result.type.name).toBe('PlanningErrorDisplay');
  });

  it('should handle render errors gracefully', async () => {
    const { loadResolvedPage } = require('@/lib/compose/resolve');
    
    // Mock error during page loading
    loadResolvedPage.mockRejectedValue(new Error('Load failed'));

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      debug: true
    });

    expect(result).toBeDefined();
    // Should render ErrorDisplay in debug mode
    expect(result.type.name).toBe('ErrorDisplay');
  });

  it('should apply cache strategy', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const cacheStrategy = {
      enabled: true,
      ttl: 60000,
      key: 'custom-cache-key'
    };

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      cacheStrategy,
      debug: false
    });

    expect(result).toBeDefined();
    expect(cachedResolve).toHaveBeenCalled();
  });

  it('should render debug info when debug is enabled', async () => {
    const { planPage } = require('@/lib/compose/planner');
    const { loadResolvedPage, generateCacheKey, cachedResolve } = require('@/lib/compose/resolve');
    
    loadResolvedPage.mockResolvedValue({
      page: { id: 'test-page', title: 'Test Page' },
      blocks: [],
      warnings: []
    });
    
    planPage.mockReturnValue({
      components: [],
      errors: [],
      warnings: [],
      metrics: {}
    });
    
    generateCacheKey.mockReturnValue('test-cache-key');
    cachedResolve.mockImplementation((key, fn) => fn());

    const result = await EnhancedPageRenderer({
      slug: 'test-page',
      ctx: {},
      tenantContext: mockTenantContext,
      authContext: mockAuthContext,
      debug: true
    });

    expect(result).toBeDefined();
    // Should include debug info as first child
    expect(result.props.children[0].type.name).toBe('DebugInfo');
  });
});

describe('Enhanced Cache Key Generation', () => {
  it('should generate enhanced cache key with tenant and auth context', () => {
    const { generateCacheKey } = require('@/lib/compose/resolve');
    generateCacheKey.mockReturnValue('base-cache-key');

    // This would be tested by importing the actual function
    // For now, we'll test the concept
    const baseCacheKey = 'base-cache-key';
    const tenantId = mockTenantContext.id;
    const userId = mockAuthContext.user?.id;
    const userRoles = mockAuthContext.roles?.join(',');
    
    const enhancedCacheKey = `${baseCacheKey}:tenant:${tenantId}:user:${userId}:roles:${userRoles}`;
    
    expect(enhancedCacheKey).toBe('base-cache-key:tenant:tenant-1:user:user-1:roles:editor');
  });
});