/**
 * Multi-Tenant Interface
 */

export interface TenantContext {
  id: string;
  name: string;
  domain?: string;
  subdomain?: string;
  settings: TenantSettings;
  features: FeatureFlags;
  limits: TenantLimits;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'suspended' | 'inactive';
}

export interface TenantSettings {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
  };
  branding?: {
    companyName?: string;
    tagline?: string;
    footerText?: string;
  };
  localization?: {
    defaultLocale: string;
    supportedLocales: string[];
    timezone: string;
  };
  content?: {
    defaultPageTemplate?: string;
    allowedComponents?: string[];
    maxPages?: number;
    maxBlocks?: number;
  };
  security?: {
    allowedDomains?: string[];
    requireSSL?: boolean;
    enableAuditLog?: boolean;
  };
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface TenantLimits {
  maxUsers?: number;
  maxPages?: number;
  maxBlocks?: number;
  maxComponents?: number;
  maxStorage?: number; // in bytes
  maxApiRequests?: number; // per hour
  maxBandwidth?: number; // in bytes per month
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface TenantUsage {
  tenantId: string;
  period: string; // ISO date string
  metrics: {
    users: number;
    pages: number;
    blocks: number;
    components: number;
    storage: number;
    apiRequests: number;
    bandwidth: number;
  };
  updatedAt: string;
}

/**
 * Tenant Manager Interface
 */
export interface TenantManager {
  /**
   * Resolve tenant from request
   */
  resolveTenant(request: TenantRequest): Promise<TenantContext | null>;

  /**
   * Create a new tenant
   */
  createTenant(data: CreateTenantData): Promise<TenantContext>;

  /**
   * Update tenant
   */
  updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext>;

  /**
   * Delete tenant
   */
  deleteTenant(tenantId: string): Promise<void>;

  /**
   * Get tenant by ID
   */
  getTenant(tenantId: string): Promise<TenantContext | null>;

  /**
   * List all tenants
   */
  listTenants(filters?: TenantFilters): Promise<TenantContext[]>;

  /**
   * Validate tenant access
   */
  validateTenantAccess(tenantId: string, userId: string): Promise<boolean>;

  /**
   * Get tenant settings
   */
  getTenantSettings(tenantId: string): Promise<TenantSettings>;

  /**
   * Update tenant settings
   */
  updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings>;

  /**
   * Check tenant limits
   */
  checkLimits(tenantId: string, resource: string, amount: number): Promise<boolean>;

  /**
   * Get tenant usage
   */
  getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage>;

  /**
   * Update tenant usage
   */
  updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void>;

  /**
   * Suspend tenant
   */
  suspendTenant(tenantId: string, reason: string): Promise<void>;

  /**
   * Activate tenant
   */
  activateTenant(tenantId: string): Promise<void>;
}

export interface TenantRequest {
  headers: Record<string, string>;
  hostname: string;
  pathname: string;
  query: Record<string, string>;
}

export interface CreateTenantData {
  name: string;
  domain?: string;
  subdomain?: string;
  settings?: Partial<TenantSettings>;
  features?: FeatureFlags;
  limits?: Partial<TenantLimits>;
  metadata?: Record<string, unknown>;
}

export interface TenantFilters {
  status?: 'active' | 'suspended' | 'inactive';
  domain?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

/**
 * Tenant Resolution Strategies
 */
export interface TenantResolver {
  resolve(request: TenantRequest): Promise<string | null>;
}

export class DomainTenantResolver implements TenantResolver {
  private domainMap: Map<string, string>;

  constructor(domainMap: Record<string, string>) {
    this.domainMap = new Map(Object.entries(domainMap));
  }

  async resolve(request: TenantRequest): Promise<string | null> {
    return this.domainMap.get(request.hostname) || null;
  }
}

export class SubdomainTenantResolver implements TenantResolver {
  private baseDomain: string;

  constructor(baseDomain: string) {
    this.baseDomain = baseDomain;
  }

  async resolve(request: TenantRequest): Promise<string | null> {
    if (request.hostname.endsWith(this.baseDomain)) {
      const subdomain = request.hostname.replace(`.${this.baseDomain}`, '');
      return subdomain !== this.baseDomain ? subdomain : null;
    }
    return null;
  }
}

export class HeaderTenantResolver implements TenantResolver {
  private headerName: string;

  constructor(headerName = 'x-tenant-id') {
    this.headerName = headerName.toLowerCase();
  }

  async resolve(request: TenantRequest): Promise<string | null> {
    return request.headers[this.headerName] || null;
  }
}

export class PathTenantResolver implements TenantResolver {
  private pathPrefix: string;

  constructor(pathPrefix = '/tenant') {
    this.pathPrefix = pathPrefix;
  }

  async resolve(request: TenantRequest): Promise<string | null> {
    if (request.pathname.startsWith(this.pathPrefix)) {
      const segments = request.pathname.split('/');
      return segments[2] || null; // /tenant/{tenantId}/...
    }
    return null;
  }
}