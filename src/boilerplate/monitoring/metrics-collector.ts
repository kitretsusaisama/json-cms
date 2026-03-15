/**
 * Metrics Collector Implementation
 * 
 * Collects and aggregates performance metrics, request statistics,
 * and custom metrics for monitoring and alerting.
 */

import { 
  MetricsCollector, 
  PerformanceMetrics, 
  MetricsSummary, 
  TimeRange,
  MonitoringConfig 
} from './interfaces';
import { getLogger } from './structured-logger';

interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

interface RequestMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
}

interface ErrorMetric {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: Record<string, unknown>;
  timestamp: Date;
}

export class BoilerplateMetricsCollector implements MetricsCollector {
  private config: MonitoringConfig['metrics'];
  private logger = getLogger();
  
  // In-memory storage (in production, use Redis or a time-series database)
  private requestMetrics: RequestMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private customMetrics: MetricPoint[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: MonitoringConfig['metrics']) {
    this.config = config;
    
    // Start performance collection
    if (config.enabled) {
      this.startPerformanceCollection();
      this.startCleanup();
    }
  }

  recordRequest(endpoint: string, method: string, duration: number, statusCode: number): void {
    if (!this.config.enabled) return;

    const metric: RequestMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date()
    };

    this.requestMetrics.push(metric);
    
    this.logger.debug('Request metric recorded', {
      endpoint,
      method,
      duration,
      statusCode
    });
  }

  recordError(error: Error, context?: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    const metric: ErrorMetric = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: context || {},
      timestamp: new Date()
    };

    this.errorMetrics.push(metric);
    
    this.logger.debug('Error metric recorded', {
      errorName: error.name,
      errorMessage: error.message
    });
  }

  recordCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const metric: MetricPoint = {
      name,
      value,
      timestamp: new Date(),
      tags: tags || {}
    };

    this.customMetrics.push(metric);
    
    this.logger.debug('Custom metric recorded', {
      name,
      value,
      tags
    });
  }

  async getMetrics(timeRange?: TimeRange): Promise<MetricsSummary> {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const start = timeRange?.start || defaultStart;
    const end = timeRange?.end || now;

    // Filter metrics by time range
    const filteredRequests = this.requestMetrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );
    
    const filteredErrors = this.errorMetrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );
    
    const filteredPerformance = this.performanceMetrics.filter(
      m => new Date(m.timestamp) >= start && new Date(m.timestamp) <= end
    );
    
    const filteredCustom = this.customMetrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    // Calculate request metrics
    const totalRequests = filteredRequests.length;
    const successfulRequests = filteredRequests.filter(r => r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = totalRequests > 0 
      ? filteredRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests 
      : 0;

    // Calculate error metrics
    const errorsByType: Record<string, number> = {};
    filteredErrors.forEach(error => {
      const type = error.error.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    // Calculate performance metrics
    const averageMemoryUsage = filteredPerformance.length > 0
      ? filteredPerformance.reduce((sum, p) => sum + p.memoryUsage.heapUsed, 0) / filteredPerformance.length
      : 0;
    
    const averageCpuUsage = filteredPerformance.length > 0
      ? filteredPerformance.reduce((sum, p) => sum + (p.cpuUsage.user + p.cpuUsage.system), 0) / filteredPerformance.length
      : 0;

    // Calculate custom metrics
    const customMetricsSummary: Record<string, number> = {};
    filteredCustom.forEach(metric => {
      if (!customMetricsSummary[metric.name]) {
        customMetricsSummary[metric.name] = 0;
      }
      customMetricsSummary[metric.name] += metric.value;
    });

    return {
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        averageResponseTime
      },
      errors: {
        total: filteredErrors.length,
        byType: errorsByType
      },
      performance: {
        averageMemoryUsage,
        averageCpuUsage
      },
      custom: customMetricsSummary
    };
  }

  async exportMetrics(): Promise<string> {
    const metrics = await this.getMetrics();
    
    if (this.config.exportFormat === 'prometheus') {
      return this.exportPrometheusFormat(metrics);
    }
    
    return JSON.stringify(metrics, null, 2);
  }

  private exportPrometheusFormat(metrics: MetricsSummary): string {
    const lines: string[] = [];
    
    // Request metrics
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total{status="success"} ${metrics.requests.successful}`);
    lines.push(`http_requests_total{status="error"} ${metrics.requests.failed}`);
    
    lines.push('# HELP http_request_duration_ms Average HTTP request duration in milliseconds');
    lines.push('# TYPE http_request_duration_ms gauge');
    lines.push(`http_request_duration_ms ${metrics.requests.averageResponseTime}`);
    
    // Error metrics
    lines.push('# HELP errors_total Total number of errors by type');
    lines.push('# TYPE errors_total counter');
    Object.entries(metrics.errors.byType).forEach(([type, count]) => {
      lines.push(`errors_total{type="${type}"} ${count}`);
    });
    
    // Performance metrics
    lines.push('# HELP memory_usage_bytes Average memory usage in bytes');
    lines.push('# TYPE memory_usage_bytes gauge');
    lines.push(`memory_usage_bytes ${metrics.performance.averageMemoryUsage}`);
    
    lines.push('# HELP cpu_usage_microseconds Average CPU usage in microseconds');
    lines.push('# TYPE cpu_usage_microseconds gauge');
    lines.push(`cpu_usage_microseconds ${metrics.performance.averageCpuUsage}`);
    
    // Custom metrics
    Object.entries(metrics.custom).forEach(([name, value]) => {
      lines.push(`# HELP ${name} Custom metric`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    });
    
    return lines.join('\n');
  }

  private startPerformanceCollection(): void {
    const interval = this.config.collectInterval || 30000; // 30 seconds default
    
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metric: PerformanceMetrics = {
        requestDuration: 0, // This would be set by request middleware
        memoryUsage,
        cpuUsage,
        timestamp: new Date().toISOString()
      };
      
      this.performanceMetrics.push(metric);
    }, interval);
  }

  private startCleanup(): void {
    const retentionPeriod = this.config.retentionPeriod || 7 * 24 * 60 * 60 * 1000; // 7 days default
    
    this.cleanupInterval = setInterval(() => {
      const cutoff = new Date(Date.now() - retentionPeriod);
      
      this.requestMetrics = this.requestMetrics.filter(m => m.timestamp > cutoff);
      this.errorMetrics = this.errorMetrics.filter(m => m.timestamp > cutoff);
      this.customMetrics = this.customMetrics.filter(m => m.timestamp > cutoff);
      this.performanceMetrics = this.performanceMetrics.filter(
        m => new Date(m.timestamp) > cutoff
      );
      
      this.logger.debug('Metrics cleanup completed', {
        requestMetrics: this.requestMetrics.length,
        errorMetrics: this.errorMetrics.length,
        customMetrics: this.customMetrics.length,
        performanceMetrics: this.performanceMetrics.length
      });
    }, 60 * 60 * 1000); // Run cleanup every hour
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Middleware for automatic request metrics collection
export function createMetricsMiddleware(collector: MetricsCollector) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      collector.recordRequest(
        req.route?.path || req.path || req.url,
        req.method,
        duration,
        res.statusCode
      );
      
      originalEnd.apply(res, args);
    };
    
    next();
  };
}

// Utility function to record performance metrics for specific operations
export function measurePerformance<T>(
  collector: MetricsCollector,
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime;
      collector.recordCustomMetric(`operation_duration_ms`, duration, {
        operation: operationName,
        status: 'success'
      });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      collector.recordCustomMetric(`operation_duration_ms`, duration, {
        operation: operationName,
        status: 'error'
      });
      collector.recordError(error, { operation: operationName });
      throw error;
    });
}