/**
 * In-Memory Storage Implementations
 * 
 * Simple in-memory storage implementations for development and testing.
 */

import {
  User,
  Session,
  Role,
  Permission,
  UserFilters
} from '../../interfaces/auth';
import { UserStorage } from './base-adapter';
import { SessionStorage } from '../session-manager';
import { RBACStorage } from '../rbac-manager';

/**
 * In-Memory User Storage
 */
export class MemoryUserStorage implements UserStorage {
  private users = new Map<string, User>();
  private emailIndex = new Map<string, string>(); // email -> userId

  async create(user: Omit<User, 'id'>): Promise<User> {
    const id = this.generateId();
    const newUser: User = {
      id,
      ...user
    };

    this.users.set(id, newUser);
    this.emailIndex.set(user.email, id);
    
    return newUser;
  }

  async get(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) || null : null;
  }

  async update(userId: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...data, id: userId };
    this.users.set(userId, updatedUser);

    // Update email index if email changed
    if (data.email && data.email !== user.email) {
      this.emailIndex.delete(user.email);
      this.emailIndex.set(data.email, userId);
    }

    return updatedUser;
  }

  async delete(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      this.emailIndex.delete(user.email);
    }
  }

  async list(filters?: UserFilters): Promise<User[]> {
    let users = Array.from(this.users.values());

    if (filters) {
      if (filters.tenantId) {
        users = users.filter(user => user.tenantId === filters.tenantId);
      }

      if (filters.role) {
        users = users.filter(user => user.roles.includes(filters.role!));
      }

      if (filters.status) {
        users = users.filter(user => user.status === filters.status);
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        users = users.filter(user => 
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
        );
      }

      if (filters.offset) {
        users = users.slice(filters.offset);
      }

      if (filters.limit) {
        users = users.slice(0, filters.limit);
      }
    }

    return users;
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for testing
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }

  size(): number {
    return this.users.size;
  }
}

/**
 * In-Memory Session Storage
 */
export class MemorySessionStorage implements SessionStorage {
  private sessions = new Map<string, Session>();
  private tokenIndex = new Map<string, string>(); // token -> sessionId
  private userIndex = new Map<string, string[]>(); // userId -> sessionIds[]

  async create(session: Omit<Session, 'id'>): Promise<Session> {
    const id = this.generateId();
    const newSession: Session = {
      id,
      ...session
    };

    this.sessions.set(id, newSession);
    this.tokenIndex.set(session.token, id);

    // Update user index
    const userSessions = this.userIndex.get(session.userId) || [];
    userSessions.push(id);
    this.userIndex.set(session.userId, userSessions);

    return newSession;
  }

  async get(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getByToken(token: string): Promise<Session | null> {
    const sessionId = this.tokenIndex.get(token);
    return sessionId ? this.sessions.get(sessionId) || null : null;
  }

  async update(sessionId: string, data: Partial<Session>): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = { ...session, ...data, id: sessionId };
    this.sessions.set(sessionId, updatedSession);

    // Update token index if token changed
    if (data.token && data.token !== session.token) {
      this.tokenIndex.delete(session.token);
      this.tokenIndex.set(data.token, sessionId);
    }

    return updatedSession;
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.tokenIndex.delete(session.token);

      // Update user index
      const userSessions = this.userIndex.get(session.userId) || [];
      const index = userSessions.indexOf(sessionId);
      if (index > -1) {
        userSessions.splice(index, 1);
        if (userSessions.length === 0) {
          this.userIndex.delete(session.userId);
        } else {
          this.userIndex.set(session.userId, userSessions);
        }
      }
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const sessionIds = this.userIndex.get(userId) || [];
    for (const sessionId of sessionIds) {
      await this.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.delete(sessionId);
    }
  }

  private generateId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for testing
  clear(): void {
    this.sessions.clear();
    this.tokenIndex.clear();
    this.userIndex.clear();
  }

  size(): number {
    return this.sessions.size;
  }

  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userIndex.get(userId) || [];
    return sessionIds.map(id => this.sessions.get(id)!).filter(Boolean);
  }
}

/**
 * In-Memory RBAC Storage
 */
export class MemoryRBACStorage implements RBACStorage {
  private roles = new Map<string, Role>();
  private permissions = new Map<string, Permission>();
  private userRoles = new Map<string, string[]>(); // userId -> roleIds[]
  private rolePermissions = new Map<string, string[]>(); // roleId -> permissionIds[]

  // Role operations
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const id = this.generateId('role');
    const now = new Date().toISOString();
    const newRole: Role = {
      id,
      createdAt: now,
      updatedAt: now,
      ...role
    };

    this.roles.set(id, newRole);
    return newRole;
  }

  async updateRole(roleId: string, data: Partial<Role>): Promise<Role> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Add a small delay to ensure updatedAt is different
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const updatedRole = {
      ...role,
      ...data,
      id: roleId,
      updatedAt: new Date().toISOString()
    };
    this.roles.set(roleId, updatedRole);
    return updatedRole;
  }

  async deleteRole(roleId: string): Promise<void> {
    this.roles.delete(roleId);
    this.rolePermissions.delete(roleId);
    
    // Remove role from all users
    for (const [userId, roleIds] of this.userRoles.entries()) {
      const index = roleIds.indexOf(roleId);
      if (index > -1) {
        roleIds.splice(index, 1);
        if (roleIds.length === 0) {
          this.userRoles.delete(userId);
        } else {
          this.userRoles.set(userId, roleIds);
        }
      }
    }
  }

  async getRole(roleId: string): Promise<Role | null> {
    return this.roles.get(roleId) || null;
  }

  async listRoles(tenantId?: string): Promise<Role[]> {
    let roles = Array.from(this.roles.values());
    
    if (tenantId) {
      roles = roles.filter(role => role.tenantId === tenantId);
    }
    
    return roles;
  }

  // Permission operations
  async createPermission(permission: Omit<Permission, 'id'>): Promise<Permission> {
    const id = this.generateId('perm');
    const newPermission: Permission = {
      id,
      ...permission
    };

    this.permissions.set(id, newPermission);
    return newPermission;
  }

  async updatePermission(permissionId: string, data: Partial<Permission>): Promise<Permission> {
    const permission = this.permissions.get(permissionId);
    if (!permission) {
      throw new Error('Permission not found');
    }

    const updatedPermission = { ...permission, ...data, id: permissionId };
    this.permissions.set(permissionId, updatedPermission);
    return updatedPermission;
  }

  async deletePermission(permissionId: string): Promise<void> {
    this.permissions.delete(permissionId);
    
    // Remove permission from all roles
    for (const [roleId, permissionIds] of this.rolePermissions.entries()) {
      const index = permissionIds.indexOf(permissionId);
      if (index > -1) {
        permissionIds.splice(index, 1);
        if (permissionIds.length === 0) {
          this.rolePermissions.delete(roleId);
        } else {
          this.rolePermissions.set(roleId, permissionIds);
        }
      }
    }
  }

  async getPermission(permissionId: string): Promise<Permission | null> {
    return this.permissions.get(permissionId) || null;
  }

  async listPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  // User-Role assignments
  async assignUserRole(userId: string, roleId: string, scope?: string): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(roleId)) {
      userRoles.push(roleId);
      this.userRoles.set(userId, userRoles);
    }
  }

  async removeUserRole(userId: string, roleId: string, scope?: string): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    const index = userRoles.indexOf(roleId);
    if (index > -1) {
      userRoles.splice(index, 1);
      if (userRoles.length === 0) {
        this.userRoles.delete(userId);
      } else {
        this.userRoles.set(userId, userRoles);
      }
    }
  }

  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const roleIds = this.userRoles.get(userId) || [];
    let roles = roleIds.map(id => this.roles.get(id)!).filter(Boolean);
    
    if (tenantId) {
      roles = roles.filter(role => role.tenantId === tenantId || !role.tenantId);
    }
    
    return roles;
  }

  async getUserPermissions(userId: string, tenantId?: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId, tenantId);
    const permissionSet = new Set<string>();

    for (const role of roles) {
      // Add permissions directly assigned to role (from role.permissions array)
      for (const permission of role.permissions) {
        permissionSet.add(permission);
      }
      
      // Also add permissions linked through role-permission relationships
      const rolePermissionIds = this.rolePermissions.get(role.id) || [];
      for (const permissionId of rolePermissionIds) {
        const permission = this.permissions.get(permissionId);
        if (permission) {
          permissionSet.add(permission.name);
        }
      }
    }

    return Array.from(permissionSet);
  }

  // Role-Permission assignments
  async assignRolePermission(roleId: string, permissionId: string): Promise<void> {
    const rolePermissions = this.rolePermissions.get(roleId) || [];
    if (!rolePermissions.includes(permissionId)) {
      rolePermissions.push(permissionId);
      this.rolePermissions.set(roleId, rolePermissions);
    }
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    const rolePermissions = this.rolePermissions.get(roleId) || [];
    const index = rolePermissions.indexOf(permissionId);
    if (index > -1) {
      rolePermissions.splice(index, 1);
      if (rolePermissions.length === 0) {
        this.rolePermissions.delete(roleId);
      } else {
        this.rolePermissions.set(roleId, rolePermissions);
      }
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = this.roles.get(roleId);
    if (!role) {
      return [];
    }

    const permissions: Permission[] = [];
    
    // Add permissions from role.permissions array (convert to Permission objects)
    for (const permissionName of role.permissions) {
      // Create a synthetic permission object for permissions stored as strings
      permissions.push({
        id: `synthetic_${permissionName}`,
        name: permissionName,
        description: `Permission: ${permissionName}`,
        resource: permissionName.split('.')[1] || '*',
        action: permissionName.split('.')[2] || '*',
        isSystem: true
      });
    }
    
    // Add permissions linked through role-permission relationships
    const permissionIds = this.rolePermissions.get(roleId) || [];
    for (const permissionId of permissionIds) {
      const permission = this.permissions.get(permissionId);
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for testing
  clear(): void {
    this.roles.clear();
    this.permissions.clear();
    this.userRoles.clear();
    this.rolePermissions.clear();
  }

  getRoleCount(): number {
    return this.roles.size;
  }

  getPermissionCount(): number {
    return this.permissions.size;
  }
}