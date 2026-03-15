/**
 * CMS API Routes Tests
 * 
 * Tests for all CMS API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the boilerplate modules
vi.mock('@/boilerplate/api', () => ({
  initializeProvider: vi.fn(),
}));

vi.mock('@/boilerplate/security/security-middleware', () => ({
  SecurityMiddleware: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({ allowed: true })
  }))
}));

vi.mock('@/boilerplate/security/input-sanitizer', () => ({
  InputSanitizer: vi.fn().mockImplementation(() => ({
    sanitizeObject: vi.fn((obj) => obj)
  }))
}));

vi.mock('@/boilerplate/registry/enhanced-registry', () => ({
  EnhancedComponentRegistry: {
    getInstance: vi.fn().mockReturnValue({
      list: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
    })
  }
}));

vi.mock('@/boilerplate/plugins/plugin-manager', () => ({
  PluginManager: {
    getInstance: vi.fn().mockReturnValue({
      listPlugins: vi.fn().mockResolvedValue({}),
      getPlugin: vi.fn(),
      getPluginState: vi.fn(),
      installPlugin: vi.fn(),
      uninstallPlugin: vi.fn(),
      activatePlugin: vi.fn(),
      deactivatePlugin: vi.fn(),
      updatePlugin: vi.fn(),
      getPluginHealth: vi.fn().mockResolvedValue({ healthy: true }),
      getDependencies: vi.fn().mockResolvedValue([])
    })
  }
}));

vi.mock('@/boilerplate/tenant/tenant-manager', () => ({
  TenantManager: {
    getInstance: vi.fn().mockReturnValue({
      listTenants: vi.fn().mockResolvedValue([]),
      getTenant: vi.fn(),
      createTenant: vi.fn(),
      updateTenant: vi.fn(),
      deleteTenant: vi.fn(),
      suspendTenant: vi.fn(),
      activateTenant: vi.fn(),
      getTenantUsage: vi.fn().mockResolvedValue({
        tenantId: 'test',
        period: '2024-01',
        metrics: { users: 0, pages: 0, blocks: 0, components: 0, storage: 0, apiRequests: 0, bandwidth: 0 },
        updatedAt: new Date().toISOString()
      })
    })
  }
}));

// Import the route handlers after mocking
import { GET as getPagesHandler, POST as postPagesHandler } from '../pages/route';
import { GET as getPageHandler, PUT as putPageHandler, DELETE as deletePageHandler } from '../pages/[slug]/route';
import { GET as getBlocksHandler, POST as postBlocksHandler } from '../blocks/route';
import { GET as getBlockHandler, PUT as putBlockHandler, DELETE as deleteBlockHandler } from '../blocks/[id]/route';
import { GET as getComponentsHandler, POST as postComponentsHandler } from '../components/route';
import { GET as getComponentHandler, PUT as putComponentHandler, DELETE as deleteComponentHandler } from '../components/[key]/route';
import { GET as getPluginsHandler, POST as postPluginsHandler } from '../plugins/route';
import { GET as getPluginHandler, PUT as putPluginHandler, DELETE as deletePluginHandler } from '../plugins/[id]/route';
import { GET as getTenantsHandler, POST as postTenantsHandler } from '../tenants/route';
import { GET as getTenantHandler, PUT as putTenantHandler, DELETE as deleteTenantHandler } from '../tenants/[id]/route';

describe('CMS API Routes', () => {
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      listPages: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
      getPage: vi.fn(),
      setPage: vi.fn(),
      deletePage: vi.fn(),
      listBlocks: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
      getBlock: vi.fn(),
      setBlock: vi.fn(),
      deleteBlock: vi.fn()
    };

    const { initializeProvider } = require('@/boilerplate/api');
    initializeProvider.mockResolvedValue(mockProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Pages API', () => {
    it('should list pages successfully', async () => {
      const request = new NextRequest('http://localhost/api/cms/pages');
      const response = await getPagesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ items: [], total: 0, hasMore: false });
      expect(mockProvider.listPages).toHaveBeenCalled();
    });

    it('should create a new page successfully', async () => {
      const pageData = {
        slug: 'test-page',
        title: 'Test Page',
        content: { blocks: [] },
        status: 'draft'
      };

      mockProvider.getPage.mockResolvedValue(null); // Page doesn't exist
      mockProvider.setPage.mockResolvedValue({ ...pageData, id: '1', createdAt: new Date().toISOString() });

      const request = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify(pageData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postPagesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.slug).toBe('test-page');
      expect(mockProvider.setPage).toHaveBeenCalled();
    });

    it('should get a specific page', async () => {
      const pageData = { slug: 'test-page', title: 'Test Page', content: {} };
      mockProvider.getPage.mockResolvedValue(pageData);

      const request = new NextRequest('http://localhost/api/cms/pages/test-page');
      const response = await getPageHandler(request, { params: { slug: 'test-page' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.slug).toBe('test-page');
      expect(mockProvider.getPage).toHaveBeenCalledWith('test-page', expect.any(Object));
    });

    it('should return 404 for non-existent page', async () => {
      mockProvider.getPage.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/cms/pages/non-existent');
      const response = await getPageHandler(request, { params: { slug: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should update a page successfully', async () => {
      const existingPage = { slug: 'test-page', title: 'Old Title', version: 1 };
      const updateData = { title: 'New Title' };
      const updatedPage = { ...existingPage, ...updateData, version: 2 };

      mockProvider.getPage.mockResolvedValue(existingPage);
      mockProvider.setPage.mockResolvedValue(updatedPage);

      const request = new NextRequest('http://localhost/api/cms/pages/test-page', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await putPageHandler(request, { params: { slug: 'test-page' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe('New Title');
      expect(data.data.version).toBe(2);
    });

    it('should delete a page successfully', async () => {
      const existingPage = { slug: 'test-page', title: 'Test Page' };
      mockProvider.getPage.mockResolvedValue(existingPage);
      mockProvider.deletePage.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/cms/pages/test-page', {
        method: 'DELETE'
      });

      const response = await deletePageHandler(request, { params: { slug: 'test-page' } });

      expect(response.status).toBe(204);
      expect(mockProvider.deletePage).toHaveBeenCalledWith('test-page', expect.any(Object));
    });
  });

  describe('Blocks API', () => {
    it('should list blocks successfully', async () => {
      const request = new NextRequest('http://localhost/api/cms/blocks');
      const response = await getBlocksHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ items: [], total: 0, hasMore: false });
      expect(mockProvider.listBlocks).toHaveBeenCalled();
    });

    it('should create a new block successfully', async () => {
      const blockData = {
        id: 'test-block',
        name: 'Test Block',
        category: 'content',
        content: { type: 'text' }
      };

      mockProvider.getBlock.mockResolvedValue(null); // Block doesn't exist
      mockProvider.setBlock.mockResolvedValue({ ...blockData, createdAt: new Date().toISOString() });

      const request = new NextRequest('http://localhost/api/cms/blocks', {
        method: 'POST',
        body: JSON.stringify(blockData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postBlocksHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe('test-block');
      expect(mockProvider.setBlock).toHaveBeenCalled();
    });

    it('should get a specific block', async () => {
      const blockData = { id: 'test-block', name: 'Test Block', category: 'content' };
      mockProvider.getBlock.mockResolvedValue(blockData);

      const request = new NextRequest('http://localhost/api/cms/blocks/test-block');
      const response = await getBlockHandler(request, { params: { id: 'test-block' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('test-block');
      expect(mockProvider.getBlock).toHaveBeenCalledWith('test-block', expect.any(Object));
    });

    it('should update a block successfully', async () => {
      const existingBlock = { id: 'test-block', name: 'Old Name', category: 'content' };
      const updateData = { name: 'New Name' };
      const updatedBlock = { ...existingBlock, ...updateData };

      mockProvider.getBlock.mockResolvedValue(existingBlock);
      mockProvider.setBlock.mockResolvedValue(updatedBlock);

      const request = new NextRequest('http://localhost/api/cms/blocks/test-block', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await putBlockHandler(request, { params: { id: 'test-block' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('New Name');
    });

    it('should delete a block successfully', async () => {
      const existingBlock = { id: 'test-block', name: 'Test Block', usage: [] };
      mockProvider.getBlock.mockResolvedValue(existingBlock);
      mockProvider.deleteBlock.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/cms/blocks/test-block', {
        method: 'DELETE'
      });

      const response = await deleteBlockHandler(request, { params: { id: 'test-block' } });

      expect(response.status).toBe(204);
      expect(mockProvider.deleteBlock).toHaveBeenCalledWith('test-block', expect.any(Object));
    });

    it('should prevent deletion of block in use', async () => {
      const existingBlock = { 
        id: 'test-block', 
        name: 'Test Block', 
        usage: [{ pageId: 'page1', position: 0, lastUsed: new Date().toISOString() }] 
      };
      mockProvider.getBlock.mockResolvedValue(existingBlock);

      const request = new NextRequest('http://localhost/api/cms/blocks/test-block', {
        method: 'DELETE'
      });

      const response = await deleteBlockHandler(request, { params: { id: 'test-block' } });

      expect(response.status).toBe(409);
      expect(mockProvider.deleteBlock).not.toHaveBeenCalled();
    });
  });

  describe('Components API', () => {
    it('should list components successfully', async () => {
      const request = new NextRequest('http://localhost/api/cms/components');
      const response = await getComponentsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toEqual([]);
    });

    it('should register a new component successfully', async () => {
      const componentData = {
        key: 'test-component',
        metadata: {
          name: 'Test Component',
          category: 'ui',
          version: '1.0.0'
        }
      };

      const request = new NextRequest('http://localhost/api/cms/components', {
        method: 'POST',
        body: JSON.stringify(componentData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postComponentsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.key).toBe('test-component');
    });
  });

  describe('Plugins API', () => {
    it('should list plugins successfully', async () => {
      const request = new NextRequest('http://localhost/api/cms/plugins');
      const response = await getPluginsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toEqual([]);
    });

    it('should install a new plugin successfully', async () => {
      const pluginData = {
        pluginId: 'test-plugin',
        pluginPath: '/path/to/plugin',
        autoActivate: false
      };

      const request = new NextRequest('http://localhost/api/cms/plugins', {
        method: 'POST',
        body: JSON.stringify(pluginData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postPluginsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe('test-plugin');
    });
  });

  describe('Tenants API', () => {
    it('should list tenants successfully', async () => {
      const request = new NextRequest('http://localhost/api/cms/tenants');
      const response = await getTenantsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toEqual([]);
    });

    it('should create a new tenant successfully', async () => {
      const tenantData = {
        name: 'Test Tenant',
        subdomain: 'test-tenant'
      };

      const createdTenant = {
        id: '1',
        ...tenantData,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { TenantManager } = require('@/boilerplate/tenant/tenant-manager');
      const mockTenantManager = TenantManager.getInstance();
      mockTenantManager.listTenants.mockResolvedValue([]); // No conflicts
      mockTenantManager.createTenant.mockResolvedValue(createdTenant);

      const request = new NextRequest('http://localhost/api/cms/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postTenantsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Test Tenant');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const invalidPageData = {
        slug: '', // Invalid empty slug
        title: 'Test Page'
      };

      const request = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify(invalidPageData),
        headers: { 'content-type': 'application/json' }
      });

      const response = await postPagesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toBeDefined();
      expect(data.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should handle provider errors', async () => {
      mockProvider.listPages.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/cms/pages');
      const response = await getPagesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errors).toBeDefined();
      expect(data.errors[0].code).toBe('INTERNAL_ERROR');
    });

    it('should handle security middleware rejection', async () => {
      const { SecurityMiddleware } = require('@/boilerplate/security/security-middleware');
      const mockSecurityMiddleware = new SecurityMiddleware();
      mockSecurityMiddleware.process.mockResolvedValue({ 
        allowed: false, 
        reason: 'Rate limit exceeded' 
      });

      const request = new NextRequest('http://localhost/api/cms/pages');
      const response = await getPagesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.errors).toBeDefined();
      expect(data.errors[0].code).toBe('FORBIDDEN');
    });
  });
});