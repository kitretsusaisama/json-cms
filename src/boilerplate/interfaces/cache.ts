/**
 * Caching System Interface
 */

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  accessedAt: number;
  hits: number;
  tags?: string[];
}

export interface CacheStats {
  totalKeys: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  memory: {
    used: number;
    limit: number;
    percentage: number;
  };
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    clears: number;
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Compress large values
  serialize?: boolean; // Serialize objects
  namespace?: string; // Cache namespace
}

/**
 * Cache Manager Interface
 */
export interface CacheManager {
  /**
   * Get value from cache
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * Set value in cache
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Check if key exists in cache
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete key from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Invalidate cache by tags
   */
  invalidateByTags(tags: string[]): Promise<number>;

  /**
   * Invalidate cache by pattern
   */
  invalidateByPattern(pattern: string): Promise<number>;

  /**
   * Get multiple values
   */
  getMany<T = unknown>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple values
   */
  setMany<T = unknown>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void>;

  /**
   * Delete multiple keys
   */
  deleteMany(keys: string[]): Promise<number>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Get cache size
   */
  getSize(): Promise<number>;

  /**
   * Get all keys
   */
  getKeys(pattern?: string): Promise<string[]>;

  /**
   * Flush expired entries
   */
  flushExpired(): Promise<number>;

  /**
   * Get cache entry metadata
   */
  getMetadata(key: string): Promise<Omit<CacheEntry, 'value'> | null>;
}

/**
 * Memory Cache Implementation
 */
export interface MemoryCacheOptions {
  maxSize?: number; // Maximum cache size in bytes
  maxKeys?: number; // Maximum number of keys
  defaultTTL?: number; // Default TTL in milliseconds
  checkPeriod?: number; // Cleanup interval in milliseconds
  useClones?: boolean; // Clone objects to prevent mutations
}

/**
 * Redis Cache Implementation
 */
export interface RedisCacheOptions {
  host: string;
  port: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
}

/**
 * Multi-Level Cache Implementation
 */
export interface MultiLevelCacheOptions {
  levels: CacheLevel[];
  strategy: 'write-through' | 'write-behind' | 'write-around';
  readStrategy: 'first-hit' | 'all-levels';
}

export interface CacheLevel {
  name: string;
  cache: CacheManager;
  priority: number;
  readOnly?: boolean;
}

/**
 * Cache Invalidation Interface
 */
export interface CacheInvalidator {
  /**
   * Invalidate cache on content change
   */
  onContentChange(contentType: string, contentId: string): Promise<void>;

  /**
   * Invalidate cache on user action
   */
  onUserAction(userId: string, action: string, resource: string): Promise<void>;

  /**
   * Invalidate cache on time-based rules
   */
  onSchedule(schedule: string): Promise<void>;

  /**
   * Register invalidation rule
   */
  registerRule(rule: InvalidationRule): void;

  /**
   * Remove invalidation rule
   */
  removeRule(ruleId: string): void;
}

export interface InvalidationRule {
  id: string;
  name: string;
  trigger: InvalidationTrigger;
  targets: InvalidationTarget[];
  conditions?: InvalidationCondition[];
}

export interface InvalidationTrigger {
  type: 'content_change' | 'user_action' | 'time_based' | 'manual';
  contentType?: string;
  action?: string;
  schedule?: string;
}

export interface InvalidationTarget {
  type: 'key' | 'pattern' | 'tags';
  value: string;
}

export interface InvalidationCondition {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * Cache Warming Interface
 */
export interface CacheWarmer {
  /**
   * Warm cache with popular content
   */
  warmPopularContent(): Promise<void>;

  /**
   * Warm cache for specific user
   */
  warmUserContent(userId: string): Promise<void>;

  /**
   * Warm cache for specific tenant
   */
  warmTenantContent(tenantId: string): Promise<void>;

  /**
   * Schedule cache warming
   */
  scheduleWarming(schedule: string, target: WarmingTarget): void;

  /**
   * Get warming statistics
   */
  getWarmingStats(): Promise<WarmingStats>;
}

export interface WarmingTarget {
  type: 'popular' | 'user' | 'tenant' | 'content';
  identifier?: string;
  priority: number;
}

export interface WarmingStats {
  totalWarmed: number;
  successRate: number;
  averageTime: number;
  lastRun: string;
  nextRun?: string;
}