/**
 * Cache Warmer
 * 
 * Proactively populates cache with frequently accessed content
 * to improve performance and reduce cache misses.
 */

import {
  CacheWarmer as ICacheWarmer,
  WarmingTarget,
  WarmingStats,
  CacheManager
} from '../interfaces/cache';
import { CacheUtils } from './cache-utils';

export interface CacheWarmerConfig {
  cacheManager: CacheManager;
  contentProvider: ContentProvider;
  enableLogging?: boolean;
  concurrency?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ContentProvider {
  getPopularContent(limit?: number): Promise<ContentItem[]>;
  getUserContent(userId: string, limit?: number): Promise<ContentItem[]>;
  getTenantContent(tenantId: string, limit?: number): Promise<ContentItem[]>;
  getContentById(contentType: string, contentId: string): Promise<ContentItem | null>;
  getContentByType(contentType: string, limit?: number): Promise<ContentItem[]>;
}

export interface ContentItem {
  id: string;
  type: string;
  data: unknown;
  metadata?: Record<string, unknown>;
  accessCount?: number;
  lastAccessed?: string;
  tenantId?: string;
  userId?: string;
}

export interface WarmingJob {
  id: string;
  target: WarmingTarget;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  itemsWarmed: number;
  totalItems: number;
  error?: string;
}

export class CacheWarmer implements ICacheWarmer {
  private cacheManager: CacheManager;
  private contentProvider: ContentProvider;
  private utils: CacheUtils;
  private config: Required<CacheWarmerConfig>;
  private jobs = new Map<string, WarmingJob>();
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private stats: WarmingStats = {
    totalWarmed: 0,
    successRate: 0,
    averageTime: 0,
    lastRun: new Date().toISOString()
  };

  constructor(config: CacheWarmerConfig) {
    this.cacheManager = config.cacheManager;
    this.contentProvider = config.contentProvider;
    this.utils = new CacheUtils();
    
    this.config = {
      enableLogging: true,
      concurrency: 5,
      batchSize: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Warm cache with popular content
   */
  async warmPopularContent(): Promise<void> {
    const job = this.createJob({
      type: 'popular',
      priority: 10
    });

    try {
      await this.executeWarmingJob(job);
    } catch (error) {
      this.handleJobError(job, error);
    }
  }

  /**
   * Warm cache for specific user
   */
  async warmUserContent(userId: string): Promise<void> {
    const job = this.createJob({
      type: 'user',
      identifier: userId,
      priority: 8
    });

    try {
      await this.executeWarmingJob(job);
    } catch (error) {
      this.handleJobError(job, error);
    }
  }

  /**
   * Warm cache for specific tenant
   */
  async warmTenantContent(tenantId: string): Promise<void> {
    const job = this.createJob({
      type: 'tenant',
      identifier: tenantId,
      priority: 7
    });

    try {
      await this.executeWarmingJob(job);
    } catch (error) {
      this.handleJobError(job, error);
    }
  }

  /**
   * Schedule cache warming
   */
  scheduleWarming(schedule: string, target: WarmingTarget): void {
    const jobId = this.generateJobId();
    const interval = this.parseSchedule(schedule);
    
    const timeout = setInterval(async () => {
      try {
        const job = this.createJob(target, jobId);
        await this.executeWarmingJob(job);
      } catch (error) {
        if (this.config.enableLogging) {
          console.error(`Scheduled warming job failed:`, error);
        }
      }
    }, interval);
    
    this.scheduledJobs.set(jobId, timeout);
    
    if (this.config.enableLogging) {
      console.log(`Scheduled warming job ${jobId} for ${target.type} every ${schedule}`);
    }
  }

  /**
   * Get warming statistics
   */
  async getWarmingStats(): Promise<WarmingStats> {
    return { ...this.stats };
  }

  /**
   * Warm specific content items
   */
  async warmContent(contentItems: ContentItem[]): Promise<void> {
    const job = this.createJob({
      type: 'content',
      priority: 5
    });

    job.totalItems = contentItems.length;

    try {
      job.status = 'running';
      job.startTime = Date.now();

      await this.warmContentBatch(contentItems, job);

      job.status = 'completed';
      job.endTime = Date.now();
      
      this.updateStats(job);
      
      if (this.config.enableLogging) {
        console.log(`Warming job ${job.id} completed: ${job.itemsWarmed}/${job.totalItems} items`);
      }
    } catch (error) {
      this.handleJobError(job, error);
    }
  }

  /**
   * Execute warming job
   */
  private async executeWarmingJob(job: WarmingJob): Promise<void> {
    job.status = 'running';
    job.startTime = Date.now();

    let contentItems: ContentItem[] = [];

    // Get content based on target type
    switch (job.target.type) {
      case 'popular':
        contentItems = await this.contentProvider.getPopularContent(this.config.batchSize);
        break;
      
      case 'user':
        if (job.target.identifier) {
          contentItems = await this.contentProvider.getUserContent(
            job.target.identifier,
            this.config.batchSize
          );
        }
        break;
      
      case 'tenant':
        if (job.target.identifier) {
          contentItems = await this.contentProvider.getTenantContent(
            job.target.identifier,
            this.config.batchSize
          );
        }
        break;
      
      case 'content':
        // Content items should be provided separately for this type
        break;
    }

    job.totalItems = contentItems.length;

    if (contentItems.length === 0) {
      job.status = 'completed';
      job.endTime = Date.now();
      return;
    }

    await this.warmContentBatch(contentItems, job);

    job.status = 'completed';
    job.endTime = Date.now();
    
    this.updateStats(job);
    
    if (this.config.enableLogging) {
      console.log(`Warming job ${job.id} completed: ${job.itemsWarmed}/${job.totalItems} items`);
    }
  }

  /**
   * Warm content items in batches with concurrency control
   */
  private async warmContentBatch(contentItems: ContentItem[], job: WarmingJob): Promise<void> {
    const batches = this.createBatches(contentItems, this.config.batchSize);
    
    for (const batch of batches) {
      const promises = batch.map(item => this.warmSingleItem(item, job));
      
      // Process batch with concurrency limit
      await this.processConcurrently(promises, this.config.concurrency);
    }
  }

  /**
   * Warm single content item
   */
  private async warmSingleItem(item: ContentItem, job: WarmingJob): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        // Generate cache keys for the content item
        const cacheKeys = this.generateCacheKeys(item);
        
        // Warm each cache key
        for (const { key, options } of cacheKeys) {
          // Check if already cached
          const exists = await this.cacheManager.has(key);
          
          if (!exists) {
            // Cache the content
            await this.cacheManager.set(key, item.data, {
              ...options,
              tags: this.utils.generateContentTags(item.type, item.id, item.metadata)
            });
          }
        }
        
        job.itemsWarmed++;
        return; // Success, exit retry loop
        
      } catch (error) {
        attempts++;
        
        if (attempts >= this.config.retryAttempts) {
          if (this.config.enableLogging) {
            console.error(`Failed to warm item ${item.id} after ${attempts} attempts:`, error);
          }
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.config.retryDelay * attempts);
      }
    }
  }

  /**
   * Generate cache keys for content item
   */
  private generateCacheKeys(item: ContentItem): Array<{ key: string; options?: any }> {
    const keys: Array<{ key: string; options?: any }> = [];
    
    // Primary content key
    keys.push({
      key: this.utils.generateContentKey(item.type, item.id),
      options: { ttl: this.calculateTTL(item) }
    });
    
    // User-specific key if applicable
    if (item.userId) {
      keys.push({
        key: this.utils.generateUserKey(item.userId, item.type, { contentId: item.id }),
        options: { ttl: this.calculateTTL(item) }
      });
    }
    
    // Tenant-specific key if applicable
    if (item.tenantId) {
      keys.push({
        key: this.utils.generateTenantKey(item.tenantId, item.type, { contentId: item.id }),
        options: { ttl: this.calculateTTL(item) }
      });
    }
    
    // Type-based key
    keys.push({
      key: `type:${item.type}:${item.id}`,
      options: { ttl: this.calculateTTL(item) }
    });
    
    return keys;
  }

  /**
   * Calculate TTL based on content characteristics
   */
  private calculateTTL(item: ContentItem): number {
    let baseTTL = 3600000; // 1 hour default
    
    // Adjust based on access patterns
    if (item.accessCount) {
      const accessMultiplier = Math.min(item.accessCount / 100, 5); // Max 5x multiplier
      baseTTL *= (1 + accessMultiplier);
    }
    
    // Adjust based on content type
    const typeMultipliers: Record<string, number> = {
      'page': 2,
      'block': 1.5,
      'component': 1.2,
      'asset': 3,
      'config': 0.5
    };
    
    const typeMultiplier = typeMultipliers[item.type] || 1;
    baseTTL *= typeMultiplier;
    
    // Adjust based on recency
    if (item.lastAccessed) {
      const lastAccessTime = new Date(item.lastAccessed).getTime();
      const hoursSinceAccess = (Date.now() - lastAccessTime) / (1000 * 60 * 60);
      
      if (hoursSinceAccess < 1) {
        baseTTL *= 2; // Recently accessed, cache longer
      } else if (hoursSinceAccess > 24) {
        baseTTL *= 0.5; // Old access, cache shorter
      }
    }
    
    return Math.round(baseTTL);
  }

  /**
   * Create warming job
   */
  private createJob(target: WarmingTarget, jobId?: string): WarmingJob {
    const job: WarmingJob = {
      id: jobId || this.generateJobId(),
      target,
      status: 'pending',
      itemsWarmed: 0,
      totalItems: 0
    };
    
    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Handle job error
   */
  private handleJobError(job: WarmingJob, error: unknown): void {
    job.status = 'failed';
    job.endTime = Date.now();
    job.error = error instanceof Error ? error.message : 'Unknown error';
    
    if (this.config.enableLogging) {
      console.error(`Warming job ${job.id} failed:`, error);
    }
  }

  /**
   * Update warming statistics
   */
  private updateStats(job: WarmingJob): void {
    if (job.status === 'completed' && job.startTime && job.endTime) {
      const duration = job.endTime - job.startTime;
      
      // Update running averages
      const totalJobs = this.getTotalCompletedJobs();
      this.stats.averageTime = (this.stats.averageTime * (totalJobs - 1) + duration) / totalJobs;
      this.stats.totalWarmed += job.itemsWarmed;
      this.stats.successRate = this.calculateSuccessRate();
      this.stats.lastRun = new Date().toISOString();
    }
  }

  /**
   * Get total completed jobs
   */
  private getTotalCompletedJobs(): number {
    return Array.from(this.jobs.values()).filter(job => job.status === 'completed').length;
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): number {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const totalJobs = jobs.filter(job => job.status !== 'pending').length;
    
    return totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Process promises with concurrency limit
   */
  private async processConcurrently<T>(
    promises: Promise<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }
    
    return results;
  }

  /**
   * Parse schedule string to interval
   */
  private parseSchedule(schedule: string): number {
    const scheduleMap: Record<string, number> = {
      'minute': 60 * 1000,
      'hourly': 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000,
      'weekly': 7 * 24 * 60 * 60 * 1000
    };
    
    return scheduleMap[schedule] || 60 * 60 * 1000; // Default to hourly
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `warm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all warming jobs
   */
  getJobs(): WarmingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): WarmingJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel scheduled warming job
   */
  cancelScheduledJob(jobId: string): boolean {
    const timeout = this.scheduledJobs.get(jobId);
    
    if (timeout) {
      clearInterval(timeout);
      this.scheduledJobs.delete(jobId);
      
      if (this.config.enableLogging) {
        console.log(`Cancelled scheduled warming job ${jobId}`);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): string[] {
    return Array.from(this.scheduledJobs.keys());
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const completedJobs = Array.from(this.jobs.entries())
      .filter(([, job]) => job.status === 'completed' || job.status === 'failed');
    
    for (const [jobId] of completedJobs) {
      this.jobs.delete(jobId);
    }
    
    return completedJobs.length;
  }

  /**
   * Warm cache based on priority
   */
  async warmByPriority(targets: WarmingTarget[]): Promise<void> {
    // Sort targets by priority (higher first)
    const sortedTargets = [...targets].sort((a, b) => b.priority - a.priority);
    
    for (const target of sortedTargets) {
      try {
        const job = this.createJob(target);
        await this.executeWarmingJob(job);
      } catch (error) {
        if (this.config.enableLogging) {
          console.error(`Priority warming failed for ${target.type}:`, error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all scheduled jobs
    for (const [jobId, timeout] of this.scheduledJobs.entries()) {
      clearInterval(timeout);
      this.scheduledJobs.delete(jobId);
    }
    
    // Clear job history
    this.jobs.clear();
    
    if (this.config.enableLogging) {
      console.log('Cache warmer cleanup completed');
    }
  }
}