/**
 * Multi-Level Cache Implementation
 * 
 * Combines multiple cache levels (e.g., memory + Redis) with configurable
 * read/write strategies for optimal performance and reliability.
 */

import {
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheLevel,
  MultiLevelCacheOptions
} from '../interfaces/cache';
import { BaseCacheManager, CacheManagerConfig } from './cache-manager';

export class MultiLevelCache extends BaseCacheManager {
  private levels: CacheLevel[];
  private options: Required<MultiLevelCacheOptions>;

  constructor(
    config: CacheManagerConfig = {},
    multiLevelOptions: MultiLevelCacheOptions
  ) {
    super(config);
    
    this.options = {
      strategy: 'write-through',
      readStrategy: 'first-hit',
      ...multiLevelOptions
    };
    
    // Sort levels by priority (higher priority first)
    this.levels = [...multiLevelOptions.levels].sort((a, b) => b.priority - a.priority);
    
    if (this.levels.length === 0) {
      throw new Error('At least one cache level is required');
    }
  }

  /**
   * Get value from cache using configured read strategy
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    this.recordMetric('gets');
    
    if (this.options.readStrategy === 'first-hit') {
      return this.getFirstHit<T>(key);
    } else {
      return this.getAllLevels<T>(key);
    }
  }

  /**
   * Set value in cache using configured write strategy
   */
  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    this.recordMetric('sets');
    
    switch (this.options.strategy) {
      case 'write-through':
        await this.writeThrough(key, value, options);
        break;
      case 'write-behind':
        await this.writeBehind(key, value, options);
        break;
      case 'write-around':
        await this.writeAround(key, value, options);
        break;
    }
  }

  /**
   * Check if key exists in any cache level
   */
  async has(key: string): Promise<boolean> {
    for (const level of this.levels) {
      try {
        const exists = await level.cache.has(key);
        if (exists) return true;
      } catch (error) {
        console.error(`Cache level ${level.name} has() error:`, error);
      }
    }
    return false;
  }

  /**
   * Delete key from all cache levels
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    for (const level of this.levels) {
      if (!level.readOnly) {
        try {
          const levelDeleted = await level.cache.delete(key);
          if (levelDeleted) deleted = true;
        } catch (error) {
          console.error(`Cache level ${level.name} delete() error:`, error);
        }
      }
    }
    
    if (deleted) {
      this.recordMetric('deletes');
    }
    
    return deleted;
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    const promises = this.levels
      .filter(level => !level.readOnly)
      .map(level => 
        level.cache.clear().catch(error => {
          console.error(`Cache level ${level.name} clear() error:`, error);
        })
      );
    
    await Promise.all(promises);
    this.recordMetric('clears');
  }

  /**
   * Get total cache size across all levels
   */
  async getSize(): Promise<number> {
    let totalSize = 0;
    
    for (const level of this.levels) {
      try {
        const size = await level.cache.getSize();
        totalSize += size;
      } catch (error) {
        console.error(`Cache level ${level.name} getSize() error:`, error);
      }
    }
    
    return totalSize;
  }

  /**
   * Get all cache keys from all levels
   */
  async getKeys(pattern?: string): Promise<string[]> {
    const allKeys = new Set<string>();
    
    for (const level of this.levels) {
      try {
        const keys = await level.cache.getKeys(pattern);
        keys.forEach(key => allKeys.add(key));
      } catch (error) {
        console.error(`Cache level ${level.name} getKeys() error:`, error);
      }
    }
    
    return Array.from(allKeys);
  }

  /**
   * Flush expired entries from all levels
   */
  async flushExpired(): Promise<number> {
    let totalFlushed = 0;
    
    for (const level of this.levels) {
      try {
        const flushed = await level.cache.flushExpired();
        totalFlushed += flushed;
      } catch (error) {
        console.error(`Cache level ${level.name} flushExpired() error:`, error);
      }
    }
    
    return totalFlushed;
  }

  /**
   * Get cache entry metadata from the first level that has it
   */
  async getMetadata(key: string): Promise<Omit<CacheEntry, 'value'> | null> {
    for (const level of this.levels) {
      try {
        const metadata = await level.cache.getMetadata(key);
        if (metadata) return metadata;
      } catch (error) {
        console.error(`Cache level ${level.name} getMetadata() error:`, error);
      }
    }
    return null;
  }

  /**
   * Invalidate cache by tags across all levels
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const level of this.levels) {
      if (!level.readOnly) {
        try {
          const invalidated = await level.cache.invalidateByTags(tags);
          totalInvalidated += invalidated;
        } catch (error) {
          console.error(`Cache level ${level.name} invalidateByTags() error:`, error);
        }
      }
    }
    
    return totalInvalidated;
  }

  /**
   * Invalidate cache by pattern across all levels
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let totalInvalidated = 0;
    
    for (const level of this.levels) {
      if (!level.readOnly) {
        try {
          const invalidated = await level.cache.invalidateByPattern(pattern);
          totalInvalidated += invalidated;
        } catch (error) {
          console.error(`Cache level ${level.name} invalidateByPattern() error:`, error);
        }
      }
    }
    
    return totalInvalidated;
  }

  /**
   * Get combined cache statistics from all levels
   */
  async getStats(): Promise<CacheStats> {
    const levelStats = await Promise.all(
      this.levels.map(async level => {
        try {
          return await level.cache.getStats();
        } catch (error) {
          console.error(`Cache level ${level.name} getStats() error:`, error);
          return null;
        }
      })
    );

    const validStats = levelStats.filter(stats => stats !== null) as CacheStats[];
    
    if (validStats.length === 0) {
      return {
        totalKeys: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        evictions: 0,
        memory: { used: 0, limit: 0, percentage: 0 },
        operations: { gets: 0, sets: 0, deletes: 0, clears: 0 }
      };
    }

    // Combine statistics
    const combined: CacheStats = {
      totalKeys: validStats.reduce((sum, stats) => sum + stats.totalKeys, 0),
      totalSize: validStats.reduce((sum, stats) => sum + stats.totalSize, 0),
      hitRate: validStats.reduce((sum, stats) => sum + stats.hitRate, 0) / validStats.length,
      missRate: validStats.reduce((sum, stats) => sum + stats.missRate, 0) / validStats.length,
      evictions: validStats.reduce((sum, stats) => sum + stats.evictions, 0),
      memory: {
        used: validStats.reduce((sum, stats) => sum + stats.memory.used, 0),
        limit: validStats.reduce((sum, stats) => sum + stats.memory.limit, 0),
        percentage: 0 // Will be calculated below
      },
      operations: {
        gets: validStats.reduce((sum, stats) => sum + stats.operations.gets, 0),
        sets: validStats.reduce((sum, stats) => sum + stats.operations.sets, 0),
        deletes: validStats.reduce((sum, stats) => sum + stats.operations.deletes, 0),
        clears: validStats.reduce((sum, stats) => sum + stats.operations.clears, 0)
      }
    };

    // Calculate combined memory percentage
    if (combined.memory.limit > 0) {
      combined.memory.percentage = (combined.memory.used / combined.memory.limit) * 100;
    }

    return combined;
  }

  /**
   * Get statistics for individual cache levels
   */
  async getLevelStats(): Promise<Array<{ level: string; stats: CacheStats | null }>> {
    const results = [];
    
    for (const level of this.levels) {
      try {
        const stats = await level.cache.getStats();
        results.push({ level: level.name, stats });
      } catch (error) {
        console.error(`Cache level ${level.name} getStats() error:`, error);
        results.push({ level: level.name, stats: null });
      }
    }
    
    return results;
  }

  /**
   * First-hit read strategy: return from first level that has the key
   */
  private async getFirstHit<T>(key: string): Promise<T | null> {
    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      
      try {
        const value = await level.cache.get<T>(key);
        
        if (value !== null) {
          this.recordMetric('hits');
          
          // Populate higher priority levels (cache promotion)
          await this.promoteToHigherLevels(key, value, i);
          
          return value;
        }
      } catch (error) {
        console.error(`Cache level ${level.name} get() error:`, error);
      }
    }
    
    this.recordMetric('misses');
    return null;
  }

  /**
   * All-levels read strategy: check all levels and return best result
   */
  private async getAllLevels<T>(key: string): Promise<T | null> {
    const results = await Promise.allSettled(
      this.levels.map(level => level.cache.get<T>(key))
    );
    
    // Find first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        this.recordMetric('hits');
        return result.value;
      }
    }
    
    this.recordMetric('misses');
    return null;
  }

  /**
   * Write-through strategy: write to all levels synchronously
   */
  private async writeThrough<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const promises = this.levels
      .filter(level => !level.readOnly)
      .map(level => 
        level.cache.set(key, value, options).catch(error => {
          console.error(`Cache level ${level.name} set() error:`, error);
        })
      );
    
    await Promise.all(promises);
  }

  /**
   * Write-behind strategy: write to highest priority level immediately, others asynchronously
   */
  private async writeBehind<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const writableLevels = this.levels.filter(level => !level.readOnly);
    
    if (writableLevels.length === 0) return;
    
    // Write to highest priority level immediately
    await writableLevels[0].cache.set(key, value, options);
    
    // Write to other levels asynchronously
    if (writableLevels.length > 1) {
      const asyncWrites = writableLevels.slice(1).map(level =>
        level.cache.set(key, value, options).catch(error => {
          console.error(`Cache level ${level.name} async set() error:`, error);
        })
      );
      
      // Don't await these writes
      Promise.all(asyncWrites);
    }
  }

  /**
   * Write-around strategy: write only to persistent levels, skip volatile ones
   */
  private async writeAround<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Assume memory caches are volatile and Redis/database caches are persistent
    // This is a simplified heuristic - in practice, you'd configure this per level
    const persistentLevels = this.levels.filter(level => 
      !level.readOnly && 
      (level.name.includes('redis') || level.name.includes('database'))
    );
    
    if (persistentLevels.length === 0) {
      // Fallback to write-through if no persistent levels identified
      await this.writeThrough(key, value, options);
      return;
    }
    
    const promises = persistentLevels.map(level =>
      level.cache.set(key, value, options).catch(error => {
        console.error(`Cache level ${level.name} set() error:`, error);
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Promote cache entry to higher priority levels
   */
  private async promoteToHigherLevels<T>(
    key: string,
    value: T,
    currentLevelIndex: number
  ): Promise<void> {
    if (currentLevelIndex === 0) return; // Already at highest level
    
    const promotionPromises = [];
    
    for (let i = 0; i < currentLevelIndex; i++) {
      const level = this.levels[i];
      
      if (!level.readOnly) {
        promotionPromises.push(
          level.cache.set(key, value).catch(error => {
            console.error(`Cache promotion to level ${level.name} error:`, error);
          })
        );
      }
    }
    
    // Don't await promotions to avoid slowing down the read
    Promise.all(promotionPromises);
  }

  /**
   * Add a new cache level
   */
  addLevel(level: CacheLevel): void {
    this.levels.push(level);
    this.levels.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a cache level
   */
  removeLevel(levelName: string): boolean {
    const index = this.levels.findIndex(level => level.name === levelName);
    
    if (index >= 0) {
      this.levels.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Get cache level by name
   */
  getLevel(levelName: string): CacheLevel | null {
    return this.levels.find(level => level.name === levelName) || null;
  }

  /**
   * Get all cache levels
   */
  getLevels(): CacheLevel[] {
    return [...this.levels];
  }

  /**
   * Update cache level configuration
   */
  updateLevel(levelName: string, updates: Partial<CacheLevel>): boolean {
    const level = this.getLevel(levelName);
    
    if (level) {
      Object.assign(level, updates);
      
      // Re-sort if priority changed
      if (updates.priority !== undefined) {
        this.levels.sort((a, b) => b.priority - a.priority);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Test connectivity to all cache levels
   */
  async testConnectivity(): Promise<Array<{ level: string; connected: boolean; error?: string }>> {
    const results = [];
    
    for (const level of this.levels) {
      try {
        // Test with a simple operation
        await level.cache.has('__connectivity_test__');
        results.push({ level: level.name, connected: true });
      } catch (error) {
        results.push({ 
          level: level.name, 
          connected: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Warm cache across all levels
   */
  async warmCache(keys: string[]): Promise<void> {
    // This would typically be used with a cache warmer
    // For now, it's a placeholder for warming specific keys
    console.log(`Warming cache for ${keys.length} keys across ${this.levels.length} levels`);
  }

  /**
   * Get multi-level cache configuration
   */
  getMultiLevelConfig(): Required<MultiLevelCacheOptions> {
    return {
      ...this.options,
      levels: [...this.levels]
    };
  }

  /**
   * Update multi-level cache configuration
   */
  updateMultiLevelConfig(options: Partial<MultiLevelCacheOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (options.levels) {
      this.levels = [...options.levels].sort((a, b) => b.priority - a.priority);
    }
  }
}