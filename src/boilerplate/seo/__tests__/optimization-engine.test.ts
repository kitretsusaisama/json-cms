/**
 * Tests for SEO Optimization Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizationEngine } from '../optimization-engine';

describe('OptimizationEngine', () => {
  let engine: OptimizationEngine;

  beforeEach(() => {
    engine = new OptimizationEngine();
  });

  describe('analyzePage', () => {
    it('should analyze page content and return optimization data', async () => {
      const content = `
        <title>Test Page Title</title>
        <meta name="description" content="This is a test page description">
        <h1>Main Heading</h1>
        <h2>Subheading</h2>
        <p>This is a paragraph with enough content to analyze. It contains multiple sentences and provides good content for SEO analysis.</p>
        <img src="/test.jpg" alt="Test image">
      `;

      const result = await engine.analyzePage('test-page', content);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('improvements');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should identify missing title tag', async () => {
      const content = '<p>Content without title</p>';
      const result = await engine.analyzePage('test-page', content);

      const missingTitleIssue = result.issues.find(issue => issue.code === 'MISSING_TITLE');
      expect(missingTitleIssue).toBeDefined();
      expect(missingTitleIssue?.type).toBe('error');
    });

    it('should identify missing meta description', async () => {
      const content = '<title>Test</title><p>Content without meta description</p>';
      const result = await engine.analyzePage('test-page', content);

      const missingDescIssue = result.issues.find(issue => issue.code === 'MISSING_META_DESCRIPTION');
      expect(missingDescIssue).toBeDefined();
      expect(missingDescIssue?.type).toBe('warning');
    });

    it('should identify missing H1 tag', async () => {
      const content = '<title>Test</title><p>Content without H1</p>';
      const result = await engine.analyzePage('test-page', content);

      const missingH1Issue = result.issues.find(issue => issue.code === 'MISSING_H1');
      expect(missingH1Issue).toBeDefined();
    });

    it('should analyze content length', async () => {
      const shortContent = '<title>Test</title><p>Short content.</p>';
      const result = await engine.analyzePage('test-page', shortContent);

      const lowWordCountIssue = result.issues.find(issue => issue.code === 'LOW_WORD_COUNT');
      expect(lowWordCountIssue).toBeDefined();
    });

    it('should provide suggestions for improvement', async () => {
      const content = '<title>Test</title><p>Basic content for testing.</p>';
      const result = await engine.analyzePage('test-page', content);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toHaveProperty('type');
      expect(result.suggestions[0]).toHaveProperty('priority');
      expect(result.suggestions[0]).toHaveProperty('message');
      expect(result.suggestions[0]).toHaveProperty('suggestion');
      expect(result.suggestions[0]).toHaveProperty('impact');
    });

    it('should analyze images for alt text', async () => {
      const contentWithoutAlt = '<img src="/test.jpg"><img src="/test2.jpg" alt="Good alt text">';
      const result = await engine.analyzePage('test-page', contentWithoutAlt);

      const missingAltIssue = result.issues.find(issue => issue.code === 'MISSING_ALT_TEXT');
      expect(missingAltIssue).toBeDefined();
    });
  });
});