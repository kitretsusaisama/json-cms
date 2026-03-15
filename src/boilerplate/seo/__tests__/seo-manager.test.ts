/**
 * Tests for SEO Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CentralizedSEOManager } from '../seo-manager';
import { PageV2 } from '@/types/composer';

// Mock dependencies
vi.mock('@/lib/seo-store', () => ({
  getSeoWithDefaults: vi.fn()
}));

describe('CentralizedSEOManager', () => {
  let seoManager: CentralizedSEOManager;
  let mockPageData: PageV2;

  beforeEach(() => {
    seoManager = new CentralizedSEOManager();
    mockPageData = {
      version: 2,
      slug: 'test-page',
      components: [
        {
          id: 'hero-1',
          componentType: 'hero',
          props: {
            title: 'Test Page Title',
            description: 'This is a test page description'
          }
        }
      ]
    };
  });

  describe('generateMetadata', () => {
    it('should generate metadata from page data', async () => {
      const context = {
        tenantId: 'test-tenant',
        locale: 'en'
      };

      const metadata = await seoManager.generateMetadata(mockPageData, context);

      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('structuredData');
      expect(Array.isArray(metadata.structuredData)).toBe(true);
    });

    it('should generate title from page components when no SEO record exists', async () => {
      const context = {};
      const metadata = await seoManager.generateMetadata(mockPageData, context);

      expect(metadata.title).toBe('Test Page Title');
    });

    it('should generate description from page components', async () => {
      const context = {};
      const metadata = await seoManager.generateMetadata(mockPageData, context);

      expect(metadata.description).toBe('This is a test page description');
    });

    it('should generate canonical URL correctly', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      const context = { locale: 'en' };
      const metadata = await seoManager.generateMetadata(mockPageData, context);

      expect(metadata.canonical).toBe('https://example.com/test-page');
    });

    it('should include locale in canonical URL for non-English locales', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      const context = { locale: 'es' };
      const metadata = await seoManager.generateMetadata(mockPageData, context);

      expect(metadata.canonical).toBe('https://example.com/es/test-page');
    });
  });

  describe('optimizePage', () => {
    it('should return optimization analysis', async () => {
      const content = '<h1>Test Title</h1><p>This is test content with enough words to analyze.</p>';
      const optimization = await seoManager.optimizePage('test-page', content);

      expect(optimization).toHaveProperty('score');
      expect(optimization).toHaveProperty('suggestions');
      expect(optimization).toHaveProperty('issues');
      expect(optimization).toHaveProperty('improvements');
      expect(typeof optimization.score).toBe('number');
    });
  });

  describe('generateStructuredData', () => {
    it('should generate structured data from page content', async () => {
      const structuredData = await seoManager.generateStructuredData(mockPageData);

      expect(Array.isArray(structuredData)).toBe(true);
      expect(structuredData.length).toBeGreaterThan(0);
      
      const websiteData = structuredData.find(data => data.type === 'WebSite');
      expect(websiteData).toBeDefined();
      expect(websiteData?.isValid).toBe(true);
    });
  });

  describe('getHealthScore', () => {
    it('should return health score analysis', async () => {
      const healthScore = await seoManager.getHealthScore('test-page');

      expect(healthScore).toHaveProperty('overall');
      expect(healthScore).toHaveProperty('categories');
      expect(healthScore).toHaveProperty('issues');
      expect(healthScore).toHaveProperty('recommendations');
      expect(typeof healthScore.overall).toBe('number');
      expect(healthScore.categories).toHaveProperty('technical');
      expect(healthScore.categories).toHaveProperty('content');
      expect(healthScore.categories).toHaveProperty('performance');
      expect(healthScore.categories).toHaveProperty('accessibility');
    });
  });
});