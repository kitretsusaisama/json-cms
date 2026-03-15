/**
 * Tests for SEO Validation Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../validation-engine';
import { SeoRecord } from '@/types/seo';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe('validate', () => {
    it('should validate a complete SEO record', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'This is a well-optimized page title for SEO',
        description: 'This is a comprehensive meta description that provides detailed information about the page content and is optimized for search engines.',
        canonical: 'https://example.com/test-page',
        robots: 'index,follow',
        meta: [],
        openGraph: {
          type: 'website',
          title: 'Test Page',
          description: 'Test description',
          url: 'https://example.com/test-page'
        },
        twitter: {
          card: 'summary',
          title: 'Test Page',
          description: 'Test description'
        },
        structuredData: [{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Test Site',
          url: 'https://example.com'
        }],
        updatedAt: new Date().toISOString()
      };

      const result = await engine.validate(seoRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should identify missing title', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: '',
        description: 'Valid description that meets the minimum length requirements for SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      expect(result.isValid).toBe(false);
      const titleError = result.errors.find(error => error.code === 'TITLE_REQUIRED');
      expect(titleError).toBeDefined();
    });

    it('should identify missing description', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Valid title that meets requirements',
        description: '',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      expect(result.isValid).toBe(false);
      const descError = result.errors.find(error => error.code === 'DESCRIPTION_REQUIRED');
      expect(descError).toBeDefined();
    });

    it('should warn about short title', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Short title',
        description: 'This is a valid description that meets the minimum length requirements for proper SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      const titleWarning = result.warnings.find(warning => warning.field === 'title');
      expect(titleWarning).toBeDefined();
      expect(titleWarning?.message).toContain('too short');
    });

    it('should warn about long title', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'This is an extremely long title that exceeds the recommended character limit for SEO optimization',
        description: 'This is a valid description that meets the minimum length requirements for proper SEO optimization.',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      const titleWarning = result.warnings.find(warning => warning.field === 'title');
      expect(titleWarning).toBeDefined();
      expect(titleWarning?.message).toContain('too long');
    });

    it('should validate canonical URL format', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Valid title for SEO optimization',
        description: 'This is a valid description that meets the minimum length requirements for proper SEO optimization.',
        canonical: 'invalid-url',
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      const canonicalError = result.errors.find(error => error.code === 'INVALID_CANONICAL_URL');
      expect(canonicalError).toBeDefined();
    });

    it('should validate Twitter card type', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Valid title for SEO optimization',
        description: 'This is a valid description that meets the minimum length requirements for proper SEO optimization.',
        twitter: {
          card: 'invalid_card_type' as any
        },
        updatedAt: new Date().toISOString(),
        meta: [],
        structuredData: []
      };

      const result = await engine.validate(seoRecord);

      const twitterError = result.errors.find(error => error.code === 'INVALID_TWITTER_CARD');
      expect(twitterError).toBeDefined();
    });

    it('should validate structured data format', async () => {
      const seoRecord: SeoRecord = {
        id: 'test-page',
        type: 'page',
        title: 'Valid title for SEO optimization',
        description: 'This is a valid description that meets the minimum length requirements for proper SEO optimization.',
        structuredData: [{
          // Missing @context and @type
          name: 'Test'
        }],
        updatedAt: new Date().toISOString(),
        meta: []
      };

      const result = await engine.validate(seoRecord);

      const contextError = result.errors.find(error => error.code === 'MISSING_STRUCTURED_DATA_CONTEXT');
      const typeError = result.errors.find(error => error.code === 'MISSING_STRUCTURED_DATA_TYPE');
      expect(contextError).toBeDefined();
      expect(typeError).toBeDefined();
    });
  });
});