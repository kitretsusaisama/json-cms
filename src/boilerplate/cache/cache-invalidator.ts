/**
 * Cache Invalidator
 * 
 * Intelligent cache invalidation system that automatically invalidates
 * cache entries based on content changes, user actions, and time-based rules.
 */

import {
  CacheInvalidator as ICacheInvalidator,
  InvalidationRule,
  InvalidationTrigger,
  InvalidationTarget,
  InvalidationCondition,
  CacheManager
} from '../interfaces/cache';
import { CacheUtils } from './cache-utils';

export interface CacheInvalidatorConfig {
  cacheManager: CacheManager;
  enableLogging?: boolean;
  batchSize?: number;
  batchDelay?: number;
}

export class CacheInvalidator implements ICacheInvalidator {
  private cacheManager: CacheManager;
  private rules = new Map<string, InvalidationRule>();
  private utils: CacheUtils;
  private config: Required<CacheInvalidatorConfig>;
  private batchQueue: Array<{ type: string; targets: InvalidationTarget[] }> = [];
  private batchTimeout?: NodeJS.Timeout;

  constructor(config: CacheInvalidatorConfig) {
    this.cacheManager = config.cacheManager;
    this.utils = new CacheUtils();
    
    this.config = {
      enableLogging: true,
      batchSize: 100,
      batchDelay: 1000, // 1 second
      ...config
    };
    
    this.initializeDefaultRules();
  }

  /**
   * Invalidate cache on content change
   */
  async onContentChange(contentType: string, contentId: string): Promise<void> {
    const trigger: InvalidationTrigger = {
      type: 'content_change',
      contentType,
    };
    
    const context = { contentType, contentId };
    await this.processInvalidation(trigger, context);
    
    if (this.config.enableLogging) {
      console.log(`Cache invalidated for content change: ${contentType}:${contentId}`);
    }
  }

  /**
   * Invalidate cache on user action
   */
  async onUserAction(userId: string, action: string, resource: string): Promise<void> {
    const trigger: InvalidationTrigger = {
      type: 'user_action',
      action
    };
    
    const context = { userId, action, resource };
    await this.processInvalidation(trigger, context);
    
    if (this.config.enableLogging) {
      console.log(`Cache invalidated for user action: ${userId} ${action} ${resource}`);
    }
  }

  /**
   * Invalidate cache on time-based rules
   */
  async onSchedule(schedule: string): Promise<void> {
    const trigger: InvalidationTrigger = {
      type: 'time_based',
      schedule
    };
    
    const context = { schedule, timestamp: Date.now() };
    await this.processInvalidation(trigger, context);
    
    if (this.config.enableLogging) {
      console.log(`Cache invalidated for schedule: ${schedule}`);
    }
  }

  /**
   * Register invalidation rule
   */
  registerRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
    
    if (this.config.enableLogging) {
      console.log(`Registered invalidation rule: ${rule.name} (${rule.id})`);
    }
  }

  /**
   * Remove invalidation rule
   */
  removeRule(ruleId: string): void {
    const removed = this.rules.delete(ruleId);
    
    if (removed && this.config.enableLogging) {
      console.log(`Removed invalidation rule: ${ruleId}`);
    }
  }

  /**
   * Process invalidation based on trigger and context
   */
  private async processInvalidation(
    trigger: InvalidationTrigger,
    context: Record<string, unknown>
  ): Promise<void> {
    const matchingRules = this.findMatchingRules(trigger, context);
    
    if (matchingRules.length === 0) return;
    
    const allTargets: InvalidationTarget[] = [];
    
    for (const rule of matchingRules) {
      // Evaluate conditions if present
      if (rule.conditions && !this.evaluateConditions(rule.conditions, context)) {
        continue;
      }
      
      allTargets.push(...rule.targets);
    }
    
    if (allTargets.length > 0) {
      await this.executeInvalidation(allTargets, context);
    }
  }

  /**
   * Find rules that match the trigger
   */
  private findMatchingRules(
    trigger: InvalidationTrigger,
    context: Record<string, unknown>
  ): InvalidationRule[] {
    const matchingRules: InvalidationRule[] = [];
    
    for (const rule of this.rules.values()) {
      if (this.triggerMatches(rule.trigger, trigger, context)) {
        matchingRules.push(rule);
      }
    }
    
    return matchingRules;
  }

  /**
   * Check if trigger matches rule trigger
   */
  private triggerMatches(
    ruleTrigger: InvalidationTrigger,
    actualTrigger: InvalidationTrigger,
    context: Record<string, unknown>
  ): boolean {
    if (ruleTrigger.type !== actualTrigger.type) {
      return false;
    }
    
    switch (ruleTrigger.type) {
      case 'content_change':
        return !ruleTrigger.contentType || 
               ruleTrigger.contentType === actualTrigger.contentType;
      
      case 'user_action':
        return !ruleTrigger.action || 
               ruleTrigger.action === actualTrigger.action;
      
      case 'time_based':
        return !ruleTrigger.schedule || 
               ruleTrigger.schedule === actualTrigger.schedule;
      
      case 'manual':
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Evaluate invalidation conditions
   */
  private evaluateConditions(
    conditions: InvalidationCondition[],
    context: Record<string, unknown>
  ): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'not_equals':
          return contextValue !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && 
                 condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) && 
                 !condition.value.includes(contextValue);
        case 'contains':
          return typeof contextValue === 'string' && 
                 typeof condition.value === 'string' &&
                 contextValue.includes(condition.value);
        case 'starts_with':
          return typeof contextValue === 'string' && 
                 typeof condition.value === 'string' &&
                 contextValue.startsWith(condition.value);
        case 'ends_with':
          return typeof contextValue === 'string' && 
                 typeof condition.value === 'string' &&
                 contextValue.endsWith(condition.value);
        case 'greater_than':
          return typeof contextValue === 'number' && 
                 typeof condition.value === 'number' &&
                 contextValue > condition.value;
        case 'less_than':
          return typeof contextValue === 'number' && 
                 typeof condition.value === 'number' &&
                 contextValue < condition.value;
        default:
          return false;
      }
    });
  }

  /**
   * Execute cache invalidation for targets
   */
  private async executeInvalidation(
    targets: InvalidationTarget[],
    context: Record<string, unknown>
  ): Promise<void> {
    if (this.config.batchSize > 1) {
      // Add to batch queue
      this.batchQueue.push({ type: 'invalidation', targets });
      
      if (this.batchQueue.length >= this.config.batchSize) {
        await this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.config.batchDelay);
      }
    } else {
      // Execute immediately
      await this.invalidateTargets(targets, context);
    }
  }

  /**
   * Process batched invalidations
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }
    
    if (this.batchQueue.length === 0) return;
    
    const allTargets: InvalidationTarget[] = [];
    
    for (const batch of this.batchQueue) {
      allTargets.push(...batch.targets);
    }
    
    this.batchQueue = [];
    
    await this.invalidateTargets(allTargets, {});
  }

  /**
   * Invalidate cache targets
   */
  private async invalidateTargets(
    targets: InvalidationTarget[],
    context: Record<string, unknown>
  ): Promise<void> {
    const keyTargets: string[] = [];
    const patternTargets: string[] = [];
    const tagTargets: string[] = [];
    
    // Group targets by type
    for (const target of targets) {
      const resolvedValue = this.resolveTargetValue(target.value, context);
      
      switch (target.type) {
        case 'key':
          keyTargets.push(resolvedValue);
          break;
        case 'pattern':
          patternTargets.push(resolvedValue);
          break;
        case 'tags':
          tagTargets.push(resolvedValue);
          break;
      }
    }
    
    // Execute invalidations
    const promises: Promise<unknown>[] = [];
    
    if (keyTargets.length > 0) {
      promises.push(this.cacheManager.deleteMany(keyTargets));
    }
    
    if (patternTargets.length > 0) {
      for (const pattern of patternTargets) {
        promises.push(this.cacheManager.invalidateByPattern(pattern));
      }
    }
    
    if (tagTargets.length > 0) {
      promises.push(this.cacheManager.invalidateByTags(tagTargets));
    }
    
    await Promise.all(promises);
  }

  /**
   * Resolve target value with context variables
   */
  private resolveTargetValue(value: string, context: Record<string, unknown>): string {
    return value.replace(/\${(\w+)}/g, (match, key) => {
      const contextValue = context[key];
      return contextValue !== undefined ? String(contextValue) : match;
    });
  }

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultRules(): void {
    // Content change rules
    this.registerRule({
      id: 'content_change_pages',
      name: 'Invalidate page cache on content change',
      trigger: { type: 'content_change', contentType: 'page' },
      targets: [
        { type: 'key', value: 'page:${contentId}' },
        { type: 'pattern', value: 'page:${contentId}:*' },
        { type: 'tags', value: 'page:${contentId}' }
      ]
    });
    
    this.registerRule({
      id: 'content_change_blocks',
      name: 'Invalidate block cache on content change',
      trigger: { type: 'content_change', contentType: 'block' },
      targets: [
        { type: 'key', value: 'block:${contentId}' },
        { type: 'pattern', value: 'block:${contentId}:*' },
        { type: 'tags', value: 'block:${contentId}' }
      ]
    });
    
    this.registerRule({
      id: 'content_change_components',
      name: 'Invalidate component cache on content change',
      trigger: { type: 'content_change', contentType: 'component' },
      targets: [
        { type: 'key', value: 'component:${contentId}' },
        { type: 'pattern', value: 'component:${contentId}:*' },
        { type: 'tags', value: 'component:${contentId}' }
      ]
    });
    
    // User action rules
    this.registerRule({
      id: 'user_login',
      name: 'Invalidate user cache on login',
      trigger: { type: 'user_action', action: 'login' },
      targets: [
        { type: 'pattern', value: 'user:${userId}:*' },
        { type: 'tags', value: 'user:${userId}' }
      ]
    });
    
    this.registerRule({
      id: 'user_logout',
      name: 'Invalidate user cache on logout',
      trigger: { type: 'user_action', action: 'logout' },
      targets: [
        { type: 'pattern', value: 'user:${userId}:*' },
        { type: 'tags', value: 'user:${userId}' }
      ]
    });
    
    this.registerRule({
      id: 'user_permission_change',
      name: 'Invalidate user cache on permission change',
      trigger: { type: 'user_action', action: 'permission_change' },
      targets: [
        { type: 'pattern', value: 'user:${userId}:*' },
        { type: 'pattern', value: 'auth:${userId}:*' },
        { type: 'tags', value: 'user:${userId}' }
      ]
    });
    
    // Time-based rules
    this.registerRule({
      id: 'daily_cleanup',
      name: 'Daily cache cleanup',
      trigger: { type: 'time_based', schedule: 'daily' },
      targets: [
        { type: 'tags', value: 'temporary' },
        { type: 'pattern', value: 'temp:*' }
      ]
    });
    
    this.registerRule({
      id: 'hourly_stats_refresh',
      name: 'Hourly statistics refresh',
      trigger: { type: 'time_based', schedule: 'hourly' },
      targets: [
        { type: 'pattern', value: 'stats:*' },
        { type: 'tags', value: 'statistics' }
      ]
    });
  }

  /**
   * Manually trigger invalidation
   */
  async manualInvalidation(
    targets: InvalidationTarget[],
    context: Record<string, unknown> = {}
  ): Promise<void> {
    await this.invalidateTargets(targets, context);
    
    if (this.config.enableLogging) {
      console.log(`Manual cache invalidation executed for ${targets.length} targets`);
    }
  }

  /**
   * Get all registered rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): InvalidationRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Update existing rule
   */
  updateRule(ruleId: string, updates: Partial<InvalidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
    
    if (this.config.enableLogging) {
      console.log('All invalidation rules cleared');
    }
  }

  /**
   * Export rules configuration
   */
  exportRules(): InvalidationRule[] {
    return this.getRules();
  }

  /**
   * Import rules configuration
   */
  importRules(rules: InvalidationRule[], replace: boolean = false): void {
    if (replace) {
      this.clearRules();
    }
    
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Get invalidation statistics
   */
  async getInvalidationStats(): Promise<{
    totalRules: number;
    activeRules: number;
    batchQueueSize: number;
    recentInvalidations: number;
  }> {
    return {
      totalRules: this.rules.size,
      activeRules: this.rules.size, // All rules are considered active
      batchQueueSize: this.batchQueue.length,
      recentInvalidations: 0 // Would need to track this over time
    };
  }

  /**
   * Test invalidation rule
   */
  async testRule(
    ruleId: string,
    context: Record<string, unknown>
  ): Promise<{
    matched: boolean;
    conditionsEvaluated: boolean;
    targetsResolved: string[];
  }> {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    // Create a mock trigger based on rule trigger
    const mockTrigger = { ...rule.trigger };
    
    const matched = this.triggerMatches(rule.trigger, mockTrigger, context);
    const conditionsEvaluated = !rule.conditions || 
                               this.evaluateConditions(rule.conditions, context);
    
    const targetsResolved = rule.targets.map(target => 
      this.resolveTargetValue(target.value, context)
    );
    
    return {
      matched,
      conditionsEvaluated,
      targetsResolved
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }
    
    // Process any remaining batched invalidations
    if (this.batchQueue.length > 0) {
      await this.processBatch();
    }
  }
}