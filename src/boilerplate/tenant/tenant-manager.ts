/**
 * Multi-Tenant Manager Implementation
 * 
 * Provides comprehensive tenant management with multiple resolution strategies,
 * data isolation, and access control mechanisms.
 */

import { NextRequest } from 'next/server';
import {
  TenantManager,
  TenantContext,
  TenantRequest,
  CreateTenantData,
  TenantFilters,
  TenantSettings,
  TenantUsage,
  TenantResolver,
  DomainTenantResolver,
  SubdomainTenantResolver,
  HeaderTenantResolver,
  PathTenantResolver,
  FeatureFlags,
  TenantLimits
} from '../interfaces/tenant';

export interface TenantManagerConfig {
  resolvers: TenantResolver[];
  defaultTenant?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  storage: TenantStorage;
}

export interface TenantStorage {
  getTenant(tenantId: string): Promise<TenantContext | null>;
  createTenant(data: CreateTenantData): Promise<TenantContext>;
  updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext>;
  deleteTenant(tenantId: string): Promise<void>;
  listTenants(filters?: TenantFilters): Promise<TenantContext[]>;
  getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | null>;
  updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void>;
}

export class DefaultTenantManager implements TenantManager {
  private resolvers: TenantResolver[];
  private defaultTenant?: string;
  private storage: TenantStorage;
  private cache: Map<string, { tenant: TenantContext; expires: number }>;
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(config: TenantManagerConfig) {
    this.resolvers = config.resolvers;
    this.defaultTenant = config.defaultTenant;
    this.storage = config.storage;
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTL = config.cacheTTL ?? 300000; // 5 minutes
    this.cache = new Map();
  }

  /**
   * Resolve tenant from Next.js request
   */
  async resolveTenant(request: TenantRequest): Promise<TenantContext | null> {
    // Try each resolver in order
    for (const resolver of this.resolvers) {
      try {
        const resolvedValue = await resolver.resolve(request);
        if (resolvedValue) {
          let tenant: TenantContext | null = null;
          
          // First try to get tenant by ID directly
          tenant = await this.getTenant(resolvedValue);
          
          // If not found by ID, try to find by subdomain or domain
          if (!tenant) {
            if (resolver instanceof SubdomainTenantResolver) {
              tenant = await this.findTenantBySubdomain(resolvedValue);
            } else if (resolver instanceof DomainTenantResolver) {
              tenant = await this.findTenantByDomain(resolvedValue);
            }
          }
          
          if (tenant && tenant.status === 'active') {
            return tenant;
          }
        }
      } catch (error) {
        console.warn(`Tenant resolver failed:`, error);
        continue;
      }
    }

    // Fallback to default tenant if configured
    if (this.defaultTenant) {
      return await this.getTenant(this.defaultTenant);
    }

    return null;
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantData): Promise<TenantContext> {
    // Validate required fields
    if (!data.name) {
      throw new Error('Tenant name is required');
    }

    // Check for domain/subdomain conflicts
    if (data.domain) {
      const existing = await this.findTenantByDomain(data.domain);
      if (existing) {
        throw new Error(`Domain ${data.domain} is already in use`);
      }
    }

    if (data.subdomain) {
      const existing = await this.findTenantBySubdomain(data.subdomain);
      if (existing) {
        throw new Error(`Subdomain ${data.subdomain} is already in use`);
      }
    }

    const tenant = await this.storage.createTenant(data);
    
    // Clear cache
    this.clearCache();
    
    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext> {
    const existing = await this.getTenant(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Validate domain/subdomain conflicts if being updated
    if (data.domain && data.domain !== existing.domain) {
      const conflict = await this.findTenantByDomain(data.domain);
      if (conflict && conflict.id !== tenantId) {
        throw new Error(`Domain ${data.domain} is already in use`);
      }
    }

    if (data.subdomain && data.subdomain !== existing.subdomain) {
      const conflict = await this.findTenantBySubdomain(data.subdomain);
      if (conflict && conflict.id !== tenantId) {
        throw new Error(`Subdomain ${data.subdomain} is already in use`);
      }
    }

    const updated = await this.storage.updateTenant(tenantId, data);
    
    // Clear cache for this tenant
    this.cache.delete(tenantId);
    
    return updated;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const existing = await this.getTenant(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    await this.storage.deleteTenant(tenantId);
    
    // Clear cache
    this.cache.delete(tenantId);
  }

  /**
   * Get tenant by ID with caching
   */
  async getTenant(tenantId: string): Promise<TenantContext | null> {
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.get(tenantId);
      if (cached && cached.expires > Date.now()) {
        return cached.tenant;
      }
    }

    const tenant = await this.storage.getTenant(tenantId);
    
    // Cache the result
    if (tenant && this.cacheEnabled) {
      this.cache.set(tenantId, {
        tenant,
        expires: Date.now() + this.cacheTTL
      });
    }

    return tenant;
  }

  /**
   * List all tenants
   */
  async listTenants(filters?: TenantFilters): Promise<TenantContext[]> {
    return await this.storage.listTenants(filters);
  }

  /**
   * Validate tenant access for a user
   */
  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant || tenant.status !== 'active') {
      return false;
    }

    // TODO: Implement user-tenant relationship validation
    // This would typically check a user_tenants table or similar
    // For now, we'll return true if tenant exists and is active
    return true;
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    return tenant.settings;
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updatedSettings = {
      ...tenant.settings,
      ...settings
    };

    await this.updateTenant(tenantId, { settings: updatedSettings });
    
    return updatedSettings;
  }

  /**
   * Check if tenant is within limits for a resource
   */
  async checkLimits(tenantId: string, resource: string, amount: number): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return false;
    }

    const limits = tenant.limits;
    if (!limits) {
      return true; // No limits configured
    }

    // Get current usage
    const usage = await this.getTenantUsage(tenantId);
    if (!usage) {
      return true; // No usage data, allow
    }

    switch (resource) {
      case 'users':
        return !limits.maxUsers || (usage.metrics.users + amount) <= limits.maxUsers;
      case 'pages':
        return !limits.maxPages || (usage.metrics.pages + amount) <= limits.maxPages;
      case 'blocks':
        return !limits.maxBlocks || (usage.metrics.blocks + amount) <= limits.maxBlocks;
      case 'components':
        return !limits.maxComponents || (usage.metrics.components + amount) <= limits.maxComponents;
      case 'storage':
        return !limits.maxStorage || (usage.metrics.storage + amount) <= limits.maxStorage;
      case 'apiRequests':
        return !limits.maxApiRequests || (usage.metrics.apiRequests + amount) <= limits.maxApiRequests;
      case 'bandwidth':
        return !limits.maxBandwidth || (usage.metrics.bandwidth + amount) <= limits.maxBandwidth;
      default:
        return true;
    }
  }

  /**
   * Get tenant usage
   */
  async getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage> {
    const currentPeriod = period || new Date().toISOString().substring(0, 7); // YYYY-MM
    const usage = await this.storage.getTenantUsage(tenantId, currentPeriod);
    
    if (!usage) {
      // Create default usage record
      const defaultUsage: TenantUsage = {
        tenantId,
        period: currentPeriod,
        metrics: {
          users: 0,
          pages: 0,
          blocks: 0,
          components: 0,
          storage: 0,
          apiRequests: 0,
          bandwidth: 0
        },
        updatedAt: new Date().toISOString()
      };
      
      await this.storage.updateTenantUsage(tenantId, defaultUsage.metrics);
      return defaultUsage;
    }
    
    return usage;
  }

  /**
   * Update tenant usage
   */
  async updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void> {
    await this.storage.updateTenantUsage(tenantId, metrics);
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await this.updateTenant(tenantId, { 
      status: 'suspended',
      metadata: { suspensionReason: reason, suspendedAt: new Date().toISOString() }
    });
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const metadata = { ...tenant.metadata };
    delete metadata.suspensionReason;
    delete metadata.suspendedAt;

    await this.updateTenant(tenantId, { 
      status: 'active',
      metadata
    });
  }

  /**
   * Helper method to find tenant by domain
   */
  private async findTenantByDomain(domain: string): Promise<TenantContext | null> {
    const tenants = await this.listTenants();
    return tenants.find(t => t.domain === domain) || null;
  }

  /**
   * Helper method to find tenant by subdomain
   */
  private async findTenantBySubdomain(subdomain: string): Promise<TenantContext | null> {
    const tenants = await this.listTenants();
    return tenants.find(t => t.subdomain === subdomain) || null;
  }

  /**
   * Clear all cached tenants
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Convert Next.js request to TenantRequest
   */
  static fromNextRequest(request: NextRequest): TenantRequest {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      headers,
      hostname: url.hostname,
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams.entries())
    };
  }
}

/**
 * Factory function to create tenant manager with common configurations
 */
export function createTenantManager(config: Partial<TenantManagerConfig> & { storage: TenantStorage }): DefaultTenantManager {
  const defaultResolvers = [
    new HeaderTenantResolver('x-tenant-id'),
    new SubdomainTenantResolver(process.env.BASE_DOMAIN || 'localhost'),
    new PathTenantResolver('/tenant'),
    new DomainTenantResolver({})
  ];

  return new DefaultTenantManager({
    resolvers: defaultResolvers,
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
    ...config
  });
}