/**
 * Performance Monitor
 * 
 * Monitors cache performance, collects metrics, and provides
 * optimization recommendations for improved cache efficiency.
 */

import { CacheManager, CacheStats } from '../interfaces/cache';

export interface PerformanceMetrics {
  timestamp: number;
  cacheStats: CacheStats;
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    operationsPerSecond: number;
  };
  errorRate: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: number;
  resolved?: boolean;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'cache_size' | 'ttl' | 'eviction' | 'warming' | 'invalidation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number; // Percentage
  timestamp: number;
}

export interface PerformanceMonitorConfig {
  cacheManager: CacheManager;
  enableLogging?: boolean;
  metricsRetention?: number; // How long to keep metrics (ms)
  alertThresholds?: AlertThresholds;
  monitoringInterval?: number; // Monitoring frequency (ms)
  enableRecommendations?: boolean;
}

export interface AlertThresholds {
  hitRateWarning: number; // Below this hit rate triggers warning
  hitRateCritical: number; // Below this hit rate triggers critical alert
  memoryUsageWarning: number; // Above this memory usage triggers warning
  memoryUsageCritical: number; // Above this memory usage triggers critical alert
  responseTimeWarning: number; // Above this response time triggers warning
  responseTimeCritical: number; // Above this response time triggers critical alert
  errorRateWarning: number; // Above this error rate triggers warning
  errorRateCritical: number; // Above this error rate triggers critical alert
}

export class PerformanceMonitor {
  private cacheManager: CacheManager;
  private config: Required<PerformanceMonitorConfig>;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private responseTimes: number[] = [];
  private operationCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private lastMetricsTime = Date.now();

  constructor(config: PerformanceMonitorConfig) {
    this.cacheManager = config.cacheManager;
    
    this.config = {
      enableLogging: true,
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      monitoringInterval: 60000, // 1 minute
      enableRecommendations: true,
      alertThresholds: {
        hitRateWarning: 80,
        hitRateCritical: 60,
        memoryUsageWarning: 80,
        memoryUsageCritical: 95,
        responseTimeWarning: 100,
        responseTimeCritical: 500,
        errorRateWarning: 5,
        errorRateCritical: 10
      },
      ...config
    };

    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics().catch(error => {
        if (this.config.enableLogging) {
          console.error('Failed to collect performance metrics:', error);
        }
      });
    }, this.config.monitoringInterval);

    if (this.config.enableLogging) {
      console.log('Performance monitoring started');
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.config.enableLogging) {
      console.log('Performance monitoring stopped');
    }
  }

  /**
   * Record operation timing
   */
  recordOperation(operation: string, duration: number, success: boolean = true): void {
    // Record response time
    this.responseTimes.push(duration);
    
    // Keep only recent response times (last 1000 operations)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Record operation count
    const currentCount = this.operationCounts.get(operation) || 0;
    this.operationCounts.set(operation, currentCount + 1);

    // Record errors
    if (!success) {
      const errorCount = this.errorCounts.get(operation) || 0;
      this.errorCounts.set(operation, errorCount + 1);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const cacheStats = await this.cacheManager.getStats();
      const memoryUsage = process.memoryUsage();
      const now = Date.now();
      const timeDelta = (now - this.lastMetricsTime) / 1000; // seconds

      // Calculate response time percentiles
      const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
      const responseTime = {
        average: sortedTimes.length > 0 ? 
          sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0,
        p50: this.getPercentile(sortedTimes, 50),
        p95: this.getPercentile(sortedTimes, 95),
        p99: this.getPercentile(sortedTimes, 99)
      };

      // Calculate throughput
      const totalOperations = Array.from(this.operationCounts.values())
        .reduce((sum, count) => sum + count, 0);
      const throughput = {
        requestsPerSecond: totalOperations / timeDelta,
        operationsPerSecond: cacheStats.operations.gets + cacheStats.operations.sets / timeDelta
      };

      // Calculate error rate
      const totalErrors = Array.from(this.errorCounts.values())
        .reduce((sum, count) => sum + count, 0);
      const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

      const metrics: PerformanceMetrics = {
        timestamp: now,
        cacheStats,
        responseTime,
        throughput,
        errorRate,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        }
      };

      this.metrics.push(metrics);
      this.lastMetricsTime = now;

      // Clean up old metrics
      this.cleanupOldMetrics();

      // Check for alerts
      this.checkAlerts(metrics);

      // Generate recommendations
      if (this.config.enableRecommendations) {
        this.generateRecommendations(metrics);
      }

      // Reset counters
      this.operationCounts.clear();
      this.errorCounts.clear();

    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Error collecting metrics:', error);
      }
    }
  }

  /**
   * Get percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.metricsRetention;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const thresholds = this.config.alertThresholds;

    // Check hit rate
    if (metrics.cacheStats.hitRate < thresholds.hitRateCritical) {
      this.createAlert('critical', 'hit_rate', thresholds.hitRateCritical, 
        metrics.cacheStats.hitRate, 'Cache hit rate is critically low');
    } else if (metrics.cacheStats.hitRate < thresholds.hitRateWarning) {
      this.createAlert('warning', 'hit_rate', thresholds.hitRateWarning, 
        metrics.cacheStats.hitRate, 'Cache hit rate is below optimal level');
    }

    // Check memory usage
    const memoryUsagePercent = metrics.cacheStats.memory.percentage;
    if (memoryUsagePercent > thresholds.memoryUsageCritical) {
      this.createAlert('critical', 'memory_usage', thresholds.memoryUsageCritical, 
        memoryUsagePercent, 'Memory usage is critically high');
    } else if (memoryUsagePercent > thresholds.memoryUsageWarning) {
      this.createAlert('warning', 'memory_usage', thresholds.memoryUsageWarning, 
        memoryUsagePercent, 'Memory usage is high');
    }

    // Check response time
    if (metrics.responseTime.p95 > thresholds.responseTimeCritical) {
      this.createAlert('critical', 'response_time', thresholds.responseTimeCritical, 
        metrics.responseTime.p95, '95th percentile response time is critically high');
    } else if (metrics.responseTime.p95 > thresholds.responseTimeWarning) {
      this.createAlert('warning', 'response_time', thresholds.responseTimeWarning, 
        metrics.responseTime.p95, '95th percentile response time is high');
    }

    // Check error rate
    if (metrics.errorRate > thresholds.errorRateCritical) {
      this.createAlert('critical', 'error_rate', thresholds.errorRateCritical, 
        metrics.errorRate, 'Error rate is critically high');
    } else if (metrics.errorRate > thresholds.errorRateWarning) {
      this.createAlert('warning', 'error_rate', thresholds.errorRateWarning, 
        metrics.errorRate, 'Error rate is elevated');
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: 'warning' | 'critical',
    metric: string,
    threshold: number,
    currentValue: number,
    message: string
  ): void {
    const alertId = `${metric}_${type}_${Date.now()}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      metric,
      threshold,
      currentValue,
      message,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    if (this.config.enableLogging) {
      console.warn(`Performance Alert [${type.toUpperCase()}]: ${message} (${currentValue} vs ${threshold})`);
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics): void {
    const recommendations: OptimizationRecommendation[] = [];

    // Low hit rate recommendations
    if (metrics.cacheStats.hitRate < 70) {
      recommendations.push({
        id: `hit_rate_${Date.now()}`,
        category: 'warming',
        priority: 'high',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is below optimal levels, indicating frequent cache misses.',
        impact: 'Reduced response times and improved user experience',
        implementation: 'Implement cache warming for popular content and review TTL settings',
        estimatedImprovement: 25,
        timestamp: Date.now()
      });
    }

    // High memory usage recommendations
    if (metrics.cacheStats.memory.percentage > 85) {
      recommendations.push({
        id: `memory_${Date.now()}`,
        category: 'cache_size',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: 'Cache memory usage is high, which may lead to evictions.',
        impact: 'Prevent cache evictions and maintain performance',
        implementation: 'Increase cache size or implement more aggressive TTL policies',
        estimatedImprovement: 15,
        timestamp: Date.now()
      });
    }

    // High eviction rate recommendations
    if (metrics.cacheStats.evictions > 100) {
      recommendations.push({
        id: `eviction_${Date.now()}`,
        category: 'eviction',
        priority: 'medium',
        title: 'Reduce Cache Evictions',
        description: 'High eviction rate indicates cache size may be insufficient.',
        impact: 'Improved cache efficiency and reduced cache misses',
        implementation: 'Increase cache size or optimize eviction policy (LRU vs LFU)',
        estimatedImprovement: 20,
        timestamp: Date.now()
      });
    }

    // Slow response time recommendations
    if (metrics.responseTime.p95 > 200) {
      recommendations.push({
        id: `response_time_${Date.now()}`,
        category: 'cache_size',
        priority: 'high',
        title: 'Improve Response Times',
        description: '95th percentile response time is above acceptable levels.',
        impact: 'Faster response times and better user experience',
        implementation: 'Implement multi-level caching or optimize cache backend',
        estimatedImprovement: 30,
        timestamp: Date.now()
      });
    }

    // Add new recommendations
    for (const recommendation of recommendations) {
      // Check if similar recommendation already exists
      const exists = this.recommendations.some(existing => 
        existing.category === recommendation.category && 
        existing.priority === recommendation.priority
      );

      if (!exists) {
        this.recommendations.push(recommendation);
      }
    }

    // Clean up old recommendations
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.recommendations = this.recommendations.filter(rec => rec.timestamp > cutoffTime);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    if (!timeRange) {
      return [...this.metrics];
    }

    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.resolved = true;
      return true;
    }
    
    return false;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(category?: string): OptimizationRecommendation[] {
    if (!category) {
      return [...this.recommendations];
    }

    return this.recommendations.filter(rec => rec.category === category);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    currentHitRate: number;
    averageResponseTime: number;
    memoryUsage: number;
    activeAlerts: number;
    recommendations: number;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    const current = this.getCurrentMetrics();
    
    if (!current) {
      return {
        currentHitRate: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        activeAlerts: 0,
        recommendations: 0,
        trend: 'stable'
      };
    }

    // Calculate trend
    const trend = this.calculateTrend();

    return {
      currentHitRate: current.cacheStats.hitRate,
      averageResponseTime: current.responseTime.average,
      memoryUsage: current.cacheStats.memory.percentage,
      activeAlerts: this.getActiveAlerts().length,
      recommendations: this.recommendations.length,
      trend
    };
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < 2) {
      return 'stable';
    }

    const recent = this.metrics.slice(-5); // Last 5 metrics
    const older = this.metrics.slice(-10, -5); // Previous 5 metrics

    if (recent.length === 0 || older.length === 0) {
      return 'stable';
    }

    const recentAvgHitRate = recent.reduce((sum, m) => sum + m.cacheStats.hitRate, 0) / recent.length;
    const olderAvgHitRate = older.reduce((sum, m) => sum + m.cacheStats.hitRate, 0) / older.length;

    const recentAvgResponseTime = recent.reduce((sum, m) => sum + m.responseTime.average, 0) / recent.length;
    const olderAvgResponseTime = older.reduce((sum, m) => sum + m.responseTime.average, 0) / older.length;

    // Consider both hit rate and response time
    const hitRateImprovement = recentAvgHitRate - olderAvgHitRate;
    const responseTimeImprovement = olderAvgResponseTime - recentAvgResponseTime; // Lower is better

    const overallImprovement = hitRateImprovement + (responseTimeImprovement / 100);

    if (overallImprovement > 2) {
      return 'improving';
    } else if (overallImprovement < -2) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    recommendations: OptimizationRecommendation[];
    summary: any;
  } {
    return {
      metrics: this.getHistoricalMetrics(),
      alerts: this.getAllAlerts(),
      recommendations: this.getRecommendations(),
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];
    this.recommendations = [];
    this.responseTimes = [];
    this.operationCounts.clear();
    this.errorCounts.clear();

    if (this.config.enableLogging) {
      console.log('Performance monitor data cleared');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if interval changed
    if (config.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.clearData();

    if (this.config.enableLogging) {
      console.log('Performance monitor cleanup completed');
    }
  }
}