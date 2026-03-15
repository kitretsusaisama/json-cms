/**
 * Comprehensive Integration Tests for CMS API Endpoints
 * Tests complete request/response cycles and database operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Next.js server components
const mockNextRequest = (method: string, url: string, body?: any, headers?: Record<string, string>) => {
  const request = new NextRequest(new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }));
  return request;
};

// Mock data
const mockPageData = {
  slug: 'test-page',
  title: 'Test Page',
  description: 'A test page for integration testing',
  content: {
    blocks: [
      {
        id: 'block-1',
        componentType: 'TextBlock',
        props: { text: 'Hello World' }
      }
    ]
  },
  status: 'published',
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1'
  },
  seo: {
    title: 'Test Page SEO',
    description: 'SEO description for test page'
  }
};

const mockBlockData = {
  id: 'test-block',
  name: 'Test Block',
  description: 'A test block for integration testing',
  category: 'content',
  tags: ['test', 'integration'],
  content: {
    componentType: 'TextBlock',
    props: { text: 'Block content' }
  },
  constraints: {
    maxInstances: 5
  },
  variants: [
    {
      name: 'primary',
      description: 'Primary variant',
      props: { variant: 'primary' }
    }
  ],
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
};

const mockComponentData = {
  key: 'test-component',
  metadata: {
    name: 'Test Component',
    description: 'A test component for integration testing',
    category: 'ui',
    version: '1.0.0',
    author: 'test-author',
    tags: ['test', 'ui'],
    slots: [
      {
        name: 'content',
        description: 'Content slot',
        required: false,
        type: 'any'
      }
    ],
    variants: [
      {
        name: 'default',
        description: 'Default variant',
        props: {}
      }
    ]
  },
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' }
    },
    required: ['title']
  },
  lazy: false
};

const mockTenantData = {
  name: 'Test Tenant',
  domain: 'test.example.com',
  subdomain: 'test',
  settings: {
    theme: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d'
    },
    branding: {
      companyName: 'Test Company',
      tagline: 'Testing Excellence'
    },
    localization: {
      defaultLocale: 'en',
      supportedLocales: ['en', 'es'],
      timezone: 'UTC'
    }
  },
  features: {
    multiLanguage: true,
    customThemes: true,
    advancedSEO: false
  },
  limits: {
    maxUsers: 100,
    maxPages: 1000,
    maxBlocks: 500
  }
};

const mockPluginData = {
  pluginId: 'test-plugin',
  pluginPath: '/plugins/test-plugin',
  autoActivate: true
};

describe('CMS API Integration Tests', () => {
  // Mock environment variables
  beforeEach(() => {
    process.env.CMS_PROVIDER = 'file';
    process.env.CMS_DATA_PATH = './test-data';
    process.env.JWT_SECRET = 'test-secret';
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pages API (/api/cms/pages)', () => {
    it('should create a new page', async () => {
      // Import the route handler
      const { POST } = await import('../pages/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/pages', mockPageData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        slug: mockPageData.slug,
        title: mockPageData.title
      });
      expect(data.meta).toHaveProperty('timestamp');
      expect(data.meta).toHaveProperty('version');
    });

    it('should get existing page', async () => {
      const { GET } = await import('../pages/[slug]/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages/test-page', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request, { params: { slug: 'test-page' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('slug');
      expect(data.data).toHaveProperty('title');
      expect(data.meta).toHaveProperty('timestamp');
    });

    it('should update existing page', async () => {
      const { PUT } = await import('../pages/[slug]/route');
      
      const updatedData = {
        ...mockPageData,
        title: 'Updated Test Page',
        description: 'Updated description'
      };

      const request = mockNextRequest('PUT', 'http://localhost:3000/api/cms/pages/test-page', updatedData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await PUT(request, { params: { slug: 'test-page' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe('Updated Test Page');
      expect(data.data.description).toBe('Updated description');
    });

    it('should delete page', async () => {
      const { DELETE } = await import('../pages/[slug]/route');
      
      const request = mockNextRequest('DELETE', 'http://localhost:3000/api/cms/pages/test-page', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await DELETE(request, { params: { slug: 'test-page' } });

      expect(response.status).toBe(204);
    });

    it('should list pages with filters', async () => {
      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages?status=published&limit=10', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('limit');
      expect(data.data).toHaveProperty('offset');
      expect(Array.isArray(data.data.items)).toBe(true);
    });

    it('should handle validation errors', async () => {
      const { POST } = await import('../pages/route');
      
      const invalidData = {
        // Missing required fields
        content: {}
      };

      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/pages', invalidData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toHaveProperty('code');
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle unauthorized requests', async () => {
      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Blocks API (/api/cms/blocks)', () => {
    it('should create a new block', async () => {
      const { POST } = await import('../blocks/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/blocks', mockBlockData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        id: mockBlockData.id,
        name: mockBlockData.name,
        category: mockBlockData.category
      });
    });

    it('should get existing block', async () => {
      const { GET } = await import('../blocks/[id]/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/blocks/test-block', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request, { params: { id: 'test-block' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('category');
    });

    it('should list blocks by category', async () => {
      const { GET } = await import('../blocks/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/blocks?category=content', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
    });
  });

  describe('Components API (/api/cms/components)', () => {
    it('should register a new component', async () => {
      const { POST } = await import('../components/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/components', mockComponentData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        key: mockComponentData.key,
        metadata: expect.objectContaining({
          name: mockComponentData.metadata.name,
          category: mockComponentData.metadata.category
        })
      });
    });

    it('should get component definition', async () => {
      const { GET } = await import('../components/[key]/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/components/test-component', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request, { params: { key: 'test-component' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('key');
      expect(data.data).toHaveProperty('metadata');
      expect(data.data).toHaveProperty('schema');
    });

    it('should list components by category', async () => {
      const { GET } = await import('../components/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/components?category=ui', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('components');
      expect(typeof data.data.components).toBe('object');
    });
  });

  describe('Tenants API (/api/cms/tenants)', () => {
    it('should create a new tenant', async () => {
      const { POST } = await import('../tenants/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/tenants', mockTenantData, {
        'Authorization': 'Bearer admin-token'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        name: mockTenantData.name,
        domain: mockTenantData.domain,
        subdomain: mockTenantData.subdomain
      });
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('status');
    });

    it('should get tenant details', async () => {
      const { GET } = await import('../tenants/[id]/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/tenants/tenant-1', undefined, {
        'Authorization': 'Bearer admin-token'
      });

      const response = await GET(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('settings');
    });

    it('should suspend tenant', async () => {
      const { POST } = await import('../tenants/[id]/suspend/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/tenants/tenant-1/suspend', {
        reason: 'Policy violation'
      }, {
        'Authorization': 'Bearer admin-token'
      });

      const response = await POST(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('suspended');
    });

    it('should require admin permissions for tenant operations', async () => {
      const { POST } = await import('../tenants/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/tenants', mockTenantData, {
        'Authorization': 'Bearer user-token'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Plugins API (/api/cms/plugins)', () => {
    it('should install a new plugin', async () => {
      const { POST } = await import('../plugins/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/plugins', mockPluginData, {
        'Authorization': 'Bearer admin-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        pluginId: mockPluginData.pluginId,
        status: 'installed'
      });
    });

    it('should activate plugin', async () => {
      const { POST } = await import('../plugins/[id]/activate/route');
      
      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/plugins/test-plugin/activate', undefined, {
        'Authorization': 'Bearer admin-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request, { params: { id: 'test-plugin' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('active');
    });

    it('should list installed plugins', async () => {
      const { GET } = await import('../plugins/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/plugins', undefined, {
        'Authorization': 'Bearer admin-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('plugins');
      expect(Array.isArray(data.data.plugins)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors consistently', async () => {
      const { GET } = await import('../pages/[slug]/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages/non-existent', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request, { params: { slug: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('timestamp');
      expect(data.error).toHaveProperty('requestId');
    });

    it('should handle 500 errors with proper logging', async () => {
      // Mock a service that throws an error
      vi.doMock('../../providers/provider-factory', () => ({
        ProviderFactory: class {
          createProvider() {
            throw new Error('Database connection failed');
          }
        }
      }));

      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An internal error occurred');
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiter to return exceeded
      vi.doMock('../../security/rate-limiter', () => ({
        RateLimiter: class {
          async checkLimit() {
            return {
              allowed: false,
              remaining: 0,
              resetTime: Date.now() + 60000
            };
          }
        }
      }));

      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should validate JWT tokens', async () => {
      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages', undefined, {
        'Authorization': 'Bearer invalid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('should check user permissions', async () => {
      const { DELETE } = await import('../pages/[slug]/route');
      
      const request = mockNextRequest('DELETE', 'http://localhost:3000/api/cms/pages/test-page', undefined, {
        'Authorization': 'Bearer viewer-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await DELETE(request, { params: { slug: 'test-page' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate tenant access', async () => {
      const { GET } = await import('../pages/route');
      
      const request = mockNextRequest('GET', 'http://localhost:3000/api/cms/pages', undefined, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'unauthorized-tenant'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should sanitize HTML content', async () => {
      const { POST } = await import('../pages/route');
      
      const maliciousData = {
        ...mockPageData,
        title: '<script>alert("xss")</script>Safe Title',
        content: {
          blocks: [{
            id: 'block-1',
            componentType: 'TextBlock',
            props: { 
              text: '<script>alert("xss")</script>Safe content'
            }
          }]
        }
      };

      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/pages', maliciousData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.title).not.toContain('<script>');
      expect(data.data.content.blocks[0].props.text).not.toContain('<script>');
    });

    it('should validate required fields', async () => {
      const { POST } = await import('../blocks/route');
      
      const incompleteData = {
        name: 'Test Block'
        // Missing required fields: id, category, content
      };

      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/blocks', incompleteData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveProperty('missingFields');
    });

    it('should validate field formats', async () => {
      const { POST } = await import('../pages/route');
      
      const invalidFormatData = {
        ...mockPageData,
        slug: 'Invalid Slug With Spaces!',
        status: 'invalid-status'
      };

      const request = mockNextRequest('POST', 'http://localhost:3000/api/cms/pages', invalidFormatData, {
        'Authorization': 'Bearer valid-token',
        'X-Tenant-ID': 'tenant-1'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.fieldErrors).toHaveProperty('slug');
      expect(data.error.details.fieldErrors).toHaveProperty('status');
    });
  });
});