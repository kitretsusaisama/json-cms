/**
 * Cache Utils Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheUtils } from '../cache-utils';

describe('CacheUtils', () => {
  let utils: CacheUtils;

  beforeEach(() => {
    utils = new CacheUtils();
  });

  describe('key generation', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = utils.generateKey('test');
      const key2 = utils.generateKey('test');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = utils.generateKey('test1');
      const key2 = utils.generateKey('test2');
      expect(key1).not.toBe(key2);
    });

    it('should generate keys with prefix', () => {
      const key = utils.generateKey('test', 'prefix');
      expect(key).toMatch(/^prefix:/);
    });

    it('should generate consistent keys for objects', () => {
      const obj1 = { name: 'test', value: 42 };
      const obj2 = { value: 42, name: 'test' }; // Different order
      
      const key1 = utils.generateKey(obj1);
      const key2 = utils.generateKey(obj2);
      expect(key1).toBe(key2); // Should be same due to key sorting
    });

    it('should generate content keys', () => {
      const key = utils.generateContentKey('page', 'home');
      expect(key).toBe('page:home');
      
      const keyWithContext = utils.generateContentKey('page', 'home', { locale: 'en' });
      expect(keyWithContext).toMatch(/^page:home:/);
    });

    it('should generate user keys', () => {
      const key = utils.generateUserKey('user123', 'profile');
      expect(key).toBe('user:user123:profile');
      
      const keyWithParams = utils.generateUserKey('user123', 'posts', { limit: 10 });
      expect(keyWithParams).toMatch(/^user:user123:posts:/);
    });

    it('should generate tenant keys', () => {
      const key = utils.generateTenantKey('tenant1', 'config');
      expect(key).toBe('tenant:tenant1:config');
    });

    it('should generate API keys', () => {
      const key = utils.generateAPIKey('GET', '/api/users');
      expect(key).toBe('api:get:_api_users');
      
      const keyWithQuery = utils.generateAPIKey('GET', '/api/users', { page: 1 });
      expect(keyWithQuery).toMatch(/^api:get:_api_users:q:/);
    });
  });

  describe('pattern matching', () => {
    it('should match exact patterns', () => {
      expect(utils.matchesPattern('test', 'test')).toBe(true);
      expect(utils.matchesPattern('test', 'other')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(utils.matchesPattern('*', 'anything')).toBe(true);
      expect(utils.matchesPattern('user:*', 'user:123')).toBe(true);
      expect(utils.matchesPattern('user:*', 'post:123')).toBe(false);
      expect(utils.matchesPattern('user:*:profile', 'user:123:profile')).toBe(true);
    });

    it('should match question mark patterns', () => {
      expect(utils.matchesPattern('user:?', 'user:1')).toBe(true);
      expect(utils.matchesPattern('user:?', 'user:12')).toBe(false);
    });
  });

  describe('tag matching', () => {
    it('should match tags', () => {
      const entryTags = ['tag1', 'tag2', 'tag3'];
      const targetTags = ['tag2'];
      
      expect(utils.hasMatchingTags(entryTags, targetTags)).toBe(true);
    });

    it('should not match when no tags overlap', () => {
      const entryTags = ['tag1', 'tag2'];
      const targetTags = ['tag3', 'tag4'];
      
      expect(utils.hasMatchingTags(entryTags, targetTags)).toBe(false);
    });
  });

  describe('compression', () => {
    it('should compress and decompress data', () => {
      const data = 'This is a test string that should be compressed';
      const compressed = utils.compress(data);
      const decompressed = utils.decompress(compressed);
      
      expect(decompressed).toBe(data);
      expect(compressed).not.toBe(data);
    });

    it('should handle compression errors gracefully', () => {
      const invalidData = 'invalid base64 data';
      const result = utils.decompress(invalidData);
      expect(result).toBe(invalidData); // Should return original on error
    });
  });

  describe('size calculation', () => {
    it('should calculate string size', () => {
      const size = utils.calculateSize('hello');
      expect(size).toBe(5);
    });

    it('should calculate number size', () => {
      const size = utils.calculateSize(42);
      expect(size).toBe(8); // 64-bit number
    });

    it('should calculate boolean size', () => {
      const size = utils.calculateSize(true);
      expect(size).toBe(1);
    });

    it('should calculate object size', () => {
      const obj = { name: 'test', value: 42 };
      const size = utils.calculateSize(obj);
      expect(size).toBeGreaterThan(0);
    });

    it('should handle null and undefined', () => {
      expect(utils.calculateSize(null)).toBe(0);
      expect(utils.calculateSize(undefined)).toBe(0);
    });
  });

  describe('size formatting', () => {
    it('should format bytes', () => {
      expect(utils.formatSize(1024)).toBe('1.00 KB');
      expect(utils.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(utils.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should format small sizes', () => {
      expect(utils.formatSize(500)).toBe('500.00 B');
    });
  });

  describe('TTL parsing', () => {
    it('should parse TTL strings', () => {
      expect(utils.parseTTL('30s')).toBe(30000);
      expect(utils.parseTTL('5m')).toBe(300000);
      expect(utils.parseTTL('2h')).toBe(7200000);
      expect(utils.parseTTL('1d')).toBe(86400000);
    });

    it('should handle numeric TTL', () => {
      expect(utils.parseTTL(5000)).toBe(5000);
    });

    it('should default to seconds', () => {
      expect(utils.parseTTL('30')).toBe(30000);
    });

    it('should throw on invalid format', () => {
      expect(() => utils.parseTTL('invalid')).toThrow();
    });
  });

  describe('tag generation', () => {
    it('should generate content tags', () => {
      const tags = utils.generateContentTags('page', 'home', {
        category: 'landing',
        author: 'admin'
      });
      
      expect(tags).toContain('type:page');
      expect(tags).toContain('id:home');
      expect(tags).toContain('content:page:home');
      expect(tags).toContain('category:landing');
      expect(tags).toContain('author:admin');
    });

    it('should generate user tags', () => {
      const tags = utils.generateUserTags('user123', ['admin', 'editor']);
      
      expect(tags).toContain('user:user123');
      expect(tags).toContain('role:admin');
      expect(tags).toContain('role:editor');
    });

    it('should generate tenant tags', () => {
      const tags = utils.generateTenantTags('tenant1', ['feature1', 'feature2']);
      
      expect(tags).toContain('tenant:tenant1');
      expect(tags).toContain('feature:feature1');
      expect(tags).toContain('feature:feature2');
    });
  });

  describe('key validation', () => {
    it('should validate valid keys', () => {
      expect(utils.validateKey('valid_key')).toBe(true);
      expect(utils.validateKey('key:with:colons')).toBe(true);
      expect(utils.validateKey('key-with-dashes')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(utils.validateKey('')).toBe(false); // Empty
      expect(utils.validateKey('key with spaces')).toBe(false); // Spaces
      expect(utils.validateKey('key\nwith\nnewlines')).toBe(false); // Newlines
      expect(utils.validateKey('a'.repeat(300))).toBe(false); // Too long
    });

    it('should sanitize keys', () => {
      const sanitized = utils.sanitizeKey('key with spaces\nand\tnewlines');
      expect(sanitized).toBe('key_with_spaces_and_newlines');
    });
  });

  describe('versioned keys', () => {
    it('should create versioned keys', () => {
      const key = utils.createVersionedKey('base_key', '1.0');
      expect(key).toBe('base_key:v:1.0');
      
      const timestampKey = utils.createVersionedKey('base_key');
      expect(timestampKey).toMatch(/^base_key:v:\d+$/);
    });

    it('should extract version from keys', () => {
      const version = utils.extractVersion('base_key:v:1.0');
      expect(version).toBe('1.0');
      
      const noVersion = utils.extractVersion('base_key');
      expect(noVersion).toBeNull();
    });

    it('should remove version from keys', () => {
      const baseKey = utils.removeVersion('base_key:v:1.0');
      expect(baseKey).toBe('base_key');
    });
  });

  describe('warming priority', () => {
    it('should calculate warming priority', () => {
      const priority = utils.calculateWarmingPriority(
        100, // access count
        Date.now() - 1000, // last accessed 1 second ago
        'page',
        'admin'
      );
      
      expect(priority).toBeGreaterThan(0);
    });

    it('should give higher priority to recent access', () => {
      const recentPriority = utils.calculateWarmingPriority(
        10,
        Date.now() - 1000, // 1 second ago
        'page'
      );
      
      const oldPriority = utils.calculateWarmingPriority(
        10,
        Date.now() - 86400000, // 1 day ago
        'page'
      );
      
      expect(recentPriority).toBeGreaterThan(oldPriority);
    });

    it('should give higher priority to popular content', () => {
      const popularPriority = utils.calculateWarmingPriority(
        1000,
        Date.now() - 3600000,
        'page'
      );
      
      const unpopularPriority = utils.calculateWarmingPriority(
        10,
        Date.now() - 3600000,
        'page'
      );
      
      expect(popularPriority).toBeGreaterThan(unpopularPriority);
    });
  });
});