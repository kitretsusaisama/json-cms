/**
 * Memory Cache Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryCache } from '../memory-cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(
      { namespace: 'test', keyPrefix: 'test:' },
      { maxSize: 1024 * 1024, maxKeys: 100, useClones: true }
    );
  });

  afterEach(async () => {
    await cache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      expect(await cache.has('key1')).toBe(false);
    });

    it('should clear all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      expect(await cache.getSize()).toBe(2);
      
      await cache.clear();
      expect(await cache.getSize()).toBe(0);
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1', { ttl: 100 }); // 100ms TTL
      
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cache.get('key1')).toBeNull();
    });

    it('should not expire entries before TTL', async () => {
      await cache.set('key1', 'value1', { ttl: 1000 }); // 1 second TTL
      
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await cache.get('key1')).toBe('value1');
    });

    it('should flush expired entries', async () => {
      await cache.set('key1', 'value1', { ttl: 50 });
      await cache.set('key2', 'value2', { ttl: 1000 });
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const flushed = await cache.flushExpired();
      expect(flushed).toBe(1);
      
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(true);
    });
  });

  describe('tags functionality', () => {
    it('should invalidate by tags', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      await cache.set('key2', 'value2', { tags: ['tag2', 'tag3'] });
      await cache.set('key3', 'value3', { tags: ['tag3'] });
      
      const invalidated = await cache.invalidateByTags(['tag2']);
      expect(invalidated).toBe(2);
      
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
      expect(await cache.has('key3')).toBe(true);
    });
  });

  describe('batch operations', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      const values = await cache.getMany(['key1', 'key2', 'nonexistent']);
      expect(values).toEqual(['value1', 'value2', null]);
    });

    it('should set multiple values', async () => {
      await cache.setMany([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', options: { ttl: 1000 } }
      ]);
      
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should delete multiple keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      const deleted = await cache.deleteMany(['key1', 'key3', 'nonexistent']);
      expect(deleted).toBe(2);
      
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(true);
      expect(await cache.has('key3')).toBe(false);
    });
  });

  describe('memory management', () => {
    it('should track memory usage', async () => {
      await cache.set('key1', 'a'.repeat(1000));
      await cache.set('key2', 'b'.repeat(1000));
      
      const stats = await cache.getMemoryStats();
      expect(stats.totalSize).toBeGreaterThan(2000);
      expect(stats.totalKeys).toBe(2);
      expect(stats.averageSize).toBeGreaterThan(1000);
    });

    it('should evict LRU entries when memory limit reached', async () => {
      // Create cache with small memory limit
      const smallCache = new MemoryCache(
        { namespace: 'test' },
        { maxSize: 200, maxKeys: 10 } // Increased size to account for overhead
      );

      // Fill cache beyond memory limit
      await smallCache.set('key1', 'a'.repeat(100));
      await smallCache.set('key2', 'b'.repeat(100));
      await smallCache.set('key3', 'c'.repeat(100)); // Should trigger eviction

      // Check that eviction occurred (at least one key should be evicted)
      const key1Exists = await smallCache.has('key1');
      const key2Exists = await smallCache.has('key2');
      const key3Exists = await smallCache.has('key3');
      
      // At least one key should be evicted due to memory pressure
      const totalKeys = [key1Exists, key2Exists, key3Exists].filter(Boolean).length;
      expect(totalKeys).toBeLessThan(3);

      await smallCache.destroy();
    });

    it('should track LRU order', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      // Access key1 to make it more recently used
      await cache.get('key1');
      
      const lruKeys = cache.getLRUKeys(2);
      expect(lruKeys).toEqual(['key2', 'key3']);
      
      const mruKeys = cache.getMRUKeys(2);
      expect(mruKeys).toEqual(['key1', 'key3']);
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit
      await cache.get('nonexistent'); // Miss
      
      const stats = await cache.getStats();
      expect(stats.totalKeys).toBe(1);
      expect(stats.operations.gets).toBe(2);
      expect(stats.operations.sets).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });
  });

  describe('object cloning', () => {
    it('should clone objects to prevent mutations', async () => {
      const obj = { name: 'test', value: 42 };
      await cache.set('obj', obj);
      
      const retrieved = await cache.get('obj') as any;
      expect(retrieved).toEqual(obj);
      
      // Mutate retrieved object
      retrieved.name = 'modified';
      
      // Original cached object should be unchanged
      const retrievedAgain = await cache.get('obj') as any;
      expect(retrievedAgain.name).toBe('test');
    });
  });

  describe('pattern matching', () => {
    it('should get keys by pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');
      
      const userKeys = await cache.getKeys('user:*');
      expect(userKeys).toEqual(['user:1', 'user:2']);
      
      const allKeys = await cache.getKeys();
      expect(allKeys).toHaveLength(3);
    });

    it('should invalidate by pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');
      
      const invalidated = await cache.invalidateByPattern('user:*');
      expect(invalidated).toBe(2);
      
      expect(await cache.has('user:1')).toBe(false);
      expect(await cache.has('user:2')).toBe(false);
      expect(await cache.has('post:1')).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should store and retrieve metadata', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1'] });
      
      const metadata = await cache.getMetadata('key1');
      expect(metadata).toBeDefined();
      expect(metadata!.key).toContain('key1');
      expect(metadata!.tags).toEqual(['tag1']);
      expect(metadata!.hits).toBe(0);
    });

    it('should update access information', async () => {
      await cache.set('key1', 'value1');
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Access the key multiple times
      await cache.get('key1');
      await cache.get('key1');
      
      const metadata = await cache.getMetadata('key1');
      expect(metadata!.hits).toBe(2);
      expect(metadata!.accessedAt).toBeGreaterThanOrEqual(metadata!.createdAt);
    });
  });
});