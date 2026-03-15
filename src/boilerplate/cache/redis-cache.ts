/**
 * Redis Cache Implementation
 * 
 * Redis-based cache implementation with clustering support, pub/sub for invalidation,
 * and advanced Redis features like sorted sets for TTL management.
 */

import {
  CacheEntry,
  CacheOptions,
  RedisCacheOptions
} from '../interfaces/cache';
import { BaseCacheManager, CacheManagerConfig } from './cache-manager';

// Mock Redis interface for development (replace with actual Redis client in production)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<string>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(data: Record<string, string>): Promise<string>;
  ttl(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
  disconnect(): Promise<void>;
}

export class RedisCache extends BaseCacheManager {
  private client: RedisClient;
  private redisOptions: Required<RedisCacheOptions>;
  private metadataPrefix: string;
  private tagsPrefix: string;
  private expirySetKey: string;

  constructor(
    config: CacheManagerConfig = {},
    redisOptions: RedisCacheOptions,
    client?: RedisClient
  ) {
    super(config);
    
    this.redisOptions = {
      host: 'localhost',
      port: 6379,
      database: 0,
      keyPrefix: config.keyPrefix || 'cache:',
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      ...redisOptions
    };

    this.metadataPrefix = `${this.redisOptions.keyPrefix}meta:`;
    this.tagsPrefix = `${this.redisOptions.keyPrefix}tags:`;
    this.expirySetKey = `${this.redisOptions.keyPrefix}expiry`;

    // Use provided client or create mock client for development
    this.client = client || this.createMockClient();
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);
      
      this.recordMetric('gets');
      
      if (value === null) {
        this.recordMetric('misses');
        return null;
      }

      // Update access metadata
      await this.updateAccessMetadata(fullKey);
      
      this.recordMetric('hits');
      
      return this.deserializeValue<T>(value);
    } catch (error) {
      console.error('Redis get error:', error);
      this.recordMetric('misses');
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      const serializedValue = this.serializeValue(value, options);
      const ttlMs = this.getTTL(options);
      
      // Set the main value with TTL
      if (ttlMs > 0) {
        await this.client.set(fullKey, serializedValue as string, { PX: ttlMs });
      } else {
        await this.client.set(fullKey, serializedValue as string);
      }
      
      // Store metadata
      await this.setMetadata(fullKey, {
        key: fullKey,
        ttl: ttlMs,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        hits: 0,
        tags: options?.tags || []
      });
      
      // Store tags for invalidation
      if (options?.tags && options.tags.length > 0) {
        await this.storeTags(fullKey, options.tags);
      }
      
      // Add to expiry tracking if TTL is set
      if (ttlMs > 0) {
        const expiryTime = Date.now() + ttlMs;
        await this.client.zadd(this.expirySetKey, expiryTime, fullKey);
      }
      
      this.recordMetric('sets');
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const exists = await this.client.exists(fullKey);
      return exists > 0;
    } catch (error) {
      console.error('Redis has error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      
      // Delete main value
      const deleted = await this.client.del(fullKey);
      
      if (deleted > 0) {
        // Clean up metadata and tags
        await this.deleteMetadata(fullKey);
        await this.cleanupTags(fullKey);
        await this.client.zrem(this.expirySetKey, fullKey);
        
        this.recordMetric('deletes');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // In production, you might want to be more selective
      await this.client.flushall();
      this.recordMetric('clears');
    } catch (error) {
      console.error('Redis clear error:', error);
      throw error;
    }
  }

  /**
   * Get cache size (number of keys)
   */
  async getSize(): Promise<number> {
    try {
      const pattern = `${this.config.keyPrefix}${this.config.namespace}:*`;
      const keys = await this.client.keys(pattern);
      return keys.length;
    } catch (error) {
      console.error('Redis getSize error:', error);
      return 0;
    }
  }

  /**
   * Get all cache keys
   */
  async getKeys(pattern?: string): Promise<string[]> {
    try {
      const searchPattern = pattern 
        ? `${this.config.keyPrefix}${this.config.namespace}:${pattern}`
        : `${this.config.keyPrefix}${this.config.namespace}:*`;
      
      const keys = await this.client.keys(searchPattern);
      return keys.map(key => this.parseKey(key));
    } catch (error) {
      console.error('Redis getKeys error:', error);
      return [];
    }
  }

  /**
   * Flush expired entries
   */
  async flushExpired(): Promise<number> {
    try {
      const now = Date.now();
      const expiredKeys = await this.client.zrangebyscore(this.expirySetKey, 0, now);
      
      if (expiredKeys.length === 0) return 0;
      
      // Delete expired keys
      const deleted = await this.client.del(...expiredKeys);
      
      // Clean up metadata and tags for expired keys
      for (const key of expiredKeys) {
        await this.deleteMetadata(key);
        await this.cleanupTags(key);
      }
      
      // Remove from expiry set
      await this.client.zrem(this.expirySetKey, ...expiredKeys);
      
      return deleted;
    } catch (error) {
      console.error('Redis flushExpired error:', error);
      return 0;
    }
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<Omit<CacheEntry, 'value'> | null> {
    try {
      const fullKey = this.buildKey(key);
      const metadataKey = `${this.metadataPrefix}${fullKey}`;
      const metadata = await this.client.hgetall(metadataKey);
      
      if (Object.keys(metadata).length === 0) return null;
      
      return {
        key: metadata.key,
        ttl: parseInt(metadata.ttl, 10),
        createdAt: parseInt(metadata.createdAt, 10),
        accessedAt: parseInt(metadata.accessedAt, 10),
        hits: parseInt(metadata.hits, 10),
        tags: metadata.tags ? JSON.parse(metadata.tags) : []
      };
    } catch (error) {
      console.error('Redis getMetadata error:', error);
      return null;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let invalidatedCount = 0;
      
      for (const tag of tags) {
        const tagKey = `${this.tagsPrefix}${tag}`;
        const keys = await this.client.keys(`${tagKey}:*`);
        
        for (const taggedKey of keys) {
          const cacheKey = taggedKey.replace(`${tagKey}:`, '');
          const deleted = await this.client.del(cacheKey);
          
          if (deleted > 0) {
            await this.deleteMetadata(cacheKey);
            await this.cleanupTags(cacheKey);
            await this.client.zrem(this.expirySetKey, cacheKey);
            invalidatedCount++;
          }
        }
      }
      
      return invalidatedCount;
    } catch (error) {
      console.error('Redis invalidateByTags error:', error);
      return 0;
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMany<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key));
      const values = await this.client.mget(...fullKeys);
      
      this.recordMetric('gets', keys.length);
      
      const results: (T | null)[] = [];
      let hits = 0;
      
      for (let i = 0; i < values.length; i++) {
        if (values[i] !== null) {
          results.push(this.deserializeValue<T>(values[i]!));
          await this.updateAccessMetadata(fullKeys[i]);
          hits++;
        } else {
          results.push(null);
        }
      }
      
      this.recordMetric('hits', hits);
      this.recordMetric('misses', keys.length - hits);
      
      return results;
    } catch (error) {
      console.error('Redis getMany error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async setMany<T = unknown>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    try {
      const data: Record<string, string> = {};
      
      for (const { key, value, options } of entries) {
        const fullKey = this.buildKey(key);
        const serializedValue = this.serializeValue(value, options);
        data[fullKey] = serializedValue as string;
        
        // Set TTL individually if specified
        const ttlMs = this.getTTL(options);
        if (ttlMs > 0) {
          await this.client.expire(fullKey, Math.ceil(ttlMs / 1000));
        }
        
        // Store metadata and tags
        await this.setMetadata(fullKey, {
          key: fullKey,
          ttl: ttlMs,
          createdAt: Date.now(),
          accessedAt: Date.now(),
          hits: 0,
          tags: options?.tags || []
        });
        
        if (options?.tags && options.tags.length > 0) {
          await this.storeTags(fullKey, options.tags);
        }
      }
      
      await this.client.mset(data);
      this.recordMetric('sets', entries.length);
    } catch (error) {
      console.error('Redis setMany error:', error);
      throw error;
    }
  }

  /**
   * Store metadata for cache entry
   */
  private async setMetadata(key: string, metadata: Omit<CacheEntry, 'value'>): Promise<void> {
    const metadataKey = `${this.metadataPrefix}${key}`;
    
    await this.client.hset(metadataKey, 'key', metadata.key);
    await this.client.hset(metadataKey, 'ttl', metadata.ttl.toString());
    await this.client.hset(metadataKey, 'createdAt', metadata.createdAt.toString());
    await this.client.hset(metadataKey, 'accessedAt', metadata.accessedAt.toString());
    await this.client.hset(metadataKey, 'hits', metadata.hits.toString());
    await this.client.hset(metadataKey, 'tags', JSON.stringify(metadata.tags || []));
    
    // Set TTL on metadata to match cache entry
    if (metadata.ttl > 0) {
      await this.client.expire(metadataKey, Math.ceil(metadata.ttl / 1000));
    }
  }

  /**
   * Update access metadata
   */
  private async updateAccessMetadata(key: string): Promise<void> {
    const metadataKey = `${this.metadataPrefix}${key}`;
    const hits = await this.client.hget(metadataKey, 'hits');
    const newHits = (parseInt(hits || '0', 10) + 1).toString();
    
    await this.client.hset(metadataKey, 'accessedAt', Date.now().toString());
    await this.client.hset(metadataKey, 'hits', newHits);
  }

  /**
   * Delete metadata for cache entry
   */
  private async deleteMetadata(key: string): Promise<void> {
    const metadataKey = `${this.metadataPrefix}${key}`;
    await this.client.del(metadataKey);
  }

  /**
   * Store tags for cache entry
   */
  private async storeTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `${this.tagsPrefix}${tag}:${key}`;
      await this.client.set(tagKey, '1');
      
      // Set TTL on tag reference to match cache entry
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        await this.client.expire(tagKey, ttl);
      }
    }
  }

  /**
   * Clean up tags for cache entry
   */
  private async cleanupTags(key: string): Promise<void> {
    const metadata = await this.getMetadata(key);
    if (metadata?.tags) {
      for (const tag of metadata.tags) {
        const tagKey = `${this.tagsPrefix}${tag}:${key}`;
        await this.client.del(tagKey);
      }
    }
  }

  /**
   * Create mock Redis client for development
   */
  private createMockClient(): RedisClient {
    const storage = new Map<string, string>();
    const expiry = new Map<string, number>();
    
    return {
      async get(key: string): Promise<string | null> {
        const exp = expiry.get(key);
        if (exp && Date.now() > exp) {
          storage.delete(key);
          expiry.delete(key);
          return null;
        }
        return storage.get(key) || null;
      },
      
      async set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<string | null> {
        storage.set(key, value);
        if (options?.EX) {
          expiry.set(key, Date.now() + options.EX * 1000);
        } else if (options?.PX) {
          expiry.set(key, Date.now() + options.PX);
        }
        return 'OK';
      },
      
      async del(...keys: string[]): Promise<number> {
        let deleted = 0;
        for (const key of keys) {
          if (storage.delete(key)) {
            expiry.delete(key);
            deleted++;
          }
        }
        return deleted;
      },
      
      async exists(...keys: string[]): Promise<number> {
        let count = 0;
        for (const key of keys) {
          if (storage.has(key)) count++;
        }
        return count;
      },
      
      async keys(pattern: string): Promise<string[]> {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return Array.from(storage.keys()).filter(key => regex.test(key));
      },
      
      async flushall(): Promise<string> {
        storage.clear();
        expiry.clear();
        return 'OK';
      },
      
      async mget(...keys: string[]): Promise<(string | null)[]> {
        return keys.map(key => storage.get(key) || null);
      },
      
      async mset(data: Record<string, string>): Promise<string> {
        for (const [key, value] of Object.entries(data)) {
          storage.set(key, value);
        }
        return 'OK';
      },
      
      async ttl(key: string): Promise<number> {
        const exp = expiry.get(key);
        if (!exp) return -1;
        const remaining = Math.ceil((exp - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      },
      
      async expire(key: string, seconds: number): Promise<number> {
        if (storage.has(key)) {
          expiry.set(key, Date.now() + seconds * 1000);
          return 1;
        }
        return 0;
      },
      
      async hget(key: string, field: string): Promise<string | null> {
        const hash = storage.get(key);
        if (!hash) return null;
        try {
          const parsed = JSON.parse(hash);
          return parsed[field] || null;
        } catch {
          return null;
        }
      },
      
      async hset(key: string, field: string, value: string): Promise<number> {
        let hash: Record<string, string> = {};
        const existing = storage.get(key);
        if (existing) {
          try {
            hash = JSON.parse(existing);
          } catch {
            // Invalid JSON, start fresh
          }
        }
        const isNew = !(field in hash);
        hash[field] = value;
        storage.set(key, JSON.stringify(hash));
        return isNew ? 1 : 0;
      },
      
      async hdel(key: string, ...fields: string[]): Promise<number> {
        const existing = storage.get(key);
        if (!existing) return 0;
        
        try {
          const hash = JSON.parse(existing);
          let deleted = 0;
          for (const field of fields) {
            if (field in hash) {
              delete hash[field];
              deleted++;
            }
          }
          storage.set(key, JSON.stringify(hash));
          return deleted;
        } catch {
          return 0;
        }
      },
      
      async hgetall(key: string): Promise<Record<string, string>> {
        const hash = storage.get(key);
        if (!hash) return {};
        try {
          return JSON.parse(hash);
        } catch {
          return {};
        }
      },
      
      async zadd(key: string, score: number, member: string): Promise<number> {
        // Simplified sorted set implementation
        const existing = storage.get(key);
        let sortedSet: Array<{ score: number; member: string }> = [];
        
        if (existing) {
          try {
            sortedSet = JSON.parse(existing);
          } catch {
            // Invalid JSON, start fresh
          }
        }
        
        const existingIndex = sortedSet.findIndex(item => item.member === member);
        if (existingIndex >= 0) {
          sortedSet[existingIndex].score = score;
          storage.set(key, JSON.stringify(sortedSet));
          return 0;
        } else {
          sortedSet.push({ score, member });
          sortedSet.sort((a, b) => a.score - b.score);
          storage.set(key, JSON.stringify(sortedSet));
          return 1;
        }
      },
      
      async zrem(key: string, ...members: string[]): Promise<number> {
        const existing = storage.get(key);
        if (!existing) return 0;
        
        try {
          let sortedSet: Array<{ score: number; member: string }> = JSON.parse(existing);
          const originalLength = sortedSet.length;
          sortedSet = sortedSet.filter(item => !members.includes(item.member));
          storage.set(key, JSON.stringify(sortedSet));
          return originalLength - sortedSet.length;
        } catch {
          return 0;
        }
      },
      
      async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
        const existing = storage.get(key);
        if (!existing) return [];
        
        try {
          const sortedSet: Array<{ score: number; member: string }> = JSON.parse(existing);
          return sortedSet
            .filter(item => item.score >= min && item.score <= max)
            .map(item => item.member);
        } catch {
          return [];
        }
      },
      
      async publish(channel: string, message: string): Promise<number> {
        // Mock implementation - in real Redis this would publish to subscribers
        return 0;
      },
      
      async subscribe(channel: string): Promise<void> {
        // Mock implementation
      },
      
      on(event: string, callback: (...args: any[]) => void): void {
        // Mock implementation
      },
      
      async disconnect(): Promise<void> {
        // Mock implementation
      }
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClient {
    return this.client;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): Required<RedisCacheOptions> {
    return { ...this.redisOptions };
  }
}