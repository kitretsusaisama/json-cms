/**
 * Metrics Collector Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BoilerplateMetricsCollector, createMetricsMiddleware, measurePerformance } from '../metrics-collector';
import { MonitoringConfig } from '../interfaces';

describe('BoilerplateMetricsCollector', () => {
  let collector: BoilerplateMetricsCollector;
  let config: MonitoringConfig['metrics'];

  beforeEach(() => {
    config = {
      enabled: true,
      collectInterval: 1000,
      retentionPeriod: 60000,
      exportFormat: 'json'
    };
    
    collector = new BoilerplateMetricsCollector(config);
    
    // Mock console.debug to avoid noise in tests
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    collector.destroy();
    vi.restoreAllMocks();
  });

  describe('request metrics', () => {
    it('should record request metrics', () => {
      collector.recordRequest('/api/test', 'GET', 150, 200);
      collector.recordRequest('/api/test', 'POST', 250, 201);
      collector.recordRequest('/api/error', 'GET', 100, 500);

      expect(console.debug).toHaveBeenCalledWith(
        'Request metric recorded',
        expect.objectContaining({
          endpoint: '/api/test',
          method: 'GET',
          duration: 150,
          statusCode: 200
        })
      );
    });

    it('should not record metrics when disabled', () => {
      const disabledCollector = new BoilerplateMetricsCollector({
        ...config,
        enabled: false
      });

      disabledCollector.recordRequest('/api/test', 'GET', 150, 200);
      
      expect(console.debug).not.toHaveBeenCalled();
      
      disabledCollector.destroy();
    });
  });

  describe('error metrics', () => {
    it('should record error metrics', () => {
      const error = new Error('Test error');
      const context = { operation: 'test' };

      collector.recordError(error, context);

      expect(console.debug).toHaveBeenCalledWith(
        'Error metric recorded',
        expect.objectContaining({
          errorName: 'Test error',
          errorMessage: 'Test error'
        })
      );
    });

    it('should handle errors without context', () => {
      const error = new Error('Test error');

      collector.recordError(error);

      expect(console.debug).toHaveBeenCalledWith(
        'Error metric recorded',
        expect.objectContaining({
          errorName: 'Test error'
        })
      );
    });
  });

  describe('custom metrics', () => {
    it('should record custom metrics', () => {
      collector.recordCustomMetric('user_signup', 1, { source: 'web' });

      expect(console.debug).toHaveBeenCalledWith(
        'Custom metric recorded',
        expect.objectContaining({
          name: 'user_signup',
          value: 1,
          tags: { source: 'web' }
        })
      );
    });

    it('should record custom metrics without tags', () => {
      collector.recordCustomMetric('page_view', 1);

      expect(console.debug).toHaveBeenCalledWith(
        'Custom metric recorded',
        expect.objectContaining({
          name: 'page_view',
          value: 1,
          tags: {}
        })
      );
    });
  });

  describe('metrics summary', () => {
    beforeEach(() => {
      // Record some test data
      collector.recordRequest('/api/users', 'GET', 100, 200);
      collector.recordRequest('/api/users', 'POST', 200, 201);
      collector.recordRequest('/api/users', 'GET', 150, 500);
      collector.recordRequest('/api/posts', 'GET', 80, 200);

      collector.recordError(new Error('ValidationError'));
      collector.recordError(new Error('DatabaseError'));
      collector.recordError(new Error('ValidationError'));

      collector.recordCustomMetric('user_signup', 5);
      collector.recordCustomMetric('page_view', 100);
      collector.recordCustomMetric('user_signup', 3);
    });

    it('should calculate request metrics correctly', async () => {
      const metrics = await collector.getMetrics();

      expect(metrics.requests).toEqual({
        total: 4,
        successful: 3,
        failed: 1,
        averageResponseTime: 132.5 // (100 + 200 + 150 + 80) / 4
      });
    });

    it('should calculate error metrics correctly', async () => {
      const metrics = await collector.getMetrics();

      expect(metrics.errors).toEqual({
        total: 3,
        byType: {
          'ValidationError': 2,
          'DatabaseError': 1
        }
      });
    });

    it('should calculate custom metrics correctly', async () => {
      const metrics = await collector.getMetrics();

      expect(metrics.custom).toEqual({
        'user_signup': 8, // 5 + 3
        'page_view': 100
      });
    });

    it('should filter metrics by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const metrics = await collector.getMetrics({
        start: oneHourAgo,
        end: now
      });

      // All metrics should be included since they were just recorded
      expect(metrics.requests.total).toBe(4);
    });
  });

  describe('metrics export', () => {
    beforeEach(() => {
      collector.recordRequest('/api/test', 'GET', 100, 200);
      collector.recordRequest('/api/test', 'GET', 200, 500);
      collector.recordError(new Error('TestError'));
      collector.recordCustomMetric('test_metric', 42);
    });

    it('should export metrics as JSON by default', async () => {
      const exported = await collector.exportMetrics();
      const metrics = JSON.parse(exported);

      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('custom');
    });

    it('should export metrics in Prometheus format', async () => {
      const prometheusCollector = new BoilerplateMetricsCollector({
        ...config,
        exportFormat: 'prometheus'
      });

      prometheusCollector.recordRequest('/api/test', 'GET', 100, 200);
      prometheusCollector.recordRequest('/api/test', 'GET', 200, 500);

      const exported = await prometheusCollector.exportMetrics();

      expect(exported).toContain('# HELP http_requests_total');
      expect(exported).toContain('# TYPE http_requests_total counter');
      expect(exported).toContain('http_requests_total{status="success"} 1');
      expect(exported).toContain('http_requests_total{status="error"} 1');

      prometheusCollector.destroy();
    });
  });
});

describe('Metrics Middleware', () => {
  let collector: BoilerplateMetricsCollector;
  let middleware: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    collector = new BoilerplateMetricsCollector({
      enabled: true,
      collectInterval: 1000,
      retentionPeriod: 60000,
      exportFormat: 'json'
    });

    middleware = createMetricsMiddleware(collector);

    mockReq = {
      method: 'GET',
      url: '/api/test',
      route: { path: '/api/test' },
      path: '/api/test'
    };

    mockRes = {
      statusCode: 200,
      end: vi.fn()
    };

    mockNext = vi.fn();

    vi.spyOn(collector, 'recordRequest').mockImplementation(() => {});
  });

  afterEach(() => {
    collector.destroy();
    vi.restoreAllMocks();
  });

  it('should record request metrics on response end', () => {
    const originalEnd = mockRes.end;
    
    middleware(mockReq, mockRes, mockNext);
    
    // Simulate response end
    mockRes.end();

    expect(collector.recordRequest).toHaveBeenCalledWith(
      '/api/test',
      'GET',
      expect.any(Number),
      200
    );
  });

  it('should use route path if available', () => {
    mockReq.route = { path: '/api/users/:id' };
    
    middleware(mockReq, mockRes, mockNext);
    mockRes.end();

    expect(collector.recordRequest).toHaveBeenCalledWith(
      '/api/users/:id',
      'GET',
      expect.any(Number),
      200
    );
  });

  it('should fallback to url if no route', () => {
    delete mockReq.route;
    delete mockReq.path;
    
    middleware(mockReq, mockRes, mockNext);
    mockRes.end();

    expect(collector.recordRequest).toHaveBeenCalledWith(
      '/api/test',
      'GET',
      expect.any(Number),
      200
    );
  });

  it('should call next middleware', () => {
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});

describe('measurePerformance', () => {
  let collector: BoilerplateMetricsCollector;

  beforeEach(() => {
    collector = new BoilerplateMetricsCollector({
      enabled: true,
      collectInterval: 1000,
      retentionPeriod: 60000,
      exportFormat: 'json'
    });

    vi.spyOn(collector, 'recordCustomMetric').mockImplementation(() => {});
    vi.spyOn(collector, 'recordError').mockImplementation(() => {});
  });

  afterEach(() => {
    collector.destroy();
    vi.restoreAllMocks();
  });

  it('should measure successful operation performance', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await measurePerformance(collector, 'test_operation', operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(collector.recordCustomMetric).toHaveBeenCalledWith(
      'operation_duration_ms',
      expect.any(Number),
      {
        operation: 'test_operation',
        status: 'success'
      }
    );
  });

  it('should measure failed operation performance', async () => {
    const error = new Error('Operation failed');
    const operation = vi.fn().mockRejectedValue(error);
    
    await expect(measurePerformance(collector, 'test_operation', operation))
      .rejects.toThrow('Operation failed');

    expect(collector.recordCustomMetric).toHaveBeenCalledWith(
      'operation_duration_ms',
      expect.any(Number),
      {
        operation: 'test_operation',
        status: 'error'
      }
    );

    expect(collector.recordError).toHaveBeenCalledWith(
      error,
      { operation: 'test_operation' }
    );
  });

  it('should measure operation duration accurately', async () => {
    const operation = () => new Promise(resolve => setTimeout(resolve, 100));
    
    const startTime = Date.now();
    await measurePerformance(collector, 'test_operation', operation);
    const endTime = Date.now();

    const recordedDuration = (collector.recordCustomMetric as any).mock.calls[0][1];
    const actualDuration = endTime - startTime;

    expect(recordedDuration).toBeGreaterThanOrEqual(90);
    expect(recordedDuration).toBeLessThanOrEqual(actualDuration + 10);
  });
});