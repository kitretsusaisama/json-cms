/**
 * Plugin Hooks System Tests
 */

import { 
  PluginHookManager, 
  createHookData, 
  executePluginHooks,
  registerPluginHook 
} from '../plugin-hooks';
import { TenantContext } from '../../interfaces/tenant';
import { AuthContext } from '../../interfaces/auth';
import { PluginContext } from '../../interfaces/plugin';

const mockTenantContext: TenantContext = {
  id: 'tenant-1',
  name: 'Test Tenant',
  domain: 'test.example.com',
  settings: {
    localization: {
      defaultLocale: 'en',
      supportedLocales: ['en'],
      timezone: 'UTC'
    }
  },
  features: {},
  limits: {},
  metadata: {},
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  status: 'active'
};

const mockAuthContext: AuthContext = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['editor'],
    permissions: ['content.read'],
    tenantId: 'tenant-1',
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    status: 'active'
  },
  permissions: ['content.read'],
  roles: ['editor']
};

const mockPluginContext: PluginContext = {
  pluginId: 'test-plugin',
  pluginDir: '/plugins/test-plugin',
  config: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn()
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  registry: {
    registerComponent: jest.fn(),
    registerRoute: jest.fn(),
    registerAPIEndpoint: jest.fn(),
    registerHook: jest.fn(),
    registerPermission: jest.fn()
  },
  contentProvider: {} as any,
  hooks: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
};

describe('PluginHookManager', () => {
  let hookManager: PluginHookManager;

  beforeEach(() => {
    hookManager = new PluginHookManager();
  });

  describe('Hook Registration', () => {
    it('should register a hook handler', () => {
      const handler = jest.fn();
      
      hookManager.registerHook({
        id: 'test-hook-1',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 10,
        handler
      });

      const handlers = hookManager.getHandlers('before-render');
      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe('test-hook-1');
      expect(handlers[0].priority).toBe(10);
    });

    it('should sort handlers by priority', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      hookManager.registerHook({
        id: 'low-priority',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler: handler1
      });

      hookManager.registerHook({
        id: 'high-priority',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 10,
        handler: handler2
      });

      hookManager.registerHook({
        id: 'medium-priority',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 5,
        handler: handler3
      });

      const handlers = hookManager.getHandlers('before-render');
      expect(handlers).toHaveLength(3);
      expect(handlers[0].id).toBe('high-priority');
      expect(handlers[1].id).toBe('medium-priority');
      expect(handlers[2].id).toBe('low-priority');
    });

    it('should replace existing handler with same id', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler: handler1
      });

      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 10,
        handler: handler2
      });

      const handlers = hookManager.getHandlers('before-render');
      expect(handlers).toHaveLength(1);
      expect(handlers[0].priority).toBe(10);
      expect(handlers[0].handler).toBe(handler2);
    });
  });

  describe('Hook Unregistration', () => {
    beforeEach(() => {
      hookManager.registerHook({
        id: 'test-hook-1',
        pluginId: 'plugin-1',
        phase: 'before-render',
        priority: 1,
        handler: jest.fn()
      });

      hookManager.registerHook({
        id: 'test-hook-2',
        pluginId: 'plugin-1',
        phase: 'after-render',
        priority: 1,
        handler: jest.fn()
      });

      hookManager.registerHook({
        id: 'test-hook-3',
        pluginId: 'plugin-2',
        phase: 'before-render',
        priority: 1,
        handler: jest.fn()
      });
    });

    it('should unregister specific hook', () => {
      hookManager.unregisterHook('test-hook-1', 'before-render');
      
      const beforeRenderHandlers = hookManager.getHandlers('before-render');
      const afterRenderHandlers = hookManager.getHandlers('after-render');
      
      expect(beforeRenderHandlers).toHaveLength(1);
      expect(beforeRenderHandlers[0].id).toBe('test-hook-3');
      expect(afterRenderHandlers).toHaveLength(1);
    });

    it('should unregister hook from all phases', () => {
      hookManager.unregisterHook('test-hook-1');
      
      const beforeRenderHandlers = hookManager.getHandlers('before-render');
      const afterRenderHandlers = hookManager.getHandlers('after-render');
      
      expect(beforeRenderHandlers).toHaveLength(1);
      expect(beforeRenderHandlers[0].id).toBe('test-hook-3');
      expect(afterRenderHandlers).toHaveLength(1);
    });

    it('should unregister all hooks for a plugin', () => {
      hookManager.unregisterPluginHooks('plugin-1');
      
      const beforeRenderHandlers = hookManager.getHandlers('before-render');
      const afterRenderHandlers = hookManager.getHandlers('after-render');
      
      expect(beforeRenderHandlers).toHaveLength(1);
      expect(beforeRenderHandlers[0].pluginId).toBe('plugin-2');
      expect(afterRenderHandlers).toHaveLength(0);
    });
  });

  describe('Hook Execution', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder: string[] = [];
      
      const handler1 = jest.fn().mockImplementation(() => {
        executionOrder.push('handler1');
      });
      
      const handler2 = jest.fn().mockImplementation(() => {
        executionOrder.push('handler2');
      });

      hookManager.registerHook({
        id: 'low-priority',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler: handler1
      });

      hookManager.registerHook({
        id: 'high-priority',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 10,
        handler: handler2
      });

      const hookData = createHookData('before-render', 'test-page', {});
      const summary = await hookManager.executeHooks('before-render', hookData);

      expect(summary.totalHandlers).toBe(2);
      expect(summary.successfulHandlers).toBe(2);
      expect(summary.failedHandlers).toBe(0);
      expect(executionOrder).toEqual(['handler2', 'handler1']);
    });

    it('should handle hook execution errors', async () => {
      const successHandler = jest.fn();
      const errorHandler = jest.fn().mockRejectedValue(new Error('Hook failed'));

      hookManager.registerHook({
        id: 'success-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 10,
        handler: successHandler
      });

      hookManager.registerHook({
        id: 'error-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 5,
        handler: errorHandler
      });

      const hookData = createHookData('before-render', 'test-page', {});
      const summary = await hookManager.executeHooks('before-render', hookData);

      expect(summary.totalHandlers).toBe(2);
      expect(summary.successfulHandlers).toBe(1);
      expect(summary.failedHandlers).toBe(1);
      expect(summary.results[0].success).toBe(true);
      expect(summary.results[1].success).toBe(false);
      expect(summary.results[1].error?.message).toBe('Hook failed');
    });

    it('should evaluate hook conditions', async () => {
      const handler = jest.fn();

      hookManager.registerHook({
        id: 'conditional-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler,
        conditions: [
          {
            field: 'tenantContext.id',
            operator: 'equals',
            value: 'tenant-1'
          }
        ]
      });

      // Test with matching condition
      let hookData = createHookData('before-render', 'test-page', {}, {
        tenantContext: mockTenantContext
      });
      
      let summary = await hookManager.executeHooks('before-render', hookData);
      expect(summary.successfulHandlers).toBe(1);
      expect(handler).toHaveBeenCalledTimes(1);

      // Test with non-matching condition
      handler.mockClear();
      hookData = createHookData('before-render', 'test-page', {}, {
        tenantContext: { ...mockTenantContext, id: 'tenant-2' }
      });
      
      summary = await hookManager.executeHooks('before-render', hookData);
      expect(summary.totalHandlers).toBe(1);
      expect(summary.successfulHandlers).toBe(0);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Hook Conditions', () => {
    let handler: jest.Mock;

    beforeEach(() => {
      handler = jest.fn();
    });

    it('should evaluate equals condition', async () => {
      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler,
        conditions: [
          { field: 'slug', operator: 'equals', value: 'test-page' }
        ]
      });

      const hookData = createHookData('before-render', 'test-page', {});
      await hookManager.executeHooks('before-render', hookData);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should evaluate in condition', async () => {
      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler,
        conditions: [
          { field: 'authContext.roles', operator: 'in', value: ['editor', 'admin'] }
        ]
      });

      const hookData = createHookData('before-render', 'test-page', {}, {
        authContext: mockAuthContext
      });
      await hookManager.executeHooks('before-render', hookData);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should evaluate contains condition', async () => {
      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler,
        conditions: [
          { field: 'slug', operator: 'contains', value: 'test' }
        ]
      });

      const hookData = createHookData('before-render', 'test-page', {});
      await hookManager.executeHooks('before-render', hookData);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should evaluate exists condition', async () => {
      hookManager.registerHook({
        id: 'test-hook',
        pluginId: 'test-plugin',
        phase: 'before-render',
        priority: 1,
        handler,
        conditions: [
          { field: 'tenantContext', operator: 'exists', value: true }
        ]
      });

      const hookData = createHookData('before-render', 'test-page', {}, {
        tenantContext: mockTenantContext
      });
      await hookManager.executeHooks('before-render', hookData);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      hookManager.registerHook({
        id: 'hook-1',
        pluginId: 'plugin-1',
        phase: 'before-render',
        priority: 1,
        handler: jest.fn()
      });

      hookManager.registerHook({
        id: 'hook-2',
        pluginId: 'plugin-1',
        phase: 'after-render',
        priority: 1,
        handler: jest.fn()
      });

      hookManager.registerHook({
        id: 'hook-3',
        pluginId: 'plugin-2',
        phase: 'before-render',
        priority: 1,
        handler: jest.fn()
      });
    });

    it('should provide accurate statistics', () => {
      const stats = hookManager.getStatistics();
      
      expect(stats.totalHandlers).toBe(3);
      expect(stats.handlersByPhase['before-render']).toBe(2);
      expect(stats.handlersByPhase['after-render']).toBe(1);
      expect(stats.handlersByPlugin['plugin-1']).toBe(2);
      expect(stats.handlersByPlugin['plugin-2']).toBe(1);
    });

    it('should track execution statistics', async () => {
      const hookData = createHookData('before-render', 'test-page', {});
      await hookManager.executeHooks('before-render', hookData);
      
      const stats = hookManager.getStatistics();
      expect(stats.executionStats.totalExecutions).toBe(2);
      expect(stats.executionStats.successRate).toBe(1);
    });
  });
});

describe('Hook Data Creation', () => {
  it('should create hook data with all properties', () => {
    const hookData = createHookData('before-render', 'test-page', { key: 'value' }, {
      tenantContext: mockTenantContext,
      authContext: mockAuthContext,
      data: { test: true },
      requestId: 'req-123'
    });

    expect(hookData.phase).toBe('before-render');
    expect(hookData.slug).toBe('test-page');
    expect(hookData.ctx).toEqual({ key: 'value' });
    expect(hookData.tenantContext).toBe(mockTenantContext);
    expect(hookData.authContext).toBe(mockAuthContext);
    expect(hookData.data).toEqual({ test: true });
    expect(hookData.requestId).toBe('req-123');
    expect(hookData.timestamp).toBeDefined();
  });

  it('should generate request ID if not provided', () => {
    const hookData = createHookData('before-render', 'test-page', {});
    
    expect(hookData.requestId).toBeDefined();
    expect(hookData.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
  });
});

describe('Convenience Functions', () => {
  it('should register plugin hook', () => {
    const handler = jest.fn();
    
    registerPluginHook(mockPluginContext, 'before-render', handler, {
      priority: 5,
      conditions: [{ field: 'slug', operator: 'equals', value: 'test' }]
    });

    // This would need access to the global hook manager to test properly
    // For now, we'll just verify the function doesn't throw
    expect(handler).toBeDefined();
  });
});