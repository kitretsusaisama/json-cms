/**
 * Memory Cache Implementation
 * 
 * In-memory cache implementation with LRU eviction, TTL support,
 * and automatic cleanup of expired entries.
 */

import {
  CacheEntry,
  CacheOptions,
  MemoryCacheOptions
} from '../interfaces/cache';
import { BaseCacheManager, CacheManagerConfig } from './cache-manager';

interface MemoryCacheEntry<T = unknown> extends CacheEntry<T> {
  size: number;
}

export class MemoryCache extends BaseCacheManager {
  private cache = new Map<string, MemoryCacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private memoryOptions: Required<MemoryCacheOptions>;
  private cleanupInterval?: NodeJS.Timeout;
  private accessCounter = 0;

  constructor(
    config: CacheManagerConfig = {},
    memoryOptions: MemoryCacheOptions = {}
  ) {
    super(config);
    
    this.memoryOptions = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxKeys: 10000,
      defaultTTL: config.defaultTTL || 3600000,
      checkPeriod: 60000, // 1 minute
      useClones: true,
      ...memoryOptions
    };

    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    this.recordMetric('gets');
    
    if (!entry) {
      this.recordMetric('misses');
      return null;
    }

    // Check if expired
    if (this.isExpired(entry.createdAt, entry.ttl)) {
      this.cache.delete(fullKey);
      this.accessOrder.delete(fullKey);
      this.recordMetric('misses');
      return null;
    }

    // Update access information
    const updatedEntry = this.updateAccess(entry);
    this.cache.set(fullKey, updatedEntry);
    this.accessOrder.set(fullKey, ++this.accessCounter);
    
    this.recordMetric('hits');
    
    // Return cloned value if enabled
    if (this.memoryOptions.useClones && typeof entry.value === 'object') {
      return this.cloneValue(entry.value);
    }
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const serializedValue = this.serializeValue(value, options);
    const size = this.utils.calculateSize(serializedValue);
    
    // Check if we need to make space
    await this.ensureSpace(size);
    
    const entry: MemoryCacheEntry<T> = {
      ...this.createCacheEntry(key, this.memoryOptions.useClones ? this.cloneValue(value) : value, options),
      size
    };
    
    this.cache.set(fullKey, entry);
    this.accessOrder.set(fullKey, ++this.accessCounter);
    
    this.recordMetric('sets');
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) return false;
    
    // Check if expired
    if (this.isExpired(entry.createdAt, entry.ttl)) {
      this.cache.delete(fullKey);
      this.accessOrder.delete(fullKey);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const deleted = this.cache.delete(fullKey);
    
    if (deleted) {
      this.accessOrder.delete(fullKey);
      this.recordMetric('deletes');
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.recordMetric('clears');
  }

  /**
   * Get cache size (number of keys)
   */
  async getSize(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   */
  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys()).map(key => this.parseKey(key));
    
    if (!pattern) return keys;
    
    return keys.filter(key => this.utils.matchesPattern(pattern, key));
  }

  /**
   * Flush expired entries
   */
  async flushExpired(): Promise<number> {
    let expiredCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry.createdAt, entry.ttl)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<Omit<CacheEntry, 'value'> | null> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) return null;
    
    const { value, size, ...metadata } = entry;
    return metadata;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && this.utils.hasMatchingTags(entry.tags, tags)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        invalidatedCount++;
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStats(): Promise<{
    totalSize: number;
    totalKeys: number;
    averageSize: number;
    maxSize: number;
    usage: number;
  }> {
    const totalSize = await this.calculateTotalSize();
    const totalKeys = this.cache.size;
    
    return {
      totalSize,
      totalKeys,
      averageSize: totalKeys > 0 ? totalSize / totalKeys : 0,
      maxSize: this.memoryOptions.maxSize,
      usage: (totalSize / this.memoryOptions.maxSize) * 100
    };
  }

  /**
   * Get least recently used keys
   */
  getLRUKeys(count: number): string[] {
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);
    
    return sortedEntries.map(([key]) => this.parseKey(key));
  }

  /**
   * Get most recently used keys
   */
  getMRUKeys(count: number): string[] {
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
    
    return sortedEntries.map(([key]) => this.parseKey(key));
  }

  /**
   * Calculate total cache size in bytes
   */
  protected async calculateTotalSize(): Promise<number> {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    
    return totalSize;
  }

  /**
   * Get memory limit
   */
  protected getMemoryLimit(): number {
    return this.memoryOptions.maxSize;
  }

  /**
   * Ensure there's enough space for new entry
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check key limit
    if (this.cache.size >= this.memoryOptions.maxKeys) {
      await this.evictLRU(1);
    }
    
    // Check memory limit
    const currentSize = await this.calculateTotalSize();
    if (currentSize + requiredSize > this.memoryOptions.maxSize) {
      const targetSize = this.memoryOptions.maxSize * 0.8; // Evict to 80% capacity
      const sizeToEvict = currentSize + requiredSize - targetSize;
      await this.evictBySize(sizeToEvict);
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(count: number): Promise<void> {
    const lruKeys = this.getLRUKeys(count);
    
    for (const key of lruKeys) {
      await this.delete(key);
      this.recordMetric('evictions');
    }
  }

  /**
   * Evict entries by size
   */
  private async evictBySize(targetSize: number): Promise<void> {
    let evictedSize = 0;
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by access order (LRU first)
    
    for (const [fullKey] of sortedEntries) {
      const entry = this.cache.get(fullKey);
      if (entry) {
        evictedSize += entry.size;
        const key = this.parseKey(fullKey);
        await this.delete(key);
        this.recordMetric('evictions');
        
        if (evictedSize >= targetSize) {
          break;
        }
      }
    }
  }

  /**
   * Clone value to prevent mutations
   */
  private cloneValue<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error('Failed to clone cache value:', error);
      return value;
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.flushExpired().catch(error => {
        console.error('Cache cleanup failed:', error);
      });
    }, this.memoryOptions.checkPeriod);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopCleanup();
    await this.clear();
  }

  /**
   * Get cache configuration
   */
  getMemoryConfig(): Required<MemoryCacheOptions> {
    return { ...this.memoryOptions };
  }

  /**
   * Update memory cache configuration
   */
  updateMemoryConfig(options: Partial<MemoryCacheOptions>): void {
    this.memoryOptions = { ...this.memoryOptions, ...options };
    
    // Restart cleanup interval if period changed
    if (options.checkPeriod) {
      this.stopCleanup();
      this.startCleanupInterval();
    }
  }
}