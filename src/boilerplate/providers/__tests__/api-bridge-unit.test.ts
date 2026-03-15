/**
 * Comprehensive Unit Tests for API Bridge System
 * Tests content providers, API envelope, and client utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FileProvider } from '../file-provider';
import { DatabaseProvider } from '../database-provider';
import { ProviderFactory } from '../provider-factory';
import { APIClient } from '../client';
import { APIEnvelope, createEnvelope, createErrorEnvelope } from '../envelope';
import type { 
  ContentProvider, 
  PageData, 
  BlockData, 
  SEOData, 
  RequestContext,
  ContentFilters 
} from '../../interfaces/content-provider';

// Mock data
const mockPageData: PageData = {
  slug: 'test-page',
  title: 'Test Page',
  description: 'A test page',
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
    description: 'SEO description'
  }
};

const mockBlockData: BlockData = {
  id: 'test-block',
  name: 'Test Block',
  description: 'A test block',
  category: 'content',
  tags: ['test'],
  content: {
    componentType: 'TextBlock',
    props: { text: 'Block content' }
  },
  constraints: {},
  variants: [],
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
};

const mockSEOData: SEOData = {
  title: 'Test SEO Title',
  description: 'Test SEO description',
  canonical: 'https://example.com/test',
  robots: 'index,follow',
  openGraph: {
    title: 'OG Title',
    description: 'OG Description',
    image: 'https://example.com/image.jpg'
  },
  structuredData: [
    {
      '@type': 'Article',
      headline: 'Test Article'
    }
  ]
};

const mockRequestContext: RequestContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRoles: ['editor'],
  headers: new Map([['authorization', 'Bearer token']]),
  timestamp: new Date('2024-01-01T00:00:00Z')
};

describe('API Bridge System - Unit Tests', () => {
  describe('API Envelope', () => {
    it('should create success envelope with data', () => {
      const envelope = createEnvelope(mockPageData, {
        version: '1.0.0',
        tenant: 'tenant-1'
      });

      expect(envelope.data).toEqual(mockPageData);
      expect(envelope.meta.version).toBe('1.0.0');
      expect(envelope.meta.tenant).toBe('tenant-1');
      expect(envelope.meta.timestamp).toBeDefined();
      expect(envelope.errors).toBeUndefined();
      expect(envelope.warnings).toBeUndefined();
    });

    it('should create envelope with warnings', () => {
      const envelope = createEnvelope(mockPageData, {
        version: '1.0.0'
      }, [], ['Deprecated field used']);

      expect(envelope.data).toEqual(mockPageData);
      expect(envelope.warnings).toEqual(['Deprecated field used']);
    });

    it('should create error envelope', () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Page not found',
        details: { slug: 'missing-page' },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req-123',
        path: '/api/cms/pages/missing-page'
      };

      const envelope = createErrorEnvelope(error, {
        version: '1.0.0',
        tenant: 'tenant-1'
      });

      expect(envelope.error).toEqual(error);
      expect(envelope.meta.version).toBe('1.0.0');
      expect(envelope.meta.tenant).toBe('tenant-1');
    });

    it('should validate envelope structure', () => {
      const envelope = createEnvelope({ test: 'data' });
      
      expect(envelope).toHaveProperty('data');
      expect(envelope).toHaveProperty('meta');
      expect(envelope.meta).toHaveProperty('timestamp');
      expect(envelope.meta).toHaveProperty('version');
    });
  });

  describe('File Provider', () => {
    let fileProvider: FileProvider;

    beforeEach(() => {
      fileProvider = new FileProvider({
        dataPath: './test-data',
        enableCaching: false
      });

      // Mock file system operations
      vi.mock('fs/promises', () => ({
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn()
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should implement ContentProvider interface', () => {
      expect(fileProvider).toHaveProperty('getPage');
      expect(fileProvider).toHaveProperty('getBlock');
      expect(fileProvider).toHaveProperty('getSEO');
      expect(fileProvider).toHaveProperty('setContent');
      expect(fileProvider).toHaveProperty('deleteContent');
      expect(fileProvider).toHaveProperty('listContent');
    });

    it('should get page data', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPageData));

      const result = await fileProvider.getPage('test-page', mockRequestContext);
      expect(result).toEqual(mockPageData);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('test-page.json'),
        'utf-8'
      );
    });

    it('should handle missing page gracefully', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(fileProvider.getPage('missing-page', mockRequestContext))
        .rejects.toThrow('Page not found');
    });

    it('should get block data', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBlockData));

      const result = await fileProvider.getBlock('test-block', mockRequestContext);
      expect(result).toEqual(mockBlockData);
    });

    it('should get SEO data', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSEOData));

      const result = await fileProvider.getSEO('page', 'test-page');
      expect(result).toEqual(mockSEOData);
    });

    it('should set content', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await fileProvider.setContent('page', 'new-page', mockPageData);
      
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('new-page.json'),
        JSON.stringify(mockPageData, null, 2),
        'utf-8'
      );
    });

    it('should delete content', async () => {
      const fs = await import('fs/promises');
      const unlink = vi.fn().mockResolvedValue(undefined);
      vi.mocked(fs).unlink = unlink;

      await fileProvider.deleteContent('page', 'test-page');
      
      expect(unlink).toHaveBeenCalledWith(
        expect.stringContaining('test-page.json')
      );
    });

    it('should list content with filters', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readdir).mockResolvedValue(['page1.json', 'page2.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify({ ...mockPageData, slug: 'page1' }))
        .mockResolvedValueOnce(JSON.stringify({ ...mockPageData, slug: 'page2', status: 'draft' }));

      const filters: ContentFilters = {
        status: 'published',
        limit: 10,
        offset: 0
      };

      const result = await fileProvider.listContent('page', filters);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe('page1');
      expect(result.total).toBe(1);
    });
  });

  describe('Database Provider', () => {
    let databaseProvider: DatabaseProvider;
    let mockAdapter: any;

    beforeEach(() => {
      mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        transaction: vi.fn()
      };

      databaseProvider = new DatabaseProvider({
        adapter: mockAdapter,
        enableCaching: false
      });
    });

    it('should implement ContentProvider interface', () => {
      expect(databaseProvider).toHaveProperty('getPage');
      expect(databaseProvider).toHaveProperty('getBlock');
      expect(databaseProvider).toHaveProperty('getSEO');
      expect(databaseProvider).toHaveProperty('setContent');
      expect(databaseProvider).toHaveProperty('deleteContent');
      expect(databaseProvider).toHaveProperty('listContent');
    });

    it('should get page from database', async () => {
      mockAdapter.query.mockResolvedValue([mockPageData]);

      const result = await databaseProvider.getPage('test-page', mockRequestContext);
      
      expect(result).toEqual(mockPageData);
      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['test-page', 'tenant-1'])
      );
    });

    it('should handle database connection errors', async () => {
      mockAdapter.query.mockRejectedValue(new Error('Connection failed'));

      await expect(databaseProvider.getPage('test-page', mockRequestContext))
        .rejects.toThrow('Database error');
    });

    it('should use transactions for content updates', async () => {
      const mockTransaction = {
        query: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      mockAdapter.transaction.mockResolvedValue(mockTransaction);

      await databaseProvider.setContent('page', 'test-page', mockPageData);

      expect(mockAdapter.transaction).toHaveBeenCalled();
      expect(mockTransaction.query).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback on transaction errors', async () => {
      const mockTransaction = {
        query: vi.fn().mockRejectedValue(new Error('Query failed')),
        commit: vi.fn(),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      mockAdapter.transaction.mockResolvedValue(mockTransaction);

      await expect(databaseProvider.setContent('page', 'test-page', mockPageData))
        .rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('Provider Factory', () => {
    let factory: ProviderFactory;

    beforeEach(() => {
      factory = new ProviderFactory();
    });

    it('should create file provider', () => {
      const provider = factory.createProvider('file', {
        dataPath: './data'
      });

      expect(provider).toBeInstanceOf(FileProvider);
    });

    it('should create database provider', () => {
      const mockAdapter = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        query: vi.fn(),
        transaction: vi.fn()
      };

      const provider = factory.createProvider('database', {
        adapter: mockAdapter
      });

      expect(provider).toBeInstanceOf(DatabaseProvider);
    });

    it('should throw error for unknown provider type', () => {
      expect(() => factory.createProvider('unknown' as any, {}))
        .toThrow('Unknown provider type');
    });

    it('should register custom provider', () => {
      class CustomProvider implements ContentProvider {
        async getPage() { return mockPageData; }
        async getBlock() { return mockBlockData; }
        async getSEO() { return mockSEOData; }
        async setContent() { return; }
        async deleteContent() { return; }
        async listContent() { return { items: [], total: 0 }; }
      }

      factory.registerProvider('custom', CustomProvider);
      const provider = factory.createProvider('custom', {});

      expect(provider).toBeInstanceOf(CustomProvider);
    });
  });

  describe('API Client', () => {
    let apiClient: APIClient;
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;

      apiClient = new APIClient({
        baseURL: 'https://api.example.com',
        defaultHeaders: {
          'Authorization': 'Bearer token'
        },
        timeout: 5000,
        retries: 3
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should make GET request with proper headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(createEnvelope(mockPageData))
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/pages/test-page');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/pages/test-page',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data).toEqual(mockPageData);
    });

    it('should make POST request with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue(createEnvelope(mockPageData))
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.post('/pages', mockPageData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/pages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockPageData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue(createErrorEnvelope({
          code: 'NOT_FOUND',
          message: 'Page not found',
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req-123',
          path: '/pages/missing'
        }))
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.get('/pages/missing'))
        .rejects.toThrow('Page not found');
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(createEnvelope(mockPageData))
        });

      const result = await apiClient.get('/pages/test-page');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual(mockPageData);
    });

    it('should respect timeout', async () => {
      const slowClient = new APIClient({
        baseURL: 'https://api.example.com',
        timeout: 100
      });

      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(slowClient.get('/pages/test-page'))
        .rejects.toThrow('Request timeout');
    });

    it('should handle caching', async () => {
      const cachingClient = new APIClient({
        baseURL: 'https://api.example.com',
        enableCaching: true,
        cacheTTL: 60000
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(createEnvelope(mockPageData))
      };
      mockFetch.mockResolvedValue(mockResponse);

      // First request
      await cachingClient.get('/pages/test-page');
      // Second request (should use cache)
      await cachingClient.get('/pages/test-page');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should add custom headers per request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(createEnvelope(mockPageData))
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.get('/pages/test-page', {
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'Authorization': 'Bearer token'
          })
        })
      );
    });
  });

  describe('Content Validation', () => {
    let fileProvider: FileProvider;

    beforeEach(() => {
      fileProvider = new FileProvider({
        dataPath: './test-data',
        enableValidation: true
      });
    });

    it('should validate page data structure', async () => {
      const invalidPageData = {
        // Missing required fields
        content: {}
      };

      await expect(fileProvider.setContent('page', 'invalid', invalidPageData))
        .rejects.toThrow('Validation error');
    });

    it('should validate block data structure', async () => {
      const invalidBlockData = {
        name: 'Test Block',
        // Missing required fields
      };

      await expect(fileProvider.setContent('block', 'invalid', invalidBlockData))
        .rejects.toThrow('Validation error');
    });

    it('should sanitize content before storage', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const unsafePageData = {
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

      await fileProvider.setContent('page', 'safe-page', unsafePageData);

      const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
      expect(writtenData.title).not.toContain('<script>');
      expect(writtenData.content.blocks[0].props.text).not.toContain('<script>');
    });
  });
});