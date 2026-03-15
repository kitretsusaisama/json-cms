/**
 * Tests for SEO Health Checker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthChecker } from '../health-checker';
import { SeoRecord } from '@/types/seo';

// Mock dependencies
vi.mock('@/lib/seo-store', () => ({
  getSeoWithDefaults: vi.fn()
}));

import { getSeoWithDefaults } from '@/lib/seo-store';

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    healthChecker = new HealthChecker();
    vi.clearAllMocks();
  });

  describe('analyzePageHealth', () => {
    it('should return comprehensive health score for valid SEO data', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Well optimized page title for SEO',
        description: 'This is a comprehensive meta description that provides detailed information about the page content and is optimized for search engines.',
        canonical: 'https://example.com/test-page',
        robots: 'index,follow',
        meta: [
          { name: 'keywords', content: 'test, seo, optimization' },
          { name: 'author', content: 'John Doe' }
        ],
        openGraph: {
          type: 'website',
          title: 'Test Page',
          description: 'Test description',
          url: 'https://example.com/test-page'
        },
        twitter: {
          card: 'summary',
          title: 'Test Page'
        },
        structuredData: [{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Test Site'
        }],
        updatedAt: new Date().toISOString()
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page');

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.overall).toBe('number');
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      
      expect(result.categories).toHaveProperty('technical');
      expect(result.categories).toHaveProperty('content');
      expect(result.categories).toHaveProperty('performance');
      expect(result.categories).toHaveProperty('accessibility');
    });

    it('should return low scores for poor SEO data', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Bad',
        description: 'Too short',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page');

      expect(result.overall).toBeLessThan(50);
      expect(result.categories.technical).toBeLessThan(50);
      expect(result.categories.content).toBeLessThan(50);
    });

    it('should identify missing SEO elements', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Decent title for testing purposes',
        description: 'This is a reasonable description that meets minimum length requirements for SEO.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page');

      const missingStructuredDataIssue = result.issues.find(
        issue => issue.code === 'MISSING_STRUCTURED_DATA'
      );
      expect(missingStructuredDataIssue).toBeDefined();
    });

    it('should provide relevant recommendations', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Short title',
        description: 'Short description that could be expanded for better SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page');

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const titleRecommendation = result.recommendations.find(
        rec => rec.type === 'title'
      );
      expect(titleRecommendation).toBeDefined();
    });

    it('should handle missing SEO data gracefully', async () => {
      (getSeoWithDefaults as any).mockResolvedValue(null);

      const result = await healthChecker.analyzePageHealth('nonexistent-page');

      expect(result.overall).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      
      const noDataIssue = result.issues.find(issue => issue.code === 'NO_SEO_DATA');
      expect(noDataIssue).toBeDefined();
    });

    it('should include performance analysis when requested', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Test page with good SEO optimization',
        description: 'This is a comprehensive description that meets all the requirements for proper SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page', {
        includePerformance: true
      });

      expect(result.categories.performance).toBeGreaterThan(0);
    });

    it('should include accessibility analysis when requested', async () => {
      const mockSeoData: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Test page with good SEO optimization',
        description: 'This is a comprehensive description that meets all the requirements for proper SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      (getSeoWithDefaults as any).mockResolvedValue(mockSeoData);

      const result = await healthChecker.analyzePageHealth('test-page', {
        includeAccessibility: true
      });

      expect(result.categories.accessibility).toBeGreaterThan(0);
    });
  });
});