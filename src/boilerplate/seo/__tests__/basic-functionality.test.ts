/**
 * Basic functionality tests for SEO system
 */

import { describe, it, expect } from 'vitest';
import { ValidationEngine } from '../validation-engine';
import { OptimizationEngine } from '../optimization-engine';
import { HealthChecker } from '../health-checker';

describe('SEO System Basic Functionality', () => {
  describe('ValidationEngine', () => {
    it('should create validation engine instance', () => {
      const engine = new ValidationEngine();
      expect(engine).toBeDefined();
    });

    it('should validate SEO data', async () => {
      const engine = new ValidationEngine();
      const seoData = {
        id: 'test',
        type: 'page' as const,
        title: 'Test Page Title',
        description: 'This is a test page description that is long enough to meet requirements.',
        updatedAt: new Date().toISOString()
      };

      const result = await engine.validate(seoData);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('score');
    });
  });

  describe('OptimizationEngine', () => {
    it('should create optimization engine instance', () => {
      const engine = new OptimizationEngine();
      expect(engine).toBeDefined();
    });

    it('should analyze page content', async () => {
      const engine = new OptimizationEngine();
      const content = '<h1>Test Title</h1><p>This is test content with enough words to analyze properly.</p>';
      
      const result = await engine.analyzePage('test-page', content);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('improvements');
    });
  });

  describe('HealthChecker', () => {
    it('should create health checker instance', () => {
      const checker = new HealthChecker();
      expect(checker).toBeDefined();
    });
  });
});