/**
 * Structured Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  BoilerplateLogger, 
  createLoggingMiddleware,
  contextStorage,
  getCurrentCorrelationId,
  getCurrentTenantId,
  getCurrentUserId,
  getCurrentRequestId
} from '../structured-logger';
import { MonitoringConfig } from '../interfaces';

describe('BoilerplateLogger', () => {
  let logger: BoilerplateLogger;
  let config: MonitoringConfig['logging'];
  let consoleSpy: any;

  beforeEach(() => {
    config = {
      level: 'DEBUG',
      format: 'json',
      outputs: ['console']
    };
    
    logger = new BoilerplateLogger(config);
    
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should log at all levels when level is DEBUG', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect log level filtering', () => {
      const warnLogger = new BoilerplateLogger({
        ...config,
        level: 'WARN'
      });

      warnLogger.debug('debug message');
      warnLogger.info('info message');
      warnLogger.warn('warn message');
      warnLogger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('log formatting', () => {
    it('should format logs as JSON when format is json', () => {
      logger.info('test message', { key: 'value' });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/)
      );

      const logCall = consoleSpy.log.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry).toMatchObject({
        level: 'INFO',
        message: 'test message',
        metadata: { key: 'value' }
      });
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.correlationId).toBeDefined();
    });

    it('should format logs as text when format is text', () => {
      const textLogger = new BoilerplateLogger({
        ...config,
        format: 'text'
      });

      textLogger.info('test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO/)
      );
    });
  });

  describe('error handling', () => {
    it('should include error details in log entry', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';

      logger.error('Error occurred', { context: 'test' }, error);

      const logCall = consoleSpy.error.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.error).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: 'Error: Test error\n    at test'
      });
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ userId: '123', tenantId: 'tenant-1' });
      
      childLogger.info('child message');

      const logCall = consoleSpy.log.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.metadata).toMatchObject({
        userId: '123',
        tenantId: 'tenant-1'
      });
    });

    it('should merge context from parent and child', () => {
      const parentLogger = new BoilerplateLogger(config, { service: 'api' });
      const childLogger = parentLogger.child({ userId: '123' });
      
      childLogger.info('message');

      const logCall = consoleSpy.log.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.metadata).toMatchObject({
        service: 'api',
        userId: '123'
      });
    });
  });

  describe('context storage', () => {
    it('should use context from async local storage', async () => {
      await contextStorage.run({
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant',
        userId: 'test-user',
        requestId: 'test-request'
      }, () => {
        logger.info('context message');
      });

      const logCall = consoleSpy.log.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.correlationId).toBe('test-correlation-id');
      expect(logEntry.tenantId).toBe('test-tenant');
      expect(logEntry.userId).toBe('test-user');
      expect(logEntry.requestId).toBe('test-request');
    });
  });
});

describe('Logging Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let logger: BoilerplateLogger;
  let middleware: any;

  beforeEach(() => {
    logger = new BoilerplateLogger({
      level: 'INFO',
      format: 'json',
      outputs: ['console']
    });

    middleware = createLoggingMiddleware(logger);

    mockReq = {
      method: 'GET',
      url: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-correlation-id': 'existing-correlation-id'
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };

    mockRes = {
      setHeader: vi.fn(),
      end: vi.fn(),
      statusCode: 200
    };

    mockNext = vi.fn();

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set correlation ID header', () => {
    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'existing-correlation-id'
    );
  });

  it('should generate correlation ID if not provided', () => {
    delete mockReq.headers['x-correlation-id'];
    
    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      expect.stringMatching(/^[0-9a-f-]{36}$/)
    );
  });

  it('should log request start and completion', () => {
    const originalEnd = mockRes.end;
    
    middleware(mockReq, mockRes, mockNext);
    
    // Simulate request completion
    mockRes.end();

    expect(console.log).toHaveBeenCalledTimes(2);
    
    // Check request start log
    const startLog = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(startLog.message).toBe('Request started');
    expect(startLog.metadata.method).toBe('GET');
    expect(startLog.metadata.url).toBe('/api/test');

    // Check request completion log
    const endLog = JSON.parse((console.log as any).mock.calls[1][0]);
    expect(endLog.message).toBe('Request completed');
    expect(endLog.metadata.statusCode).toBe(200);
    expect(endLog.metadata.duration).toBeGreaterThanOrEqual(0);
  });

  it('should call next middleware', () => {
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});

describe('Context Utilities', () => {
  it('should return undefined when no context is set', () => {
    expect(getCurrentCorrelationId()).toBeUndefined();
    expect(getCurrentTenantId()).toBeUndefined();
    expect(getCurrentUserId()).toBeUndefined();
    expect(getCurrentRequestId()).toBeUndefined();
  });

  it('should return context values when set', async () => {
    const context = {
      correlationId: 'test-correlation',
      tenantId: 'test-tenant',
      userId: 'test-user',
      requestId: 'test-request'
    };

    await contextStorage.run(context, () => {
      expect(getCurrentCorrelationId()).toBe('test-correlation');
      expect(getCurrentTenantId()).toBe('test-tenant');
      expect(getCurrentUserId()).toBe('test-user');
      expect(getCurrentRequestId()).toBe('test-request');
    });
  });
});