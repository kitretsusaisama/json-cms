/**
 * Tenant Storage Implementations
 * 
 * Provides storage backends for tenant data management.
 */

import { 
  TenantContext, 
  CreateTenantData, 
  TenantFilters, 
  TenantUsage 
} from '../interfaces/tenant';
import { TenantStorage } from './tenant-manager';

/**
 * In-memory tenant storage (for development/testing)
 */
export class InMemoryTenantStorage implements TenantStorage {
  private tenants: Map<string, TenantContext> = new Map();
  private usage: Map<string, Map<string, TenantUsage>> = new Map();

  async getTenant(tenantId: string): Promise<TenantContext | null> {
    return this.tenants.get(tenantId) || null;
  }

  async createTenant(data: CreateTenantData): Promise<TenantContext> {
    const tenant: TenantContext = {
      id: this.generateId(),
      name: data.name,
      domain: data.domain,
      subdomain: data.subdomain,
      settings: data.settings || {},
      features: data.features || {},
      limits: data.limits || {},
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext> {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updated: TenantContext = {
      ...existing,
      ...data,
      id: tenantId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    this.tenants.set(tenantId, updated);
    return updated;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    this.tenants.delete(tenantId);
    this.usage.delete(tenantId);
  }

  async listTenants(filters?: TenantFilters): Promise<TenantContext[]> {
    let tenants = Array.from(this.tenants.values());

    if (filters) {
      if (filters.status) {
        tenants = tenants.filter(t => t.status === filters.status);
      }
      if (filters.domain) {
        tenants = tenants.filter(t => t.domain === filters.domain);
      }
      if (filters.createdAfter) {
        tenants = tenants.filter(t => t.createdAt >= filters.createdAfter!);
      }
      if (filters.createdBefore) {
        tenants = tenants.filter(t => t.createdAt <= filters.createdBefore!);
      }
      if (filters.offset) {
        tenants = tenants.slice(filters.offset);
      }
      if (filters.limit) {
        tenants = tenants.slice(0, filters.limit);
      }
    }

    return tenants;
  }

  async getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | null> {
    const currentPeriod = period || new Date().toISOString().substring(0, 7);
    const tenantUsage = this.usage.get(tenantId);
    return tenantUsage?.get(currentPeriod) || null;
  }

  async updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void> {
    const currentPeriod = new Date().toISOString().substring(0, 7);
    
    if (!this.usage.has(tenantId)) {
      this.usage.set(tenantId, new Map());
    }

    const tenantUsage = this.usage.get(tenantId)!;
    const existing = tenantUsage.get(currentPeriod);

    const usage: TenantUsage = {
      tenantId,
      period: currentPeriod,
      metrics: {
        users: 0,
        pages: 0,
        blocks: 0,
        components: 0,
        storage: 0,
        apiRequests: 0,
        bandwidth: 0,
        ...existing?.metrics,
        ...metrics
      },
      updatedAt: new Date().toISOString()
    };

    tenantUsage.set(currentPeriod, usage);
  }

  private generateId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * File-based tenant storage
 */
export class FileTenantStorage implements TenantStorage {
  private dataDir: string;
  private tenantsFile: string;
  private usageFile: string;

  constructor(dataDir: string = './data/tenants') {
    this.dataDir = dataDir;
    this.tenantsFile = `${dataDir}/tenants.json`;
    this.usageFile = `${dataDir}/usage.json`;
  }

  async getTenant(tenantId: string): Promise<TenantContext | null> {
    const tenants = await this.loadTenants();
    return tenants.find(t => t.id === tenantId) || null;
  }

  async createTenant(data: CreateTenantData): Promise<TenantContext> {
    const tenants = await this.loadTenants();
    
    const tenant: TenantContext = {
      id: this.generateId(),
      name: data.name,
      domain: data.domain,
      subdomain: data.subdomain,
      settings: data.settings || {},
      features: data.features || {},
      limits: data.limits || {},
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    tenants.push(tenant);
    await this.saveTenants(tenants);
    return tenant;
  }

  async updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext> {
    const tenants = await this.loadTenants();
    const index = tenants.findIndex(t => t.id === tenantId);
    
    if (index === -1) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updated: TenantContext = {
      ...tenants[index],
      ...data,
      id: tenantId,
      updatedAt: new Date().toISOString()
    };

    tenants[index] = updated;
    await this.saveTenants(tenants);
    return updated;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenants = await this.loadTenants();
    const filtered = tenants.filter(t => t.id !== tenantId);
    await this.saveTenants(filtered);
  }

  async listTenants(filters?: TenantFilters): Promise<TenantContext[]> {
    let tenants = await this.loadTenants();

    if (filters) {
      if (filters.status) {
        tenants = tenants.filter(t => t.status === filters.status);
      }
      if (filters.domain) {
        tenants = tenants.filter(t => t.domain === filters.domain);
      }
      if (filters.createdAfter) {
        tenants = tenants.filter(t => t.createdAt >= filters.createdAfter!);
      }
      if (filters.createdBefore) {
        tenants = tenants.filter(t => t.createdAt <= filters.createdBefore!);
      }
      if (filters.offset) {
        tenants = tenants.slice(filters.offset);
      }
      if (filters.limit) {
        tenants = tenants.slice(0, filters.limit);
      }
    }

    return tenants;
  }

  async getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | null> {
    const currentPeriod = period || new Date().toISOString().substring(0, 7);
    const usage = await this.loadUsage();
    return usage.find(u => u.tenantId === tenantId && u.period === currentPeriod) || null;
  }

  async updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void> {
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const usage = await this.loadUsage();
    
    const existingIndex = usage.findIndex(u => u.tenantId === tenantId && u.period === currentPeriod);
    
    const usageRecord: TenantUsage = {
      tenantId,
      period: currentPeriod,
      metrics: {
        users: 0,
        pages: 0,
        blocks: 0,
        components: 0,
        storage: 0,
        apiRequests: 0,
        bandwidth: 0,
        ...(existingIndex >= 0 ? usage[existingIndex].metrics : {}),
        ...metrics
      },
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      usage[existingIndex] = usageRecord;
    } else {
      usage.push(usageRecord);
    }

    await this.saveUsage(usage);
  }

  private async loadTenants(): Promise<TenantContext[]> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.tenantsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      return [];
    }
  }

  private async saveTenants(tenants: TenantContext[]): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.tenantsFile, JSON.stringify(tenants, null, 2));
  }

  private async loadUsage(): Promise<TenantUsage[]> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.usageFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveUsage(usage: TenantUsage[]): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.usageFile, JSON.stringify(usage, null, 2));
  }

  private generateId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Database tenant storage (abstract base class)
 */
export abstract class DatabaseTenantStorage implements TenantStorage {
  abstract getTenant(tenantId: string): Promise<TenantContext | null>;
  abstract createTenant(data: CreateTenantData): Promise<TenantContext>;
  abstract updateTenant(tenantId: string, data: Partial<TenantContext>): Promise<TenantContext>;
  abstract deleteTenant(tenantId: string): Promise<void>;
  abstract listTenants(filters?: TenantFilters): Promise<TenantContext[]>;
  abstract getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | null>;
  abstract updateTenantUsage(tenantId: string, metrics: Partial<TenantUsage['metrics']>): Promise<void>;

  protected generateId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected buildWhereClause(filters?: TenantFilters): { where: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.domain) {
      conditions.push(`domain = $${paramIndex++}`);
      params.push(filters.domain);
    }

    if (filters?.createdAfter) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.createdAfter);
    }

    if (filters?.createdBefore) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.createdBefore);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }
}

/**
 * Factory function to create tenant storage
 */
export function createTenantStorage(type: 'memory' | 'file' | 'database', config?: any): TenantStorage {
  switch (type) {
    case 'memory':
      return new InMemoryTenantStorage();
    case 'file':
      return new FileTenantStorage(config?.dataDir);
    case 'database':
      throw new Error('Database storage requires specific implementation (PostgreSQL, MongoDB, etc.)');
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}