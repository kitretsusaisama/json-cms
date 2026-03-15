/**
 * Role-Based Access Control (RBAC) Manager
 * 
 * Manages roles, permissions, and access control logic.
 */

import {
  Role,
  Permission,
  PermissionCondition,
  RBACManager as IRBACManager
} from '../interfaces/auth';

export interface RBACStorage {
  // Role operations
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  updateRole(roleId: string, data: Partial<Role>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;
  getRole(roleId: string): Promise<Role | null>;
  listRoles(tenantId?: string): Promise<Role[]>;

  // Permission operations
  createPermission(permission: Omit<Permission, 'id'>): Promise<Permission>;
  updatePermission(permissionId: string, data: Partial<Permission>): Promise<Permission>;
  deletePermission(permissionId: string): Promise<void>;
  getPermission(permissionId: string): Promise<Permission | null>;
  listPermissions(): Promise<Permission[]>;

  // User-Role assignments
  assignUserRole(userId: string, roleId: string, scope?: string): Promise<void>;
  removeUserRole(userId: string, roleId: string, scope?: string): Promise<void>;
  getUserRoles(userId: string, tenantId?: string): Promise<Role[]>;
  getUserPermissions(userId: string, tenantId?: string): Promise<string[]>;

  // Role-Permission assignments
  assignRolePermission(roleId: string, permissionId: string): Promise<void>;
  removeRolePermission(roleId: string, permissionId: string): Promise<void>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
}

export class RBACManager implements IRBACManager {
  private storage: RBACStorage;
  private permissionCache = new Map<string, Permission>();
  private roleCache = new Map<string, Role>();

  constructor(storage: RBACStorage) {
    this.storage = storage;
  }

  /**
   * Define a new role
   */
  async defineRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const createdRole = await this.storage.createRole(role);
    this.roleCache.set(createdRole.id, createdRole);
    return createdRole;
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, data: Partial<Role>): Promise<Role> {
    const updatedRole = await this.storage.updateRole(roleId, data);
    this.roleCache.set(roleId, updatedRole);
    return updatedRole;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    await this.storage.deleteRole(roleId);
    this.roleCache.delete(roleId);
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role | null> {
    if (this.roleCache.has(roleId)) {
      return this.roleCache.get(roleId)!;
    }

    const role = await this.storage.getRole(roleId);
    if (role) {
      this.roleCache.set(roleId, role);
    }
    return role;
  }

  /**
   * List roles
   */
  async listRoles(tenantId?: string): Promise<Role[]> {
    return this.storage.listRoles(tenantId);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, scope?: string): Promise<void> {
    // Validate role exists
    const role = await this.getRole(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    await this.storage.assignUserRole(userId, roleId, scope);
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, scope?: string): Promise<void> {
    await this.storage.removeUserRole(userId, roleId, scope);
  }

  /**
   * Check if user has permission
   */
  async checkPermission(
    userId: string,
    permission: string,
    context?: unknown
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check if this permission has conditions defined
      const allPermissions = await this.listPermissions();
      const permissionDef = allPermissions.find(p => p.name === permission);
      const hasConditions = permissionDef && permissionDef.conditions && permissionDef.conditions.length > 0;
      
      // If permission has conditions, only allow with valid context
      if (hasConditions) {
        if (!context) {
          return false; // Conditional permissions require context
        }
        
        if (userPermissions.includes(permission)) {
          return this.evaluateConditions(permissionDef!.conditions!, context);
        }
        return false;
      }
      
      // For non-conditional permissions, check normally
      // Check direct permission match
      if (userPermissions.includes(permission)) {
        return true;
      }

      // Check wildcard permissions
      for (const userPerm of userPermissions) {
        if (this.matchesWildcard(userPerm, permission)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<string[]> {
    return this.storage.getUserPermissions(userId, tenantId);
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    return this.storage.getUserRoles(userId, tenantId);
  }

  /**
   * Define permission
   */
  async definePermission(permission: Omit<Permission, 'id'>): Promise<Permission> {
    const createdPermission = await this.storage.createPermission(permission);
    this.permissionCache.set(createdPermission.id, createdPermission);
    return createdPermission;
  }

  /**
   * Update permission
   */
  async updatePermission(
    permissionId: string,
    data: Partial<Permission>
  ): Promise<Permission> {
    const updatedPermission = await this.storage.updatePermission(permissionId, data);
    this.permissionCache.set(permissionId, updatedPermission);
    return updatedPermission;
  }

  /**
   * Delete permission
   */
  async deletePermission(permissionId: string): Promise<void> {
    await this.storage.deletePermission(permissionId);
    this.permissionCache.delete(permissionId);
  }

  /**
   * List permissions
   */
  async listPermissions(): Promise<Permission[]> {
    return this.storage.listPermissions();
  }

  /**
   * Check role permission
   */
  async checkRolePermission(roleId: string, permission: string): Promise<boolean> {
    const rolePermissions = await this.storage.getRolePermissions(roleId);
    return rolePermissions.some(p => 
      p.name === permission || this.matchesWildcard(p.name, permission)
    );
  }

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaults(tenantId?: string): Promise<void> {
    // Create default permissions
    const defaultPermissions = [
      {
        name: 'cms.pages.read',
        description: 'Read pages',
        resource: 'pages',
        action: 'read',
        isSystem: true
      },
      {
        name: 'cms.pages.write',
        description: 'Create and update pages',
        resource: 'pages',
        action: 'write',
        isSystem: true
      },
      {
        name: 'cms.pages.delete',
        description: 'Delete pages',
        resource: 'pages',
        action: 'delete',
        isSystem: true
      },
      {
        name: 'cms.blocks.read',
        description: 'Read blocks',
        resource: 'blocks',
        action: 'read',
        isSystem: true
      },
      {
        name: 'cms.blocks.write',
        description: 'Create and update blocks',
        resource: 'blocks',
        action: 'write',
        isSystem: true
      },
      {
        name: '*',
        description: 'Full access wildcard',
        resource: '*',
        action: '*',
        isSystem: true
      },
      {
        name: 'cms.*',
        description: 'Full CMS access',
        resource: 'cms',
        action: '*',
        isSystem: true
      }
    ];

    for (const perm of defaultPermissions) {
      try {
        await this.definePermission(perm);
      } catch (error) {
        // Permission might already exist
        console.warn(`Permission ${perm.name} already exists`);
      }
    }

    // Create default roles
    const defaultRoles = [
      {
        name: 'viewer',
        description: 'Can view content',
        permissions: ['cms.pages.read', 'cms.blocks.read'],
        tenantId,
        isSystem: true
      },
      {
        name: 'editor',
        description: 'Can edit content',
        permissions: ['cms.pages.read', 'cms.pages.write', 'cms.blocks.read', 'cms.blocks.write'],
        tenantId,
        isSystem: true
      },
      {
        name: 'admin',
        description: 'Full access',
        permissions: ['*'],
        tenantId,
        isSystem: true
      }
    ];

    for (const role of defaultRoles) {
      try {
        await this.defineRole(role);
      } catch (error) {
        // Role might already exist
        console.warn(`Role ${role.name} already exists`);
      }
    }
  }

  /**
   * Check if permission matches wildcard pattern
   */
  private matchesWildcard(pattern: string, permission: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return pattern === permission;

    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*') + '$'
    );
    return regex.test(permission);
  }

  /**
   * Check conditional permissions
   * Returns null if no conditional permissions found, boolean otherwise
   */
  private async checkConditionalPermissions(
    userPermissions: string[],
    permission: string,
    context: unknown
  ): Promise<boolean | null> {
    // Get all permissions with conditions
    const allPermissions = await this.listPermissions();
    const conditionalPermissions = allPermissions.filter(p => 
      p.conditions && p.conditions.length > 0 &&
      p.name === permission
    );

    // If no conditional permissions found for this exact permission, return null
    if (conditionalPermissions.length === 0) {
      return null;
    }

    // Check if user has any of the conditional permissions
    for (const perm of conditionalPermissions) {
      if (userPermissions.includes(perm.name)) {
        return this.evaluateConditions(perm.conditions!, context);
      }
    }

    return false;
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: PermissionCondition[],
    context: unknown
  ): boolean {
    if (!context || typeof context !== 'object') {
      return false;
    }

    return conditions.every(condition => {
      const contextValue = (context as any)[condition.field];
      
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
        default:
          return false;
      }
    });
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
  }
}