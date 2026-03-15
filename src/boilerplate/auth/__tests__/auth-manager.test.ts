/**
 * Auth Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager } from '../auth-manager';
import { RBACManager } from '../rbac-manager';
import { SessionManager } from '../session-manager';
import { JWTUtils } from '../jwt-utils';
import { JWTAdapter } from '../adapters/jwt-adapter';
import {
  MemoryUserStorage,
  MemorySessionStorage,
  MemoryRBACStorage
} from '../adapters/memory-storage';

describe('AuthManager', () => {
  let authManager: AuthManager;
  let userStorage: MemoryUserStorage;
  let sessionStorage: MemorySessionStorage;
  let rbacStorage: MemoryRBACStorage;

  beforeEach(async () => {
    // Setup storage
    userStorage = new MemoryUserStorage();
    sessionStorage = new MemorySessionStorage();
    rbacStorage = new MemoryRBACStorage();

    // Setup JWT utils
    const jwtUtils = new JWTUtils({
      secret: 'test-secret',
      algorithm: 'HS256',
      defaultExpiresIn: 3600
    });

    // Setup session manager
    const sessionManager = new SessionManager({
      storage: sessionStorage,
      jwtUtils,
      sessionTTL: 3600,
      enableRefreshTokens: true
    });

    // Setup RBAC manager
    const rbacManager = new RBACManager(rbacStorage);

    // Setup auth adapter
    const authAdapter = new JWTAdapter(
      {
        secret: 'test-secret',
        algorithm: 'HS256',
        expiresIn: '1h',
        allowRegistration: true
      },
      userStorage,
      sessionManager
    );

    // Setup auth manager
    authManager = new AuthManager({
      adapter: authAdapter,
      sessionManager,
      rbacManager,
      sessionCookieName: 'test-session'
    });

    // Initialize default roles and permissions
    await rbacManager.initializeDefaults();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid email/password', async () => {
      const result = await authManager.authenticate({
        type: 'email',
        identifier: 'test@example.com',
        password: 'password123',
        metadata: { name: 'Test User' }
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.session).toBeDefined();
    });

    it('should fail authentication with invalid password', async () => {
      // First create a user
      await authManager.authenticate({
        type: 'email',
        identifier: 'test@example.com',
        password: 'password123',
        metadata: { name: 'Test User' }
      });

      // Try to authenticate with wrong password
      const result = await authManager.authenticate({
        type: 'email',
        identifier: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should authenticate user with valid token', async () => {
      // First create a user and get session
      const createResult = await authManager.authenticate({
        type: 'email',
        identifier: 'test@example.com',
        password: 'password123',
        metadata: { name: 'Test User' }
      });

      expect(createResult.success).toBe(true);
      const token = createResult.session!.token;

      // Authenticate with token
      const result = await authManager.authenticate({
        type: 'token',
        identifier: '',
        token
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });
  });

  describe('user management', () => {
    it('should create user', async () => {
      const user = await authManager.createUser({
        email: 'new@example.com',
        name: 'New User',
        roles: ['editor']
      });

      expect(user.email).toBe('new@example.com');
      expect(user.name).toBe('New User');
      expect(user.roles).toContain('editor');
      expect(user.status).toBe('active');
    });

    it('should update user', async () => {
      const user = await authManager.createUser({
        email: 'update@example.com',
        name: 'Update User'
      });

      const updatedUser = await authManager.updateUser(user.id, {
        name: 'Updated Name',
        roles: ['admin']
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.roles).toContain('admin');
    });

    it('should delete user and sessions', async () => {
      // Create user and session
      const result = await authManager.authenticate({
        type: 'email',
        identifier: 'delete@example.com',
        password: 'password123',
        metadata: { name: 'Delete User' }
      });

      expect(result.success).toBe(true);
      const userId = result.user!.id;
      const sessionId = result.session!.id;

      // Verify session exists
      const session = await authManager.validateSession(result.session!.token);
      expect(session).toBeDefined();

      // Delete user
      await authManager.deleteUser(userId);

      // Verify user is deleted
      const deletedUser = await authManager.getAdapter().getUser(userId);
      expect(deletedUser).toBeNull();

      // Verify session is destroyed
      const deletedSession = await authManager.validateSession(result.session!.token);
      expect(deletedSession).toBeNull();
    });

    it('should list users with filters', async () => {
      // Create test users
      await authManager.createUser({
        email: 'user1@example.com',
        name: 'User One',
        roles: ['viewer']
      });

      await authManager.createUser({
        email: 'user2@example.com',
        name: 'User Two',
        roles: ['editor']
      });

      // List all users
      const allUsers = await authManager.listUsers();
      expect(allUsers.length).toBe(2);

      // Filter by role
      const editors = await authManager.listUsers({ role: 'editor' });
      expect(editors.length).toBe(1);
      expect(editors[0].email).toBe('user2@example.com');

      // Search by name
      const searchResults = await authManager.listUsers({ search: 'One' });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].name).toBe('User One');
    });
  });

  describe('session management', () => {
    it('should create and validate session', async () => {
      const user = await authManager.createUser({
        email: 'session@example.com',
        name: 'Session User'
      });

      const session = await authManager.createSession(user, {
        loginMethod: 'test'
      });

      expect(session.userId).toBe(user.id);
      expect(session.metadata.loginMethod).toBe('test');

      const validatedSession = await authManager.validateSession(session.token);
      expect(validatedSession).toBeDefined();
      expect(validatedSession!.id).toBe(session.id);
    });

    it('should refresh session', async () => {
      const user = await authManager.createUser({
        email: 'refresh@example.com',
        name: 'Refresh User'
      });

      const session = await authManager.createSession(user);
      expect(session.refreshToken).toBeDefined();

      const refreshedSession = await authManager.refreshSession(session.refreshToken!);
      expect(refreshedSession).toBeDefined();
      expect(refreshedSession!.userId).toBe(user.id);
      expect(refreshedSession!.token).not.toBe(session.token);
    });

    it('should destroy session', async () => {
      const user = await authManager.createUser({
        email: 'destroy@example.com',
        name: 'Destroy User'
      });

      const session = await authManager.createSession(user);
      
      // Verify session exists
      const validSession = await authManager.validateSession(session.token);
      expect(validSession).toBeDefined();

      // Destroy session
      await authManager.destroySession(session.id);

      // Verify session is destroyed
      const destroyedSession = await authManager.validateSession(session.token);
      expect(destroyedSession).toBeNull();
    });
  });

  describe('permission checking', () => {
    it('should check user permissions', async () => {
      const user = await authManager.createUser({
        email: 'perm@example.com',
        name: 'Permission User',
        roles: ['editor']
      });

      const hasReadPermission = await authManager.checkPermission(
        user.id,
        'cms.pages.read'
      );
      expect(hasReadPermission).toBe(true);

      const hasWritePermission = await authManager.checkPermission(
        user.id,
        'cms.pages.write'
      );
      expect(hasWritePermission).toBe(true);

      const hasAdminPermission = await authManager.checkPermission(
        user.id,
        '*'
      );
      expect(hasAdminPermission).toBe(false);
    });

    it('should check auth context permissions', async () => {
      const user = await authManager.createUser({
        email: 'context@example.com',
        name: 'Context User',
        roles: ['admin']
      });

      const session = await authManager.createSession(user);
      const rbacManager = authManager.getRBACManager();
      
      const authContext = {
        user,
        session,
        tenantId: user.tenantId,
        permissions: await rbacManager.getUserPermissions(user.id),
        roles: (await rbacManager.getUserRoles(user.id)).map(role => role.name)
      };

      const hasAdminPermission = await authManager.checkContextPermission(
        authContext,
        '*'
      );
      expect(hasAdminPermission).toBe(true);

      const hasCustomPermission = await authManager.checkContextPermission(
        authContext,
        'custom.permission'
      );
      expect(hasCustomPermission).toBe(false);
    });
  });
});