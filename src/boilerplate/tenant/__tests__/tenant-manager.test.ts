/**
 * Tenant Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultTenantManager, createTenantManager } from '../tenant-manager';
import { InMemoryTenantStorage } from '../tenant-storage';
import { 
  HeaderTenantResolver, 
  SubdomainTenantResolver, 
  PathTenantResolver,
  DomainTenantResolver 
} from '../interfaces/tenant';

describe('TenantManager', () => {
  let tenantManager: DefaultTenantManager;
  let storage: InMemoryTenantStorage;

  beforeEach(() => {
    storage = new InMemoryTenantStorage();
    tenantManager = createTenantManager({ storage });
  });

  describe('Tenant CRUD Operations', () => {
    it('should create a new tenant', async () => {
      const tenantData = {
        name: 'Test Tenant',
        domain: 'test.example.com',
        settings: {
          theme: { primaryColor: '#007bff' }
        },
        features: { advancedEditor: true },
        limits: { maxPages: 100 }
      };

      const tenant = await tenantManager.createTenant(tenantData);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.domain).toBe('test.example.com');
      expect(tenant.status).toBe('active');
      expect(tenant.settings.theme?.primaryColor).toBe('#007bff');
      expect(tenant.features.advancedEditor).toBe(true);
      expect(tenant.limits.maxPages).toBe(100);
    });

    it('should get tenant by ID', async () => {
      const created = await tenantManager.createTenant({
        name: 'Test Tenant'
      });

      const retrieved = await tenantManager.getTenant(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should update tenant', async () => {
      const created = await tenantManager.createTenant({
        name: 'Test Tenant'
      });

      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const updated = await tenantManager.updateTenant(created.id, {
        name: 'Updated Tenant',
        domain: 'updated.example.com'
      });

      expect(updated.name).toBe('Updated Tenant');
      expect(updated.domain).toBe('updated.example.com');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should delete tenant', async () => {
      const created = await tenantManager.createTenant({
        name: 'Test Tenant'
      });

      await tenantManager.deleteTenant(created.id);

      const retrieved = await tenantManager.getTenant(created.id);
      expect(retrieved).toBeNull();
    });

    it('should list tenants with filters', async () => {
      await tenantManager.createTenant({ name: 'Active Tenant 1' });
      await tenantManager.createTenant({ name: 'Active Tenant 2' });
      
      const suspended = await tenantManager.createTenant({ name: 'Suspended Tenant' });
      await tenantManager.updateTenant(suspended.id, { status: 'suspended' });

      const activeTenants = await tenantManager.listTenants({ status: 'active' });
      expect(activeTenants).toHaveLength(2);

      const suspendedTenants = await tenantManager.listTenants({ status: 'suspended' });
      expect(suspendedTenants).toHaveLength(1);
    });
  });

  describe('Tenant Resolution', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await tenantManager.createTenant({
        name: 'Test Tenant',
        domain: 'test.example.com',
        subdomain: 'test'
      });
    });

    it('should resolve tenant by header', async () => {
      const request = {
        headers: { 'x-tenant-id': tenant.id },
        hostname: 'localhost',
        pathname: '/',
        query: {}
      };

      const resolved = await tenantManager.resolveTenant(request);
      expect(resolved?.id).toBe(tenant.id);
    });

    it('should resolve tenant by subdomain', async () => {
      const request = {
        headers: {},
        hostname: 'test.localhost',
        pathname: '/',
        query: {}
      };

      const resolved = await tenantManager.resolveTenant(request);
      expect(resolved?.id).toBe(tenant.id);
    });

    it('should resolve tenant by path', async () => {
      const request = {
        headers: {},
        hostname: 'localhost',
        pathname: `/tenant/${tenant.id}/dashboard`,
        query: {}
      };

      const resolved = await tenantManager.resolveTenant(request);
      expect(resolved?.id).toBe(tenant.id);
    });

    it('should return null for inactive tenant', async () => {
      await tenantManager.updateTenant(tenant.id, { status: 'suspended' });

      const request = {
        headers: { 'x-tenant-id': tenant.id },
        hostname: 'localhost',
        pathname: '/',
        query: {}
      };

      const resolved = await tenantManager.resolveTenant(request);
      expect(resolved).toBeNull();
    });
  });

  describe('Tenant Settings Management', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await tenantManager.createTenant({
        name: 'Test Tenant',
        settings: {
          theme: { primaryColor: '#007bff' },
          localization: { defaultLocale: 'en' }
        }
      });
    });

    it('should get tenant settings', async () => {
      const settings = await tenantManager.getTenantSettings(tenant.id);
      
      expect(settings.theme?.primaryColor).toBe('#007bff');
      expect(settings.localization?.defaultLocale).toBe('en');
    });

    it('should update tenant settings', async () => {
      const updatedSettings = await tenantManager.updateTenantSettings(tenant.id, {
        theme: { primaryColor: '#28a745', secondaryColor: '#6c757d' }
      });

      expect(updatedSettings.theme?.primaryColor).toBe('#28a745');
      expect(updatedSettings.theme?.secondaryColor).toBe('#6c757d');
      expect(updatedSettings.localization?.defaultLocale).toBe('en'); // Should preserve existing
    });
  });

  describe('Tenant Limits and Usage', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await tenantManager.createTenant({
        name: 'Test Tenant',
        limits: {
          maxPages: 10,
          maxUsers: 5,
          maxStorage: 1000000 // 1MB
        }
      });
    });

    it('should check limits for resources', async () => {
      // Should allow within limits
      const canAddPages = await tenantManager.checkLimits(tenant.id, 'pages', 5);
      expect(canAddPages).toBe(true);

      // Should deny exceeding limits
      const canExceedPages = await tenantManager.checkLimits(tenant.id, 'pages', 15);
      expect(canExceedPages).toBe(false);
    });

    it('should track tenant usage', async () => {
      await tenantManager.updateTenantUsage(tenant.id, {
        pages: 3,
        users: 2,
        storage: 500000
      });

      const usage = await tenantManager.getTenantUsage(tenant.id);
      
      expect(usage.metrics.pages).toBe(3);
      expect(usage.metrics.users).toBe(2);
      expect(usage.metrics.storage).toBe(500000);
    });

    it('should check limits against current usage', async () => {
      // Set current usage
      await tenantManager.updateTenantUsage(tenant.id, {
        pages: 8
      });

      // Should allow adding 2 more pages (8 + 2 = 10, within limit)
      const canAdd2 = await tenantManager.checkLimits(tenant.id, 'pages', 2);
      expect(canAdd2).toBe(true);

      // Should deny adding 3 more pages (8 + 3 = 11, exceeds limit of 10)
      const canAdd3 = await tenantManager.checkLimits(tenant.id, 'pages', 3);
      expect(canAdd3).toBe(false);
    });
  });

  describe('Tenant Status Management', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await tenantManager.createTenant({
        name: 'Test Tenant'
      });
    });

    it('should suspend tenant', async () => {
      await tenantManager.suspendTenant(tenant.id, 'Payment overdue');

      const updated = await tenantManager.getTenant(tenant.id);
      expect(updated?.status).toBe('suspended');
      expect(updated?.metadata.suspensionReason).toBe('Payment overdue');
      expect(updated?.metadata.suspendedAt).toBeDefined();
    });

    it('should activate suspended tenant', async () => {
      await tenantManager.suspendTenant(tenant.id, 'Test suspension');
      await tenantManager.activateTenant(tenant.id);

      const updated = await tenantManager.getTenant(tenant.id);
      expect(updated?.status).toBe('active');
      expect(updated?.metadata.suspensionReason).toBeUndefined();
      expect(updated?.metadata.suspendedAt).toBeUndefined();
    });
  });

  describe('Domain and Subdomain Validation', () => {
    it('should prevent duplicate domains', async () => {
      await tenantManager.createTenant({
        name: 'First Tenant',
        domain: 'example.com'
      });

      await expect(
        tenantManager.createTenant({
          name: 'Second Tenant',
          domain: 'example.com'
        })
      ).rejects.toThrow('Domain example.com is already in use');
    });

    it('should prevent duplicate subdomains', async () => {
      await tenantManager.createTenant({
        name: 'First Tenant',
        subdomain: 'test'
      });

      await expect(
        tenantManager.createTenant({
          name: 'Second Tenant',
          subdomain: 'test'
        })
      ).rejects.toThrow('Subdomain test is already in use');
    });

    it('should allow updating to same domain/subdomain', async () => {
      const tenant = await tenantManager.createTenant({
        name: 'Test Tenant',
        domain: 'example.com',
        subdomain: 'test'
      });

      // Should not throw error when updating with same values
      await expect(
        tenantManager.updateTenant(tenant.id, {
          domain: 'example.com',
          subdomain: 'test'
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Tenant Access Validation', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await tenantManager.createTenant({
        name: 'Test Tenant'
      });
    });

    it('should validate tenant access for user', async () => {
      const hasAccess = await tenantManager.validateTenantAccess(tenant.id, 'user123');
      expect(hasAccess).toBe(true); // Currently returns true for active tenants
    });

    it('should deny access for inactive tenant', async () => {
      await tenantManager.updateTenant(tenant.id, { status: 'inactive' });
      
      const hasAccess = await tenantManager.validateTenantAccess(tenant.id, 'user123');
      expect(hasAccess).toBe(false);
    });

    it('should deny access for non-existent tenant', async () => {
      const hasAccess = await tenantManager.validateTenantAccess('non-existent', 'user123');
      expect(hasAccess).toBe(false);
    });
  });
});