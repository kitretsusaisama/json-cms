/**
 * RBAC Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RBACManager } from '../rbac-manager';
import { MemoryRBACStorage } from '../adapters/memory-storage';

describe('RBACManager', () => {
  let rbacManager: RBACManager;
  let storage: MemoryRBACStorage;

  beforeEach(async () => {
    storage = new MemoryRBACStorage();
    rbacManager = new RBACManager(storage);
    
    // Initialize default roles and permissions
    await rbacManager.initializeDefaults();
  });

  describe('role management', () => {
    it('should create role', async () => {
      const role = await rbacManager.defineRole({
        name: 'custom-role',
        description: 'Custom role for testing',
        permissions: ['custom.permission'],
        isSystem: false
      });

      expect(role.name).toBe('custom-role');
      expect(role.description).toBe('Custom role for testing');
      expect(role.permissions).toContain('custom.permission');
      expect(role.isSystem).toBe(false);
      expect(role.id).toBeDefined();
      expect(role.createdAt).toBeDefined();
    });

    it('should update role', async () => {
      const role = await rbacManager.defineRole({
        name: 'update-role',
        description: 'Role to update',
        permissions: [],
        isSystem: false
      });

      const updatedRole = await rbacManager.updateRole(role.id, {
        description: 'Updated description',
        permissions: ['new.permission']
      });

      expect(updatedRole.description).toBe('Updated description');
      expect(updatedRole.permissions).toContain('new.permission');
      expect(updatedRole.updatedAt).not.toBe(role.updatedAt);
    });

    it('should delete role', async () => {
      const role = await rbacManager.defineRole({
        name: 'delete-role',
        description: 'Role to delete',
        permissions: [],
        isSystem: false
      });

      await rbacManager.deleteRole(role.id);

      const deletedRole = await rbacManager.getRole(role.id);
      expect(deletedRole).toBeNull();
    });

    it('should list roles', async () => {
      const roles = await rbacManager.listRoles();
      
      // Should have default roles
      expect(roles.length).toBeGreaterThan(0);
      
      const roleNames = roles.map(role => role.name);
      expect(roleNames).toContain('viewer');
      expect(roleNames).toContain('editor');
      expect(roleNames).toContain('admin');
    });

    it('should list roles by tenant', async () => {
      await rbacManager.defineRole({
        name: 'tenant-role',
        description: 'Tenant specific role',
        permissions: [],
        tenantId: 'tenant-1',
        isSystem: false
      });

      const tenantRoles = await rbacManager.listRoles('tenant-1');
      const tenantRoleNames = tenantRoles.map(role => role.name);
      
      expect(tenantRoleNames).toContain('tenant-role');
    });
  });

  describe('permission management', () => {
    it('should create permission', async () => {
      const permission = await rbacManager.definePermission({
        name: 'custom.create',
        description: 'Create custom resources',
        resource: 'custom',
        action: 'create',
        isSystem: false
      });

      expect(permission.name).toBe('custom.create');
      expect(permission.resource).toBe('custom');
      expect(permission.action).toBe('create');
      expect(permission.id).toBeDefined();
    });

    it('should update permission', async () => {
      const permission = await rbacManager.definePermission({
        name: 'update.permission',
        description: 'Permission to update',
        resource: 'test',
        action: 'update',
        isSystem: false
      });

      const updatedPermission = await rbacManager.updatePermission(permission.id, {
        description: 'Updated permission description'
      });

      expect(updatedPermission.description).toBe('Updated permission description');
    });

    it('should delete permission', async () => {
      const permission = await rbacManager.definePermission({
        name: 'delete.permission',
        description: 'Permission to delete',
        resource: 'test',
        action: 'delete',
        isSystem: false
      });

      await rbacManager.deletePermission(permission.id);

      const deletedPermission = await storage.getPermission(permission.id);
      expect(deletedPermission).toBeNull();
    });

    it('should list permissions', async () => {
      const permissions = await rbacManager.listPermissions();
      
      // Should have default permissions
      expect(permissions.length).toBeGreaterThan(0);
      
      const permissionNames = permissions.map(perm => perm.name);
      expect(permissionNames).toContain('cms.pages.read');
      expect(permissionNames).toContain('cms.pages.write');
      expect(permissionNames).toContain('*');
    });
  });

  describe('user role assignments', () => {
    it('should assign role to user', async () => {
      const role = await rbacManager.defineRole({
        name: 'test-role',
        description: 'Test role',
        permissions: ['test.permission'],
        isSystem: false
      });

      await rbacManager.assignRole('user-1', role.id);

      const userRoles = await rbacManager.getUserRoles('user-1');
      const roleNames = userRoles.map(r => r.name);
      expect(roleNames).toContain('test-role');
    });

    it('should remove role from user', async () => {
      const role = await rbacManager.defineRole({
        name: 'remove-role',
        description: 'Role to remove',
        permissions: [],
        isSystem: false
      });

      await rbacManager.assignRole('user-2', role.id);
      
      let userRoles = await rbacManager.getUserRoles('user-2');
      expect(userRoles.map(r => r.name)).toContain('remove-role');

      await rbacManager.removeRole('user-2', role.id);
      
      userRoles = await rbacManager.getUserRoles('user-2');
      expect(userRoles.map(r => r.name)).not.toContain('remove-role');
    });

    it('should get user permissions from roles', async () => {
      // Assign editor role to user
      const roles = await rbacManager.listRoles();
      const editorRole = roles.find(role => role.name === 'editor');
      expect(editorRole).toBeDefined();

      await rbacManager.assignRole('user-3', editorRole!.id);

      const permissions = await rbacManager.getUserPermissions('user-3');
      expect(permissions).toContain('cms.pages.read');
      expect(permissions).toContain('cms.pages.write');
      expect(permissions).toContain('cms.blocks.read');
      expect(permissions).toContain('cms.blocks.write');
    });
  });

  describe('permission checking', () => {
    beforeEach(async () => {
      // Set up test user with editor role
      const roles = await rbacManager.listRoles();
      const editorRole = roles.find(role => role.name === 'editor');
      await rbacManager.assignRole('test-user', editorRole!.id);
    });

    it('should check exact permission match', async () => {
      const hasPermission = await rbacManager.checkPermission(
        'test-user',
        'cms.pages.read'
      );
      expect(hasPermission).toBe(true);

      const noPermission = await rbacManager.checkPermission(
        'test-user',
        'cms.admin'
      );
      expect(noPermission).toBe(false);
    });

    it('should check wildcard permissions', async () => {
      // Assign admin role which has cms.admin (maps to *)
      const roles = await rbacManager.listRoles();
      const adminRole = roles.find(role => role.name === 'admin');
      await rbacManager.assignRole('admin-user', adminRole!.id);

      const hasWildcardPermission = await rbacManager.checkPermission(
        'admin-user',
        'cms.pages.delete'
      );
      expect(hasWildcardPermission).toBe(true);

      const hasAnyPermission = await rbacManager.checkPermission(
        'admin-user',
        'custom.permission'
      );
      expect(hasAnyPermission).toBe(true);
    });

    it('should check role permissions', async () => {
      const roles = await rbacManager.listRoles();
      const editorRole = roles.find(role => role.name === 'editor');
      
      const hasPermission = await rbacManager.checkRolePermission(
        editorRole!.id,
        'cms.pages.write'
      );
      expect(hasPermission).toBe(true);

      const noPermission = await rbacManager.checkRolePermission(
        editorRole!.id,
        'cms.admin'
      );
      expect(noPermission).toBe(false);
    });
  });

  describe('conditional permissions', () => {
    it('should evaluate permission conditions', async () => {
      // Create permission with conditions
      const permission = await rbacManager.definePermission({
        name: 'conditional.access',
        description: 'Conditional access permission',
        resource: 'content',
        action: 'read',
        conditions: [
          {
            field: 'tenantId',
            operator: 'equals',
            value: 'tenant-1'
          }
        ],
        isSystem: false
      });

      // Create role with conditional permission
      const role = await rbacManager.defineRole({
        name: 'conditional-role',
        description: 'Role with conditional permissions',
        permissions: [permission.name],
        isSystem: false
      });

      await rbacManager.assignRole('conditional-user', role.id);

      // Check permission with matching context
      const hasPermissionWithContext = await rbacManager.checkPermission(
        'conditional-user',
        'conditional.access',
        { tenantId: 'tenant-1' }
      );
      expect(hasPermissionWithContext).toBe(true);

      // Check permission with non-matching context
      const noPermissionWithContext = await rbacManager.checkPermission(
        'conditional-user',
        'conditional.access',
        { tenantId: 'tenant-2' }
      );
      expect(noPermissionWithContext).toBe(false);

      // Check permission without context (should fail because it's conditional)
      const noPermissionWithoutContext = await rbacManager.checkPermission(
        'conditional-user',
        'conditional.access'
      );
      expect(noPermissionWithoutContext).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear caches', () => {
      // This is mainly for coverage - the cache clearing doesn't throw
      expect(() => rbacManager.clearCache()).not.toThrow();
    });
  });
});