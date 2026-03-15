/**
 * Performance Tests for Caching and Optimization Features
 * Tests caching strategies, performance monitoring, and optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { CacheManager } from '../cache-manager';
import { MemoryCache } from '../memory-cache';
import { RedisCache } from '../redis-cache';
import { MultiLevelCache } from '../multi-level-cache';
import { PerformanceMonitor } from '../performance-monitor';
import { CacheWarmer } from '../cache-warmer';
import { CacheInvalidator } from '../cache-invalidator';

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  flushall: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

// Test data generators
function generateTestData(size: number): string {
  return 'x'.repeat(size);
}

function generateLargeObject(complexity: number) {
  const obj: any = {};
  for (let i = 0; i < complexity; i++) {
    obj[`key${i}`] = {
      id: i,
      name: `Item ${i}`,
      description: generateTestData(100),
      metadata: {
        created: new Date().toISOString(),
        tags: [`tag${i}`, `category${i % 10}`],
        nested: {
          level1: {
            level2: {
              data: generateTestData(50)
            }
          }
        }
      }
    };
  }
  return obj;
}

describe('Cache Performance Tests', () => {
  describe('Memory Cache Performance', () => {
    let memoryCache: MemoryCache;

    beforeEach(() => {
      memoryCache = new MemoryCache({
        maxSize: 1000,
        defaultTTL: 60000
      });
    });

    afterEach(() => {
      memoryCache.clear();
    });

    it('should handle high-frequency read/write operations', async () => {
      const iterations = 10000;
      const testData = generateTestData(1000);

      // Measure write performance
      const writeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await memoryCache.set(`key${i}`, testData, 60000);
      }
      const writeEnd = performance.now();
      const writeTime = writeEnd - writeStart;

      // Measure read performance
      const readStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await memoryCache.get(`key${i}`);
      }
      const readEnd = performance.now();
      const readTime = readEnd - readStart;

      // Performance assertions
      expect(writeTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(readTime).toBeLessThan(500);   // Reads should be faster than writes
      expect(writeTime / iterations).toBeLessThan(0.1); // Average write time under 0.1ms
      expect(readTime / iterations).toBeLessThan(0.05); // Average read time under 0.05ms

      console.log(`Memory Cache Performance:
        - Write: ${writeTime.toFixed(2)}ms for ${iterations} operations (${(writeTime/iterations).toFixed(4)}ms avg)
        - Read: ${readTime.toFixed(2)}ms for ${iterations} operations (${(readTime/iterations).toFixed(4)}ms avg)`);
    });

    it('should handle large object storage efficiently', async () => {
      const largeObject = generateLargeObject(1000);
      const objectSize = JSON.stringify(largeObject).length;

      const start = performance.now();
      await memoryCache.set('large-object', largeObject, 60000);
      const setTime = performance.now() - start;

      const getStart = performance.now();
      const retrieved = await memoryCache.get('large-object');
      const getTime = performance.now() - getStart;

      expect(retrieved).toEqual(largeObject);
      expect(setTime).toBeLessThan(100); // Should store large object in under 100ms
      expect(getTime).toBeLessThan(50);  // Should retrieve in under 50ms

      console.log(`Large Object Performance (${(objectSize/1024).toFixed(2)}KB):
        - Set: ${setTime.toFixed(2)}ms
        - Get: ${getTime.toFixed(2)}ms`);
    });

    it('should maintain performance under memory pressure', async () => {
      const cache = new MemoryCache({
        maxSize: 100, // Small cache to trigger evictions
        defaultTTL: 60000
      });

      const testData = generateTestData(1000);
      const iterations = 500; // More items than cache size

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await cache.set(`key${i}`, testData, 60000);
      }
      const totalTime = performance.now() - start;

      // Verify cache size is maintained
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(100);

      // Performance should remain reasonable even with evictions
      expect(totalTime).toBeLessThan(2000);
      expect(totalTime / iterations).toBeLessThan(4); // Average under 4ms per operation

      console.log(`Memory Pressure Performance:
        - Total time: ${totalTime.toFixed(2)}ms for ${iterations} operations
        - Cache size: ${stats.size}
        - Hit ratio: ${stats.hitRatio.toFixed(2)}%`);
    });

    it('should handle concurrent access efficiently', async () => {
      const concurrentOperations = 100;
      const testData = generateTestData(500);

      // Create concurrent read/write operations
      const operations = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        // Mix of reads and writes
        if (i % 2 === 0) {
          operations.push(memoryCache.set(`concurrent-key-${i}`, testData, 60000));
        } else {
          operations.push(memoryCache.get(`concurrent-key-${i - 1}`));
        }
      }

      const start = performance.now();
      const results = await Promise.all(operations);
      const totalTime = performance.now() - start;

      expect(results).toHaveLength(concurrentOperations);
      expect(totalTime).toBeLessThan(1000); // Should complete concurrent ops in under 1 second

      console.log(`Concurrent Access Performance:
        - ${concurrentOperations} concurrent operations: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Redis Cache Performance', () => {
    let redisCache: RedisCache;

    beforeEach(() => {
      redisCache = new RedisCache({
        client: mockRedisClient as any,
        keyPrefix: 'test:',
        defaultTTL: 60000
      });

      // Setup mock responses
      mockRedisClient.get.mockImplementation(async (key) => {
        if (key.includes('existing')) {
          return JSON.stringify({ data: 'test-data' });
        }
        return null;
      });

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.exists.mockResolvedValue(1);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should handle network latency efficiently', async () => {
      // Simulate network latency
      mockRedisClient.get.mockImplementation(async (key) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms latency
        return JSON.stringify({ data: 'test-data' });
      });

      mockRedisClient.set.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 15)); // 15ms latency
        return 'OK';
      });

      const iterations = 100;
      const testData = { test: 'data' };

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await redisCache.set(`latency-key-${i}`, testData, 60000);
        await redisCache.get(`latency-key-${i}`);
      }
      const totalTime = performance.now() - start;

      // With 25ms round-trip latency per operation, 200 operations should take ~5 seconds
      // But we should have some efficiency gains
      expect(totalTime).toBeLessThan(6000);

      console.log(`Redis Network Latency Performance:
        - ${iterations * 2} operations with 25ms latency: ${totalTime.toFixed(2)}ms`);
    });

    it('should batch operations for better performance', async () => {
      const batchSize = 50;
      const testData = generateTestData(100);

      // Mock pipeline operations
      const mockPipeline = {
        set: vi.fn().mockReturnThis(),
        get: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(Array(batchSize).fill(['OK']))
      };

      mockRedisClient.pipeline = vi.fn().mockReturnValue(mockPipeline);

      const start = performance.now();
      
      // Simulate batched operations
      const pipeline = mockRedisClient.pipeline();
      for (let i = 0; i < batchSize; i++) {
        pipeline.set(`batch-key-${i}`, JSON.stringify(testData));
      }
      await pipeline.exec();

      const batchTime = performance.now() - start;

      // Individual operations for comparison
      const individualStart = performance.now();
      for (let i = 0; i < batchSize; i++) {
        await redisCache.set(`individual-key-${i}`, testData, 60000);
      }
      const individualTime = performance.now() - individualStart;

      // Batched operations should be significantly faster
      expect(batchTime).toBeLessThan(individualTime * 0.5);

      console.log(`Redis Batching Performance:
        - Batched: ${batchTime.toFixed(2)}ms
        - Individual: ${individualTime.toFixed(2)}ms
        - Improvement: ${((individualTime - batchTime) / individualTime * 100).toFixed(1)}%`);
    });
  });

  describe('Multi-Level Cache Performance', () => {
    let multiLevelCache: MultiLevelCache;
    let memoryCache: MemoryCache;
    let redisCache: RedisCache;

    beforeEach(() => {
      memoryCache = new MemoryCache({
        maxSize: 100,
        defaultTTL: 60000
      });

      redisCache = new RedisCache({
        client: mockRedisClient as any,
        keyPrefix: 'test:',
        defaultTTL: 60000
      });

      multiLevelCache = new MultiLevelCache({
        levels: [
          { cache: memoryCache, name: 'memory' },
          { cache: redisCache, name: 'redis' }
        ]
      });

      // Setup mock for cache hits/misses
      mockRedisClient.get.mockImplementation(async (key) => {
        if (key.includes('redis-only')) {
          return JSON.stringify({ data: 'redis-data', source: 'redis' });
        }
        return null;
      });
    });

    it('should optimize cache hit performance across levels', async () => {
      const testData = { data: 'test-value' };

      // First access - cache miss (slowest)
      const miss1Start = performance.now();
      await multiLevelCache.set('test-key', testData, 60000);
      const result1 = await multiLevelCache.get('test-key');
      const miss1Time = performance.now() - miss1Start;

      // Second access - memory cache hit (fastest)
      const hit1Start = performance.now();
      const result2 = await multiLevelCache.get('test-key');
      const hit1Time = performance.now() - hit1Start;

      // Clear memory cache, third access - Redis cache hit (medium)
      memoryCache.clear();
      const hit2Start = performance.now();
      const result3 = await multiLevelCache.get('test-key');
      const hit2Time = performance.now() - hit2Start;

      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);
      expect(result3).toEqual(testData);

      // Memory hits should be fastest
      expect(hit1Time).toBeLessThan(hit2Time);
      expect(hit1Time).toBeLessThan(miss1Time);

      console.log(`Multi-Level Cache Performance:
        - Cache miss: ${miss1Time.toFixed(2)}ms
        - Memory hit: ${hit1Time.toFixed(2)}ms
        - Redis hit: ${hit2Time.toFixed(2)}ms`);
    });

    it('should handle cache promotion efficiently', async () => {
      const testData = { data: 'promotion-test' };

      // Set data only in Redis (simulate cache promotion scenario)
      await redisCache.set('promotion-key', testData, 60000);

      // First access should promote to memory cache
      const promotionStart = performance.now();
      const result1 = await multiLevelCache.get('promotion-key');
      const promotionTime = performance.now() - promotionStart;

      // Second access should be from memory cache
      const memoryStart = performance.now();
      const result2 = await multiLevelCache.get('promotion-key');
      const memoryTime = performance.now() - memoryStart;

      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);

      // Memory access should be significantly faster
      expect(memoryTime).toBeLessThan(promotionTime * 0.5);

      console.log(`Cache Promotion Performance:
        - Promotion: ${promotionTime.toFixed(2)}ms
        - Memory access: ${memoryTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Monitoring', () => {
    let performanceMonitor: PerformanceMonitor;

    beforeEach(() => {
      performanceMonitor = new PerformanceMonitor({
        enableMetrics: true,
        sampleRate: 1.0,
        metricsRetention: 60000
      });
    });

    it('should track cache performance metrics accurately', async () => {
      const cache = new MemoryCache({
        maxSize: 100,
        defaultTTL: 60000
      });

      // Perform various cache operations
      const operations = 1000;
      const testData = generateTestData(100);

      for (let i = 0; i < operations; i++) {
        const start = performance.now();
        
        if (i % 3 === 0) {
          await cache.set(`perf-key-${i}`, testData, 60000);
          performanceMonitor.recordCacheOperation('set', performance.now() - start);
        } else {
          await cache.get(`perf-key-${Math.floor(i / 3)}`);
          performanceMonitor.recordCacheOperation('get', performance.now() - start);
        }
      }

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.cacheOperations.set.count).toBeGreaterThan(0);
      expect(metrics.cacheOperations.get.count).toBeGreaterThan(0);
      expect(metrics.cacheOperations.set.averageTime).toBeGreaterThan(0);
      expect(metrics.cacheOperations.get.averageTime).toBeGreaterThan(0);

      // Get operations should generally be faster than set operations
      expect(metrics.cacheOperations.get.averageTime)
        .toBeLessThan(metrics.cacheOperations.set.averageTime * 2);

      console.log(`Performance Metrics:
        - Set operations: ${metrics.cacheOperations.set.count} (avg: ${metrics.cacheOperations.set.averageTime.toFixed(2)}ms)
        - Get operations: ${metrics.cacheOperations.get.count} (avg: ${metrics.cacheOperations.get.averageTime.toFixed(2)}ms)`);
    });

    it('should identify performance bottlenecks', async () => {
      // Simulate slow operations
      const slowOperations = [];
      const fastOperations = [];

      for (let i = 0; i < 100; i++) {
        const duration = i < 10 ? 100 + Math.random() * 50 : Math.random() * 10; // 10 slow, 90 fast
        performanceMonitor.recordCacheOperation('get', duration);
        
        if (duration > 50) {
          slowOperations.push(duration);
        } else {
          fastOperations.push(duration);
        }
      }

      const bottlenecks = performanceMonitor.identifyBottlenecks();

      expect(bottlenecks.slowOperations.length).toBe(slowOperations.length);
      expect(bottlenecks.averageSlowTime).toBeGreaterThan(100);
      expect(bottlenecks.percentileTimes.p95).toBeGreaterThan(bottlenecks.percentileTimes.p50);

      console.log(`Bottleneck Analysis:
        - Slow operations: ${bottlenecks.slowOperations.length}
        - P50: ${bottlenecks.percentileTimes.p50.toFixed(2)}ms
        - P95: ${bottlenecks.percentileTimes.p95.toFixed(2)}ms
        - P99: ${bottlenecks.percentileTimes.p99.toFixed(2)}ms`);
    });
  });

  describe('Cache Warming Performance', () => {
    let cacheWarmer: CacheWarmer;
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache({
        maxSize: 1000,
        defaultTTL: 60000
      });

      cacheWarmer = new CacheWarmer({
        cache,
        batchSize: 50,
        concurrency: 5
      });
    });

    it('should warm cache efficiently with batch processing', async () => {
      const warmingData = [];
      for (let i = 0; i < 500; i++) {
        warmingData.push({
          key: `warm-key-${i}`,
          value: generateTestData(100),
          ttl: 60000
        });
      }

      const start = performance.now();
      await cacheWarmer.warmCache(warmingData);
      const warmingTime = performance.now() - start;

      // Verify all data was cached
      for (let i = 0; i < 10; i++) { // Sample check
        const result = await cache.get(`warm-key-${i}`);
        expect(result).toBeDefined();
      }

      // Warming should be efficient
      expect(warmingTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(warmingTime / warmingData.length).toBeLessThan(10); // Under 10ms per item

      console.log(`Cache Warming Performance:
        - ${warmingData.length} items: ${warmingTime.toFixed(2)}ms
        - Average per item: ${(warmingTime / warmingData.length).toFixed(2)}ms`);
    });

    it('should handle concurrent warming efficiently', async () => {
      const concurrentBatches = 10;
      const batchSize = 100;
      
      const warmingPromises = [];
      
      for (let batch = 0; batch < concurrentBatches; batch++) {
        const batchData = [];
        for (let i = 0; i < batchSize; i++) {
          batchData.push({
            key: `concurrent-${batch}-${i}`,
            value: generateTestData(50),
            ttl: 60000
          });
        }
        warmingPromises.push(cacheWarmer.warmCache(batchData));
      }

      const start = performance.now();
      await Promise.all(warmingPromises);
      const concurrentTime = performance.now() - start;

      const totalItems = concurrentBatches * batchSize;
      expect(concurrentTime).toBeLessThan(10000); // Should complete in under 10 seconds

      console.log(`Concurrent Cache Warming:
        - ${totalItems} items in ${concurrentBatches} batches: ${concurrentTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Invalidation Performance', () => {
    let cacheInvalidator: CacheInvalidator;
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache({
        maxSize: 1000,
        defaultTTL: 60000
      });

      cacheInvalidator = new CacheInvalidator({
        cache,
        batchSize: 100
      });
    });

    it('should handle pattern-based invalidation efficiently', async () => {
      // Populate cache with test data
      const testData = generateTestData(100);
      for (let i = 0; i < 1000; i++) {
        const category = i % 10;
        await cache.set(`item:category:${category}:${i}`, testData, 60000);
      }

      // Invalidate all items in category 5
      const start = performance.now();
      const invalidated = await cacheInvalidator.invalidatePattern('item:category:5:*');
      const invalidationTime = performance.now() - start;

      expect(invalidated).toBe(100); // Should invalidate 100 items (1000 / 10 categories)
      expect(invalidationTime).toBeLessThan(1000); // Should complete in under 1 second

      // Verify invalidation worked
      const remainingItem = await cache.get('item:category:0:0');
      const invalidatedItem = await cache.get('item:category:5:50');
      
      expect(remainingItem).toBeDefined();
      expect(invalidatedItem).toBeNull();

      console.log(`Pattern Invalidation Performance:
        - ${invalidated} items invalidated: ${invalidationTime.toFixed(2)}ms`);
    });

    it('should handle tag-based invalidation efficiently', async () => {
      // Populate cache with tagged data
      const testData = generateTestData(100);
      const taggedKeys = [];
      
      for (let i = 0; i < 500; i++) {
        const key = `tagged-item-${i}`;
        const tags = [`tag-${i % 5}`, `category-${i % 10}`];
        
        await cache.set(key, testData, 60000);
        await cacheInvalidator.tagKey(key, tags);
        
        if (tags.includes('tag-2')) {
          taggedKeys.push(key);
        }
      }

      // Invalidate all items with tag-2
      const start = performance.now();
      const invalidated = await cacheInvalidator.invalidateByTag('tag-2');
      const invalidationTime = performance.now() - start;

      expect(invalidated).toBe(taggedKeys.length);
      expect(invalidationTime).toBeLessThan(2000);

      console.log(`Tag-based Invalidation Performance:
        - ${invalidated} items invalidated: ${invalidationTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should optimize memory usage under pressure', async () => {
      const cache = new MemoryCache({
        maxSize: 100,
        defaultTTL: 60000,
        enableCompression: true
      });

      // Fill cache with compressible data
      const compressibleData = generateTestData(10000); // Large repetitive string
      
      const memoryBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 150; i++) { // More than cache size
        await cache.set(`compress-key-${i}`, compressibleData, 60000);
      }
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;
      
      const stats = cache.getStats();
      
      // Memory increase should be reasonable despite large data
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      expect(stats.size).toBeLessThanOrEqual(100);
      
      console.log(`Memory Optimization:
        - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB
        - Cache size: ${stats.size}
        - Compression ratio: ${stats.compressionRatio?.toFixed(2) || 'N/A'}`);
    });

    it('should handle garbage collection efficiently', async () => {
      const cache = new MemoryCache({
        maxSize: 1000,
        defaultTTL: 100, // Short TTL for testing
        gcInterval: 50
      });

      // Add items that will expire
      for (let i = 0; i < 500; i++) {
        await cache.set(`gc-key-${i}`, generateTestData(100), 100);
      }

      const initialStats = cache.getStats();
      expect(initialStats.size).toBe(500);

      // Wait for expiration and GC
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalStats = cache.getStats();
      
      // Most items should be garbage collected
      expect(finalStats.size).toBeLessThan(initialStats.size * 0.1);
      
      console.log(`Garbage Collection:
        - Initial size: ${initialStats.size}
        - Final size: ${finalStats.size}
        - GC efficiency: ${((initialStats.size - finalStats.size) / initialStats.size * 100).toFixed(1)}%`);
    });
  });
});