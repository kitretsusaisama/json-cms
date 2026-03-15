/**
 * Authentication and Authorization Interface
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface Session {
  id: string;
  userId: string;
  tenantId?: string;
  token: string;
  refreshToken?: string;
  expiresAt: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  redirectUrl?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  tenantId?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  isSystem: boolean;
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: unknown;
}

export interface AuthContext {
  user?: User;
  session?: Session;
  tenantId?: string;
  permissions: string[];
  roles: string[];
}

/**
 * Authentication Adapter Interface
 */
export interface AuthAdapter {
  /**
   * Authenticate user with credentials
   */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /**
   * Validate session token
   */
  validateSession(token: string): Promise<Session | null>;

  /**
   * Refresh session token
   */
  refreshSession(refreshToken: string): Promise<Session | null>;

  /**
   * Create new session
   */
  createSession(user: User, metadata?: Record<string, unknown>): Promise<Session>;

  /**
   * Destroy session
   */
  destroySession(sessionId: string): Promise<void>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<User | null>;

  /**
   * Update user
   */
  updateUser(userId: string, data: Partial<User>): Promise<User>;

  /**
   * Create user
   */
  createUser(data: CreateUserData): Promise<User>;

  /**
   * Delete user
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * List users
   */
  listUsers(filters?: UserFilters): Promise<User[]>;
}

export interface AuthCredentials {
  type: 'email' | 'username' | 'phone' | 'oauth' | 'token';
  identifier: string;
  password?: string;
  token?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateUserData {
  email: string;
  name: string;
  password?: string;
  roles?: string[];
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface UserFilters {
  tenantId?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * RBAC Manager Interface
 */
export interface RBACManager {
  /**
   * Define a new role
   */
  defineRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;

  /**
   * Update role
   */
  updateRole(roleId: string, data: Partial<Role>): Promise<Role>;

  /**
   * Delete role
   */
  deleteRole(roleId: string): Promise<void>;

  /**
   * Get role by ID
   */
  getRole(roleId: string): Promise<Role | null>;

  /**
   * List roles
   */
  listRoles(tenantId?: string): Promise<Role[]>;

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string, scope?: string): Promise<void>;

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string, scope?: string): Promise<void>;

  /**
   * Check if user has permission
   */
  checkPermission(userId: string, permission: string, context?: unknown): Promise<boolean>;

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string, tenantId?: string): Promise<string[]>;

  /**
   * Get user roles
   */
  getUserRoles(userId: string, tenantId?: string): Promise<Role[]>;

  /**
   * Define permission
   */
  definePermission(permission: Omit<Permission, 'id'>): Promise<Permission>;

  /**
   * Update permission
   */
  updatePermission(permissionId: string, data: Partial<Permission>): Promise<Permission>;

  /**
   * Delete permission
   */
  deletePermission(permissionId: string): Promise<void>;

  /**
   * List permissions
   */
  listPermissions(): Promise<Permission[]>;

  /**
   * Check role permission
   */
  checkRolePermission(roleId: string, permission: string): Promise<boolean>;
}

/**
 * Auth Provider Adapters
 */
export interface NextAuthAdapter extends AuthAdapter {
  getNextAuthConfig(): any;
}

export interface Auth0Adapter extends AuthAdapter {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export interface ClerkAdapter extends AuthAdapter {
  publishableKey: string;
  secretKey: string;
}

export interface JWTAdapter extends AuthAdapter {
  secret: string;
  algorithm: string;
  expiresIn: string;
}

/**
 * Auth Middleware
 */
export interface AuthMiddleware {
  /**
   * Require authentication
   */
  requireAuth(options?: AuthMiddlewareOptions): (req: any, res: any, next: any) => Promise<void>;

  /**
   * Require specific permission
   */
  requirePermission(permission: string, options?: AuthMiddlewareOptions): (req: any, res: any, next: any) => Promise<void>;

  /**
   * Require specific role
   */
  requireRole(role: string, options?: AuthMiddlewareOptions): (req: any, res: any, next: any) => Promise<void>;

  /**
   * Optional authentication
   */
  optionalAuth(options?: AuthMiddlewareOptions): (req: any, res: any, next: any) => Promise<void>;
}

export interface AuthMiddlewareOptions {
  redirectUrl?: string;
  errorMessage?: string;
  skipPaths?: string[];
  tenantRequired?: boolean;
}