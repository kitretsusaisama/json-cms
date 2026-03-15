# Multi-Tenant Architecture

This module provides comprehensive multi-tenant support for the JSON CMS Boilerplate system. It includes tenant management, data isolation, access control, and React context providers.

## Features

- **Multiple Resolution Strategies**: Domain, subdomain, header, and path-based tenant resolution
- **Data Isolation**: Row-level security, schema isolation, and prefix-based strategies
- **Access Control**: Role-based access control with conditions and validation
- **React Integration**: Context providers, hooks, and components for tenant-aware UIs
- **Storage Backends**: In-memory, file-based, and database storage options
- **Usage Tracking**: Monitor tenant resource usage and enforce limits

## Quick Start

### 1. Initialize Tenant System

```typescript
import { initializeTenantSystem } from '@/boilerplate/tenant';

const { tenantManager, accessControl, isolationManager } = await initializeTenantSystem({
  storage: {
    type: 'file', // or 'memory', 'database'
    config: { dataDir: './data/tenants' }
  },
  isolation: {
    strategy: 'row-level' // or 'schema', 'prefix'
  }
});
```

### 2. Create a Tenant

```typescript
const tenant = await tenantManager.createTenant({
  name: 'Acme Corp',
  domain: 'acme.example.com',
  subdomain: 'acme',
  settings: {
    theme: { primaryColor: '#007bff' },
    localization: { defaultLocale: 'en', supportedLocales: ['en', 'es'] }
  },
  features: { advancedEditor: true },
  limits: { maxPages: 100, maxUsers: 10 }
});
```

### 3. Resolve Tenant from Request

```typescript
import { NextRequest } from 'next/server';

const request = new NextRequest('https://acme.example.com/dashboard');
const tenantRequest = {
  headers: Object.fromEntries(request.headers.entries()),
  hostname: new URL(request.url).hostname,
  pathname: new URL(request.url).pathname,
  query: {}
};

const tenant = await tenantManager.resolveTenant(tenantRequest);
```

### 4. Use React Context

```tsx
import { TenantProvider, useTenant, FeatureGate } from '@/boilerplate/tenant';

function App() {
  return (
    <TenantProvider tenantId="tenant123">
      <Dashboard />
    </TenantProvider>
  );
}

function Dashboard() {
  const { tenant, settings, checkFeature } = useTenant();
  
  return (
    <div style={{ color: settings.theme?.primaryColor }}>
      <h1>{tenant?.name} Dashboard</h1>
      
      <FeatureGate feature="advancedEditor">
        <AdvancedEditor />
      </FeatureGate>
    </div>
  );
}
```

## Tenant Resolution Strategies

### 1. Header-Based Resolution

```typescript
// Request with header: x-tenant-id: tenant123
const resolver = new HeaderTenantResolver('x-tenant-id');
```

### 2. Subdomain Resolution

```typescript
// Request to: acme.example.com
const resolver = new SubdomainTenantResolver('example.com');
```

### 3. Path-Based Resolution

```typescript
// Request to: /tenant/acme/dashboard
const resolver = new PathTenantResolver('/tenant');
```

### 4. Domain Mapping

```typescript
// Custom domain mapping
const resolver = new DomainTenantResolver({
  'acme.com': 'tenant123',
  'beta.com': 'tenant456'
});
```

## Data Isolation Strategies

### Row-Level Security (Default)

Adds `tenant_id` filter to all queries:

```typescript
const strategy = new RowLevelSecurityStrategy();
const manager = new DataIsolationManager(strategy);

// Query becomes: { filters: { status: 'active', tenant_id: 'tenant123' } }
const query = manager.isolateQuery({ filters: { status: 'active' } }, context);
```

### Schema Isolation

Uses separate database schemas per tenant:

```typescript
const strategy = new SchemaIsolationStrategy();
// Connects to schema: tenant_tenant123
const connectionString = strategy.getConnectionString(baseConnection, 'tenant123');
```

### Prefix Isolation

Prefixes table/collection names:

```typescript
const strategy = new PrefixIsolationStrategy();
// Collection becomes: tenant123_pages
const collectionName = strategy.getCollectionName('pages', 'tenant123');
```

## Access Control

### Define Access Rules

```typescript
import { TenantAccessControl, DefaultAccessRules } from '@/boilerplate/tenant';

const accessControl = new TenantAccessControl();

// Add global rule
accessControl.addGlobalRule({
  resource: 'pages',
  actions: ['read', 'create', 'update'],
  roles: ['editor', 'admin']
});

// Add tenant-specific rule
accessControl.addTenantRule('tenant123', {
  resource: 'analytics',
  actions: ['read'],
  roles: ['viewer'],
  conditions: [
    {
      field: 'user.email',
      operator: 'in',
      value: ['admin@acme.com', 'manager@acme.com']
    }
  ]
});
```

### Check Access

```typescript
const context = {
  tenant,
  user: { id: 'user123', role: 'editor', tenantId: 'tenant123' },
  resource: 'pages',
  action: 'create'
};

const hasAccess = await accessControl.checkAccess(context);
```

## React Hooks and Components

### useTenant Hook

```tsx
import { useTenant } from '@/boilerplate/tenant';

function MyComponent() {
  const { 
    tenant, 
    settings, 
    features, 
    limits, 
    checkFeature, 
    checkLimit 
  } = useTenant();

  const canCreatePage = await checkLimit('pages', 1);
  const hasAdvancedFeatures = checkFeature('advancedEditor');

  return (
    <div>
      <h1>{tenant?.name}</h1>
      {hasAdvancedFeatures && <AdvancedEditor />}
    </div>
  );
}
```

### Feature Gates

```tsx
import { FeatureGate, LimitGate } from '@/boilerplate/tenant';

function Dashboard() {
  return (
    <div>
      <FeatureGate feature="analytics" fallback={<div>Analytics not available</div>}>
        <AnalyticsDashboard />
      </FeatureGate>

      <LimitGate resource="pages" amount={1} fallback={<div>Page limit reached</div>}>
        <CreatePageButton />
      </LimitGate>
    </div>
  );
}
```

### Higher-Order Component

```tsx
import { withTenant } from '@/boilerplate/tenant';

const TenantAwareComponent = withTenant(MyComponent, 'tenant123');
```

## API Routes

### Tenant Management

```typescript
// GET /api/cms/tenants - List tenants
// POST /api/cms/tenants - Create tenant
// GET /api/cms/tenants/[id] - Get tenant
// PUT /api/cms/tenants/[id] - Update tenant
// DELETE /api/cms/tenants/[id] - Delete tenant

// Settings
// GET /api/cms/tenants/[id]/settings - Get settings
// PUT /api/cms/tenants/[id]/settings - Update settings

// Usage and Limits
// GET /api/cms/tenants/[id]/usage - Get usage
// POST /api/cms/tenants/[id]/usage - Update usage
// POST /api/cms/tenants/[id]/limits/check - Check limits

// Status Management
// POST /api/cms/tenants/[id]/suspend - Suspend tenant
// POST /api/cms/tenants/[id]/activate - Activate tenant
```

### Usage Example

```typescript
import { createTenantAPIRoutes } from '@/boilerplate/api/tenant-routes';

const tenantRoutes = createTenantAPIRoutes(tenantManager);
const handlers = tenantRoutes.createRouteHandler();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
```

## Storage Backends

### File Storage

```typescript
import { FileTenantStorage } from '@/boilerplate/tenant';

const storage = new FileTenantStorage('./data/tenants');
```

### In-Memory Storage

```typescript
import { InMemoryTenantStorage } from '@/boilerplate/tenant';

const storage = new InMemoryTenantStorage();
```

### Database Storage

Extend `DatabaseTenantStorage` for your database:

```typescript
import { DatabaseTenantStorage } from '@/boilerplate/tenant';

class PostgreSQLTenantStorage extends DatabaseTenantStorage {
  // Implement abstract methods
}
```

## Configuration

### Environment Variables

```bash
# Tenant resolution
BASE_DOMAIN=example.com
TENANT_STORAGE_TYPE=file
TENANT_DATA_DIR=./data/tenants

# Caching
TENANT_CACHE_ENABLED=true
TENANT_CACHE_TTL=300000

# Data isolation
TENANT_ISOLATION_STRATEGY=row-level

# Access control
TENANT_ACCESS_CONTROL_ENABLED=true
```

### Default Configuration

```typescript
import { createDefaultTenantConfig } from '@/boilerplate/tenant';

const config = createDefaultTenantConfig();
// Customize as needed
config.storage.type = 'database';
config.isolation.strategy = 'schema';
```

## Best Practices

### 1. Tenant Resolution Order

Configure resolvers in order of preference:

```typescript
const resolvers = [
  new HeaderTenantResolver('x-tenant-id'),     // API access
  new SubdomainTenantResolver('example.com'),  // Web access
  new PathTenantResolver('/tenant'),           // Shared domains
  new DomainTenantResolver(domainMap)          // Custom domains
];
```

### 2. Data Isolation

Choose the right strategy for your needs:

- **Row-Level Security**: Simple, works with existing schemas
- **Schema Isolation**: Better isolation, requires schema management
- **Prefix Isolation**: Good for NoSQL databases

### 3. Access Control

Use hierarchical roles and specific permissions:

```typescript
const roles = {
  admin: ['*:*'],
  editor: ['pages:*', 'blocks:*', 'seo:read,update'],
  viewer: ['pages:read', 'blocks:read', 'seo:read']
};
```

### 4. Performance

- Enable caching for tenant data
- Use connection pooling for database storage
- Implement lazy loading for tenant settings

### 5. Security

- Validate all tenant inputs
- Implement rate limiting per tenant
- Use audit logging for sensitive operations
- Regularly review access rules

## Testing

Run the test suite:

```bash
npm test src/boilerplate/tenant/__tests__/
```

Tests cover:
- Tenant CRUD operations
- Resolution strategies
- Data isolation
- Access control
- React components
- API routes

## Migration

### From Single-Tenant to Multi-Tenant

1. **Add tenant_id columns** to existing tables
2. **Migrate existing data** to default tenant
3. **Update queries** to include tenant isolation
4. **Configure resolution strategy**
5. **Set up access control rules**

### Example Migration Script

```typescript
// Add tenant_id to existing data
const defaultTenant = await tenantManager.createTenant({
  name: 'Default Tenant',
  subdomain: 'app'
});

// Update existing records
await db.query(`
  UPDATE pages SET tenant_id = $1 WHERE tenant_id IS NULL
`, [defaultTenant.id]);
```

## Troubleshooting

### Common Issues

1. **Tenant not resolved**: Check resolver configuration and request format
2. **Access denied**: Verify user roles and access rules
3. **Data isolation**: Ensure queries include tenant filters
4. **Performance**: Enable caching and optimize database queries

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'tenant:*';
```

### Health Checks

```typescript
// Check tenant system health
const health = await tenantManager.listTenants({ limit: 1 });
console.log('Tenant system healthy:', health.length >= 0);
```