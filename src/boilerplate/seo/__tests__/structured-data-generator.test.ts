/**
 * Tests for Structured Data Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StructuredDataGenerator } from '../structured-data-generator';
import { PageV2 } from '@/types/composer';

describe('StructuredDataGenerator', () => {
  let generator: StructuredDataGenerator;

  beforeEach(() => {
    generator = new StructuredDataGenerator();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  });

  describe('generateFromPage', () => {
    it('should generate WebSite structured data', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'home',
        components: [
          {
            id: 'header-1',
            componentType: 'header',
            props: {
              siteName: 'Test Website',
              brandName: 'Test Brand'
            }
          }
        ]
      };

      const results = await generator.generateFromPage(pageData);
      const websiteData = results.find(r => r.type === 'WebSite');

      expect(websiteData).toBeDefined();
      expect(websiteData?.isValid).toBe(true);
      expect(websiteData?.data).toHaveProperty('name');
      expect(websiteData?.data).toHaveProperty('url');
    });

    it('should generate BreadcrumbList from page slug', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'products/electronics/phones',
        components: []
      };

      const results = await generator.generateFromPage(pageData);
      const breadcrumbData = results.find(r => r.type === 'BreadcrumbList');

      expect(breadcrumbData).toBeDefined();
      expect(breadcrumbData?.isValid).toBe(true);
      expect(breadcrumbData?.data).toHaveProperty('items');
      expect(Array.isArray(breadcrumbData?.data.items)).toBe(true);
    });

    it('should generate Article structured data', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'blog/test-article',
        components: [
          {
            id: 'article-1',
            componentType: 'article',
            props: {
              title: 'Test Article',
              description: 'This is a test article',
              author: 'John Doe',
              publishedDate: '2024-01-01',
              featuredImage: 'https://example.com/image.jpg'
            }
          }
        ]
      };

      const results = await generator.generateFromPage(pageData);
      const articleData = results.find(r => r.type === 'Article');

      expect(articleData).toBeDefined();
      expect(articleData?.isValid).toBe(true);
      expect(articleData?.data).toHaveProperty('title');
      expect(articleData?.data).toHaveProperty('author');
    });

    it('should generate Product structured data', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'products/test-product',
        components: [
          {
            id: 'product-1',
            componentType: 'product',
            props: {
              name: 'Test Product',
              description: 'This is a test product',
              brand: 'Test Brand',
              price: '99.99',
              currency: 'USD',
              image: 'https://example.com/product.jpg'
            }
          }
        ]
      };

      const results = await generator.generateFromPage(pageData);
      const productData = results.find(r => r.type === 'Product');

      expect(productData).toBeDefined();
      expect(productData?.isValid).toBe(true);
      expect(productData?.data).toHaveProperty('name');
      expect(productData?.data).toHaveProperty('price');
    });

    it('should generate Organization structured data', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'about',
        components: [
          {
            id: 'about-1',
            componentType: 'about',
            props: {
              companyName: 'Test Company',
              logo: 'https://example.com/logo.jpg',
              socialLinks: ['https://twitter.com/test', 'https://facebook.com/test']
            }
          }
        ]
      };

      const results = await generator.generateFromPage(pageData);
      const orgData = results.find(r => r.type === 'Organization');

      expect(orgData).toBeDefined();
      expect(orgData?.isValid).toBe(true);
      expect(orgData?.data).toHaveProperty('name');
      expect(orgData?.data).toHaveProperty('socialLinks');
    });

    it('should handle pages without specific components', async () => {
      const pageData: PageV2 = {
        version: 2,
        slug: 'simple-page',
        components: [
          {
            id: 'text-1',
            componentType: 'text',
            props: {
              content: 'Simple text content'
            }
          }
        ]
      };

      const results = await generator.generateFromPage(pageData);

      // Should still generate WebSite data with defaults
      const websiteData = results.find(r => r.type === 'WebSite');
      expect(websiteData).toBeDefined();
    });

    it('should handle invalid structured data gracefully', async () => {
      // Mock the generateStructuredData function to throw an error
      const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;

      const pageData: PageV2 = {
        version: 2,
        slug: 'test',
        components: []
      };

      const results = await generator.generateFromPage(pageData);
      
      // Should return empty array when site URL is missing
      expect(results.length).toBe(0);

      // Restore environment
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    });
  });
});