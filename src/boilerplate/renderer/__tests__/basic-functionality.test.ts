/**
 * Basic Functionality Tests for Enhanced Renderer
 */

import { describe, it, expect } from 'vitest';
import { createHookData } from '../plugin-hooks';
import { TenantContext } from '../../interfaces/tenant';
import { AuthContext } from '../../interfaces/auth';

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

describe('Enhanced Renderer Basic Functionality', () => {
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

    it('should handle minimal data', () => {
      const hookData = createHookData('after-render', 'simple-page', {});
      
      expect(hookData.phase).toBe('after-render');
      expect(hookData.slug).toBe('simple-page');
      expect(hookData.ctx).toEqual({});
      expect(hookData.tenantContext).toBeUndefined();
      expect(hookData.authContext).toBeUndefined();
      expect(hookData.timestamp).toBeDefined();
    });
  });

  describe('Tenant Context Validation', () => {
    it('should validate tenant context structure', () => {
      expect(mockTenantContext.id).toBe('tenant-1');
      expect(mockTenantContext.name).toBe('Test Tenant');
      expect(mockTenantContext.status).toBe('active');
      expect(mockTenantContext.settings.localization.defaultLocale).toBe('en');
    });

    it('should validate auth context structure', () => {
      expect(mockAuthContext.user?.id).toBe('user-1');
      expect(mockAuthContext.roles).toContain('editor');
      expect(mockAuthContext.permissions).toContain('content.read');
    });
  });

  describe('Interface Compatibility', () => {
    it('should have compatible tenant context interface', () => {
      const tenant: TenantContext = mockTenantContext;
      expect(tenant).toBeDefined();
      expect(typeof tenant.id).toBe('string');
      expect(typeof tenant.name).toBe('string');
      expect(typeof tenant.status).toBe('string');
    });

    it('should have compatible auth context interface', () => {
      const auth: AuthContext = mockAuthContext;
      expect(auth).toBeDefined();
      expect(auth.user).toBeDefined();
      expect(Array.isArray(auth.roles)).toBe(true);
      expect(Array.isArray(auth.permissions)).toBe(true);
    });
  });
});