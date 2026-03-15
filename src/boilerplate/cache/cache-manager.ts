/**
 * Cache Manager
 * 
 * Central cache management system that coordinates between different cache implementations
 * and provides a unified interface for caching operations.
 */

import {
  CacheManager as ICacheManager,
  CacheOptions,
  CacheStats,
  CacheEntry
} from '../interfaces/cache';
import { CacheUtils } from './cache-utils';

export interface CacheManagerConfig {
  defaultTTL?: number;
  namespace?: string;
  keyPrefix?: string;
  enableCompression?: boolean;
  enableSerialization?: boolean;
  enableMetrics?: boolean;
}

export abstract class BaseCacheManager implements ICacheManager {
  protected config: Required<CacheManagerConfig>;
  protected utils: CacheUtils;
  protected metrics: Map<string, number> = new Map();

  constructor(config: CacheManagerConfig = {}) {
    this.config = {
      defaultTTL: 3600000, // 1 hour
      namespace: 'default',
      keyPrefix: 'cache:',
      enableCompression: false,
      enableSerialization: true,
      enableMetrics: true,
      ...config
    };
    
    this.utils = new CacheUtils();
    this.initializeMetrics();
  }

  /**
   * Abstract methods to be implemented by concrete cache managers
   */
  abstract get<T = unknown>(key: string): Promise<T | null>;
  abstract set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract getSize(): Promise<number>;
  abstract getKeys(pattern?: string): Promise<string[]>;
  abstract flushExpired(): Promise<number>;

  /**
   * Get multiple values from cache
   */
  async getMany<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    for (const key of keys) {
      try {
        const value = await this.get<T>(key);
        results.push(value);
      } catch (error) {
        console.error(`Failed to get cache key ${key}:`, error);
        results.push(null);
      }
    }
    
    return results;
  }

  /**
   * Set multiple values in cache
   */
  async setMany<T = unknown>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    const promises = entries.map(({ key, value, options }) =>
      this.set(key, value, options).catch(error => {
        console.error(`Failed to set cache key ${key}:`, error);
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      try {
        const deleted = await this.delete(key);
        if (deleted) deletedCount++;
      } catch (error) {
        console.error(`Failed to delete cache key ${key}:`, error);
      }
    }
    
    return deletedCount;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    // Default implementation - get all keys and check metadata
    // Concrete implementations should override for better performance
    const allKeys = await this.getKeys();
    let invalidatedCount = 0;
    
    for (const key of allKeys) {
      try {
        const metadata = await this.getMetadata(key);
        if (metadata?.tags && this.utils.hasMatchingTags(metadata.tags, tags)) {
          const deleted = await this.delete(key);
          if (deleted) invalidatedCount++;
        }
      } catch (error) {
        console.error(`Failed to check tags for key ${key}:`, error);
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const matchingKeys = await this.getKeys(pattern);
    return this.deleteMany(matchingKeys);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalKeys = await this.getSize();
    const totalSize = await this.calculateTotalSize();
    
    const gets = this.getMetric('gets') || 0;
    const hits = this.getMetric('hits') || 0;
    const misses = this.getMetric('misses') || 0;
    
    return {
      totalKeys,
      totalSize,
      hitRate: gets > 0 ? hits / gets : 0,
      missRate: gets > 0 ? misses / gets : 0,
      evictions: this.getMetric('evictions') || 0,
      memory: {
        used: totalSize,
        limit: this.getMemoryLimit(),
        percentage: this.getMemoryLimit() > 0 ? (totalSize / this.getMemoryLimit()) * 100 : 0
      },
      operations: {
        gets: gets,
        sets: this.getMetric('sets') || 0,
        deletes: this.getMetric('deletes') || 0,
        clears: this.getMetric('clears') || 0
      }
    };
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<Omit<CacheEntry, 'value'> | null> {
    // Default implementation - concrete classes should override
    const exists = await this.has(key);
    if (!exists) return null;
    
    return {
      key: this.buildKey(key),
      ttl: this.config.defaultTTL,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      hits: 1,
      tags: []
    };
  }

  /**
   * Build cache key with namespace and prefix
   */
  protected buildKey(key: string): string {
    return `${this.config.keyPrefix}${this.config.namespace}:${key}`;
  }

  /**
   * Parse cache key to extract original key
   */
  protected parseKey(fullKey: string): string {
    const prefix = `${this.config.keyPrefix}${this.config.namespace}:`;
    return fullKey.startsWith(prefix) ? fullKey.substring(prefix.length) : fullKey;
  }

  /**
   * Serialize value for storage
   */
  protected serializeValue<T>(value: T, options?: CacheOptions): string | T {
    if (!this.config.enableSerialization && !options?.serialize) {
      return value;
    }
    
    try {
      let serialized = JSON.stringify(value);
      
      if (this.config.enableCompression || options?.compress) {
        serialized = this.utils.compress(serialized);
      }
      
      return serialized;
    } catch (error) {
      console.error('Failed to serialize cache value:', error);
      return value;
    }
  }

  /**
   * Deserialize value from storage
   */
  protected deserializeValue<T>(value: unknown, options?: CacheOptions): T | null {
    if (typeof value !== 'string') {
      return value as T;
    }
    
    try {
      let data = value;
      
      if (this.config.enableCompression || options?.compress) {
        data = this.utils.decompress(data);
      }
      
      if (this.config.enableSerialization || options?.serialize) {
        return JSON.parse(data) as T;
      }
      
      return data as T;
    } catch (error) {
      console.error('Failed to deserialize cache value:', error);
      return null;
    }
  }

  /**
   * Get TTL for cache entry
   */
  protected getTTL(options?: CacheOptions): number {
    return options?.ttl ?? this.config.defaultTTL;
  }

  /**
   * Check if entry is expired
   */
  protected isExpired(createdAt: number, ttl: number): boolean {
    return Date.now() - createdAt > ttl;
  }

  /**
   * Record cache operation metric
   */
  protected recordMetric(operation: string, count: number = 1): void {
    if (!this.config.enableMetrics) return;
    
    const current = this.metrics.get(operation) || 0;
    this.metrics.set(operation, current + count);
  }

  /**
   * Get metric value
   */
  protected getMetric(operation: string): number {
    return this.metrics.get(operation) || 0;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    const operations = ['gets', 'sets', 'deletes', 'clears', 'hits', 'misses', 'evictions'];
    operations.forEach(op => this.metrics.set(op, 0));
  }

  /**
   * Calculate total cache size (to be overridden by implementations)
   */
  protected async calculateTotalSize(): Promise<number> {
    return 0;
  }

  /**
   * Get memory limit (to be overridden by implementations)
   */
  protected getMemoryLimit(): number {
    return 0;
  }

  /**
   * Create cache entry
   */
  protected createCacheEntry<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): CacheEntry<T> {
    const now = Date.now();
    
    return {
      key: this.buildKey(key),
      value,
      ttl: this.getTTL(options),
      createdAt: now,
      accessedAt: now,
      hits: 0,
      tags: options?.tags || []
    };
  }

  /**
   * Update cache entry access information
   */
  protected updateAccess<T>(entry: CacheEntry<T>): CacheEntry<T> {
    return {
      ...entry,
      accessedAt: Date.now(),
      hits: entry.hits + 1
    };
  }

  /**
   * Cleanup expired entries (to be called periodically)
   */
  async cleanup(): Promise<number> {
    return this.flushExpired();
  }

  /**
   * Get cache configuration
   */
  getConfig(): Required<CacheManagerConfig> {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}