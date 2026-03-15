# Multi-Tenant Setup Guide

Configure and deploy the JSON CMS Boilerplate for multi-tenant SaaS applications.

## Overview

Multi-tenancy allows you to serve multiple clients (tenants) from a single deployment while maintaining complete data isolation and customization per tenant.

## Tenant Resolution Strategies

### 1. Domain-Based Resolution

Each tenant has their own domain:
- `tenant1.com` → Tenant 1
- `tenant2.com` → Tenant 2

```typescript
// cms.config.js
export default {
  tenant: {
    strategy: 'domain',
    resolver: async (request) => {
      const host = request.headers.get('host');
      return await resolveTenantByDomain(host);
    }
  }
};
```

### 2. Subdomain-Based Resolution

Tenants use subdomains of your main domain:
- `tenant1.yourapp.com` → Tenant 1
- `tenant2.yourapp.com` → Tenant 2

```typescript
export default {
  tenant: {
    strategy: 'subdomain',
    resolver: async (request) => {
      const host = request.headers.get('host');
      const subdomain = host?.split('.')[0];
      return await resolveTenantBySubdomain(subdomain);
    }
  }
};
```

### 3. Path-Based Resolution

Tenants are identified by URL path:
- `yourapp.com/tenant1/...` → Tenant 1
- `yourapp.com/tenant2/...` → Tenant 2

```typescript
export default {
  tenant: {
    strategy: 'path',
    pathPrefix: true,
    resolver: async (request) => {
      const url = new URL(request.url);
      const tenantSlug = url.pathname.split('/')[1];
      return await resolveTenantBySlug(tenantSlug);
    }
  }
};
```

### 4. Header-Based Resolution

Tenants identified via custom headers (API-first approach):
- `X-Tenant-ID: tenant1` → Tenant 1
- `X-Tenant-ID: tenant2` → Tenant 2

```typescript
export default {
  tenant: {
    strategy: 'header',
    headerName: 'X-Tenant-ID',
    resolver: async (request) => {
      const tenantId = request.headers.get('X-Tenant-ID');
      return await resolveTenantById(tenantId);
    }
  }
};
```

## Database Schema Design

### Tenant Table

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  subdomain VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  suspended_at TIMESTAMP NULL
);

-- Indexes for performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### Content Tables with Tenant Isolation

```sql
-- Pages with tenant isolation
CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Row Level Security (RLS)
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON cms_pages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Blocks with tenant isolation
CREATE TABLE cms_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  block_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, block_id)
);

ALTER TABLE cms_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON cms_blocks
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## Tenant Context Implementation

### Tenant Manager

```typescript
// src/lib/tenant/tenant-manager.ts
import { NextRequest } from 'next/server';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  subdomain?: string;
  settings: TenantSettings;
  features: FeatureFlags;
  limits: TenantLimits;
  status: 'active' | 'suspended' | 'inactive';
}

export interface TenantSettings {
  theme: {
    primaryColor: string;
    logo: string;
    favicon: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
  integrations: {
    analytics?: string;
    auth?: AuthConfig;
  };
}

export class TenantManager {
  private cache = new Map<string, TenantContext>();

  async resolveTenant(request: NextRequest): Promise<TenantContext | null> {
    const strategy = process.env.TENANT_STRATEGY || 'single';
    
    switch (strategy) {
      case 'domain':
        return this.resolveByDomain(request);
      case 'subdomain':
        return this.resolveBySubdomain(request);
      case 'path':
        return this.resolveByPath(request);
      case 'header':
        return this.resolveByHeader(request);
      default:
        return this.getDefaultTenant();
    }
  }

  private async resolveByDomain(request: NextRequest): Promise<TenantContext | null> {
    const host = request.headers.get('host');
    if (!host) return null;

    // Check cache first
    if (this.cache.has(host)) {
      return this.cache.get(host)!;
    }

    // Query database
    const tenant = await this.queryTenantByDomain(host);
    if (tenant) {
      this.cache.set(host, tenant);
    }

    return tenant;
  }

  private async resolveBySubdomain(request: NextRequest): Promise<TenantContext | null> {
    const host = request.headers.get('host');
    if (!host) return null;

    const subdomain = host.split('.')[0];
    if (!subdomain || subdomain === 'www') return null;

    // Check cache
    const cacheKey = `subdomain:${subdomain}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Query database
    const tenant = await this.queryTenantBySubdomain(subdomain);
    if (tenant) {
      this.cache.set(cacheKey, tenant);
    }

    return tenant;
  }

  private async queryTenantByDomain(domain: string): Promise<TenantContext | null> {
    // Implementation depends on your database
    const result = await db.query(`
      SELECT * FROM tenants 
      WHERE domain = $1 AND status = 'active'
    `, [domain]);

    return result.rows[0] ? this.mapToTenantContext(result.rows[0]) : null;
  }

  private mapToTenantContext(row: any): TenantContext {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      domain: row.domain,
      subdomain: row.subdomain,
      settings: row.settings || {},
      features: row.features || {},
      limits: row.limits || {},
      status: row.status
    };
  }
}
```

### Middleware Integration

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { TenantManager } from '@/lib/tenant/tenant-manager';

const tenantManager = new TenantManager();

export async function middleware(request: NextRequest) {
  // Resolve tenant
  const tenant = await tenantManager.resolveTenant(request);
  
  if (!tenant) {
    // Handle tenant not found
    return new NextResponse('Tenant not found', { status: 404 });
  }

  if (tenant.status !== 'active') {
    // Handle suspended tenant
    return new NextResponse('Service unavailable', { status: 503 });
  }

  // Add tenant context to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);

  // Rewrite request with tenant context
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add tenant info to response headers (for debugging)
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-name', tenant.name);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Data Isolation Patterns

### 1. Database-Level Isolation

Use Row Level Security (RLS) in PostgreSQL:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_components ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY tenant_pages_policy ON cms_pages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_blocks_policy ON cms_blocks
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 2. Application-Level Isolation

Implement tenant filtering in your data access layer:

```typescript
// src/lib/data/tenant-aware-repository.ts
export class TenantAwareRepository {
  constructor(private tenantId: string) {}

  async getPages(filters?: PageFilters): Promise<PageData[]> {
    return db.query(`
      SELECT * FROM cms_pages 
      WHERE tenant_id = $1 
      ${filters ? this.buildFilterClause(filters) : ''}
    `, [this.tenantId]);
  }

  async createPage(pageData: CreatePageData): Promise<PageData> {
    return db.query(`
      INSERT INTO cms_pages (tenant_id, slug, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [this.tenantId, pageData.slug, pageData.title, pageData.content]);
  }
}
```

### 3. Cache Isolation

Ensure cache keys include tenant context:

```typescript
// src/lib/cache/tenant-cache.ts
export class TenantAwareCache {
  constructor(private cache: CacheManager, private tenantId: string) {}

  async get<T>(key: string): Promise<T | null> {
    const tenantKey = `tenant:${this.tenantId}:${key}`;
    return this.cache.get<T>(tenantKey);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const tenantKey = `tenant:${this.tenantId}:${key}`;
    return this.cache.set(tenantKey, value, ttl);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const tenantPattern = `tenant:${this.tenantId}:${pattern}`;
    return this.cache.invalidate(tenantPattern);
  }
}
```

## Tenant Management API

### Create Tenant

```typescript
// pages/api/admin/tenants.ts
export default async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    const { name, slug, domain, settings } = await req.json();

    // Validate tenant data
    const validation = validateTenantData({ name, slug, domain });
    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    // Create tenant
    const tenant = await createTenant({
      name,
      slug,
      domain,
      settings: {
        theme: {
          primaryColor: '#007bff',
          logo: '/default-logo.png',
          favicon: '/default-favicon.ico'
        },
        seo: {
          defaultTitle: `${name} - Powered by CMS`,
          defaultDescription: `Welcome to ${name}`
        },
        ...settings
      }
    });

    // Initialize tenant data
    await initializeTenantData(tenant.id);

    return NextResponse.json({ data: tenant });
  }
}

async function createTenant(data: CreateTenantData): Promise<TenantContext> {
  const result = await db.query(`
    INSERT INTO tenants (name, slug, domain, settings, features, limits)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    data.name,
    data.slug,
    data.domain,
    JSON.stringify(data.settings),
    JSON.stringify(getDefaultFeatures()),
    JSON.stringify(getDefaultLimits())
  ]);

  return mapToTenantContext(result.rows[0]);
}

async function initializeTenantData(tenantId: string): Promise<void> {
  // Create default pages
  await createDefaultPages(tenantId);
  
  // Create default blocks
  await createDefaultBlocks(tenantId);
  
  // Set up default SEO
  await createDefaultSEO(tenantId);
}
```

### Tenant Settings Management

```typescript
// pages/api/tenant/settings.ts
export default async function handler(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  
  if (req.method === 'GET') {
    const settings = await getTenantSettings(tenantId);
    return NextResponse.json({ data: settings });
  }

  if (req.method === 'PUT') {
    const updates = await req.json();
    const settings = await updateTenantSettings(tenantId, updates);
    
    // Invalidate tenant cache
    await invalidateTenantCache(tenantId);
    
    return NextResponse.json({ data: settings });
  }
}
```

## Feature Flags and Limits

### Feature Flags Implementation

```typescript
// src/lib/tenant/feature-flags.ts
export interface FeatureFlags {
  customDomain: boolean;
  advancedSEO: boolean;
  multiLanguage: boolean;
  customComponents: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  analytics: boolean;
  backup: boolean;
}

export class FeatureFlagManager {
  constructor(private tenant: TenantContext) {}

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.tenant.features[feature] === true;
  }

  requireFeature(feature: keyof FeatureFlags): void {
    if (!this.isEnabled(feature)) {
      throw new Error(`Feature '${feature}' is not enabled for this tenant`);
    }
  }

  async enableFeature(feature: keyof FeatureFlags): Promise<void> {
    await updateTenantFeatures(this.tenant.id, {
      ...this.tenant.features,
      [feature]: true
    });
  }
}

// Usage in API routes
export default async function handler(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  const features = new FeatureFlagManager(tenant);

  // Check if feature is enabled
  if (!features.isEnabled('apiAccess')) {
    return NextResponse.json(
      { error: 'API access not enabled for this tenant' },
      { status: 403 }
    );
  }

  // Continue with API logic...
}
```

### Usage Limits

```typescript
// src/lib/tenant/limits.ts
export interface TenantLimits {
  pages: number;
  blocks: number;
  storage: number; // in MB
  apiRequests: number; // per month
  users: number;
}

export class LimitManager {
  constructor(private tenant: TenantContext) {}

  async checkLimit(resource: keyof TenantLimits): Promise<boolean> {
    const limit = this.tenant.limits[resource];
    const current = await this.getCurrentUsage(resource);
    
    return current < limit;
  }

  async enforceLimit(resource: keyof TenantLimits): Promise<void> {
    const withinLimit = await this.checkLimit(resource);
    
    if (!withinLimit) {
      throw new Error(`${resource} limit exceeded for tenant ${this.tenant.slug}`);
    }
  }

  private async getCurrentUsage(resource: keyof TenantLimits): Promise<number> {
    switch (resource) {
      case 'pages':
        return await countTenantPages(this.tenant.id);
      case 'blocks':
        return await countTenantBlocks(this.tenant.id);
      case 'storage':
        return await calculateTenantStorage(this.tenant.id);
      case 'apiRequests':
        return await countMonthlyAPIRequests(this.tenant.id);
      case 'users':
        return await countTenantUsers(this.tenant.id);
      default:
        return 0;
    }
  }
}
```

## Deployment Strategies

### Single Database, Multiple Schemas

```typescript
// Database connection with schema switching
export class TenantAwareDatabase {
  async withTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    await this.db.raw(`SET search_path TO ${schema}, public`);
    
    try {
      return await operation();
    } finally {
      await this.db.raw('SET search_path TO public');
    }
  }
}
```

### Database Per Tenant

```typescript
// Connection manager for tenant databases
export class TenantDatabaseManager {
  private connections = new Map<string, Database>();

  async getConnection(tenantId: string): Promise<Database> {
    if (!this.connections.has(tenantId)) {
      const config = await this.getTenantDatabaseConfig(tenantId);
      const connection = createDatabaseConnection(config);
      this.connections.set(tenantId, connection);
    }

    return this.connections.get(tenantId)!;
  }

  private async getTenantDatabaseConfig(tenantId: string): Promise<DatabaseConfig> {
    // Retrieve tenant-specific database configuration
    return {
      host: process.env.DB_HOST,
      database: `tenant_${tenantId}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
  }
}
```

## Monitoring and Analytics

### Tenant-Specific Metrics

```typescript
// src/lib/monitoring/tenant-metrics.ts
export class TenantMetrics {
  async trackPageView(tenantId: string, pageSlug: string): Promise<void> {
    await this.incrementMetric(tenantId, 'page_views', {
      page: pageSlug,
      timestamp: new Date()
    });
  }

  async trackAPIRequest(tenantId: string, endpoint: string): Promise<void> {
    await this.incrementMetric(tenantId, 'api_requests', {
      endpoint,
      timestamp: new Date()
    });
  }

  async getTenantUsage(tenantId: string, period: string): Promise<UsageStats> {
    return {
      pageViews: await this.getMetric(tenantId, 'page_views', period),
      apiRequests: await this.getMetric(tenantId, 'api_requests', period),
      storage: await this.calculateStorageUsage(tenantId),
      users: await this.countActiveUsers(tenantId, period)
    };
  }
}
```

### Tenant Health Monitoring

```typescript
// src/lib/monitoring/tenant-health.ts
export class TenantHealthMonitor {
  async checkTenantHealth(tenantId: string): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabaseConnection(tenantId),
      this.checkCacheAccess(tenantId),
      this.checkStorageAccess(tenantId),
      this.checkAPIResponsiveness(tenantId)
    ]);

    return {
      status: checks.every(c => c.healthy) ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date()
    };
  }
}
```

## Security Considerations

### Tenant Isolation Validation

```typescript
// Middleware to validate tenant access
export function validateTenantAccess(requiredTenantId: string) {
  return async (req: NextRequest) => {
    const requestTenantId = req.headers.get('x-tenant-id');
    
    if (requestTenantId !== requiredTenantId) {
      throw new Error('Tenant access violation');
    }
  };
}
```

### Cross-Tenant Data Leakage Prevention

```typescript
// Audit logging for cross-tenant access attempts
export class TenantSecurityAuditor {
  async auditDataAccess(
    userId: string,
    tenantId: string,
    resource: string,
    action: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'data_access',
      userId,
      tenantId,
      resource,
      action,
      timestamp: new Date(),
      ip: this.getClientIP(),
      userAgent: this.getUserAgent()
    });
  }

  async detectAnomalousAccess(userId: string): Promise<SecurityAlert[]> {
    // Detect unusual cross-tenant access patterns
    const recentAccess = await this.getRecentAccess(userId);
    return this.analyzeAccessPatterns(recentAccess);
  }
}
```

This multi-tenant setup provides complete isolation while maintaining efficiency and scalability for SaaS deployments.