# Design Document

## Overview

The JSON CMS Boilerplate System is a comprehensive, plug-and-play solution that transforms any Next.js application into a content management system. The system is built around a layered architecture that provides API-driven content management, component registration, multi-tenant support, and seamless migration capabilities from JSON files to database storage.

The design leverages the existing JsonRendererV2 architecture found in the current codebase while extending it into a complete boilerplate system that can be integrated into any Next.js project with minimal configuration.

## Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js Pages] --> B[PageRenderer]
        B --> C[Component Registry]
        C --> D[React Components]
    end
    
    subgraph "API Bridge Layer"
        E[/api/cms/*] --> F[Content Provider Interface]
        F --> G[File Provider]
        F --> H[Database Provider]
    end
    
    subgraph "Content Management Layer"
        I[JSON Schemas] --> J[Content Validation]
        J --> K[SEO Manager]
        J --> L[Plugin System]
    end
    
    subgraph "Infrastructure Layer"
        M[Caching Layer] --> N[Security Middleware]
        N --> O[Multi-Tenant Context]
        O --> P[Migration System]
    end
    
    A --> E
    B --> I
    E --> M
```

### Core Principles

1. **API-First Design**: All content flows through standardized API endpoints
2. **Provider Pattern**: Pluggable storage backends (file system, database)
3. **Component Registry**: Dynamic component mapping with validation
4. **Multi-Tenant Ready**: Built-in tenant isolation and context management
5. **Security by Default**: Input sanitization, rate limiting, and audit logging
6. **Migration-Friendly**: Clear path from JSON files to database storage

## Components and Interfaces

### 1. Repository Scanner

**Purpose**: Analyze existing Next.js projects for compatibility and integration planning.

**Interface**:
```typescript
interface RepositoryScanner {
  scanProject(projectPath: string): Promise<ScanReport>;
  detectConflicts(report: ScanReport): ConflictAnalysis;
  generateRecommendations(conflicts: ConflictAnalysis): Recommendation[];
}

interface ScanReport {
  nextjsVersion: string;
  hasTypeScript: boolean;
  cssStrategy: CSSStrategy[];
  routes: RouteInfo[];
  dependencies: DependencyInfo[];
  thirdPartyIntegrations: Integration[];
}
```

**Implementation Strategy**:
- Parse package.json for dependencies and scripts
- Analyze file structure for routing patterns
- Detect CSS frameworks and global styles
- Identify potential naming conflicts

### 2. API Bridge System

**Purpose**: Provide standardized API layer for all content operations with pluggable storage backends.

**Interface**:
```typescript
interface ContentProvider {
  getPage(slug: string, context: RequestContext): Promise<PageData>;
  getBlock(id: string, context: RequestContext): Promise<BlockData>;
  getSEO(type: string, id: string): Promise<SEOData>;
  setContent(type: ContentType, id: string, data: unknown): Promise<void>;
  deleteContent(type: ContentType, id: string): Promise<void>;
  listContent(type: ContentType, filters?: ContentFilters): Promise<ContentList>;
}

interface APIEnvelope<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    cacheKey?: string;
    tenant?: string;
  };
  errors?: APIError[];
  warnings?: string[];
}
```

**File Provider Implementation**:
- Extends existing file-based system in `src/lib/compose/resolve.ts`
- Maintains compatibility with current JSON structure
- Implements atomic file operations with backup/rollback

**Database Provider Interface**:
- Abstract interface for database operations
- Support for PostgreSQL, MongoDB, and SQLite
- Connection pooling and transaction management

### 3. Enhanced Component Registry

**Purpose**: Extend the existing component registry with plugin support and dynamic loading.

**Current State Analysis**:
The existing `src/components/registry.tsx` provides basic component mapping. The boilerplate will extend this with:

**Enhanced Interface**:
```typescript
interface ComponentRegistry {
  register(key: string, component: ComponentDefinition): void;
  unregister(key: string): void;
  get(key: string): ComponentDefinition | null;
  list(): ComponentDefinition[];
  validate(key: string, props: unknown): ValidationResult;
  loadDynamic(key: string): Promise<ComponentDefinition>;
}

interface ComponentDefinition {
  component: React.ComponentType<any>;
  schema?: ZodSchema;
  metadata: ComponentMetadata;
  lazy?: boolean;
}

interface ComponentMetadata {
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  slots?: SlotDefinition[];
  variants?: VariantDefinition[];
}
```

**Implementation Strategy**:
- Extend existing registry with metadata and validation
- Add plugin-based component registration
- Implement lazy loading for performance
- Maintain backward compatibility with current registry

### 4. Enhanced PageRenderer

**Purpose**: Extend the existing JsonRendererV2 with boilerplate-specific features.

**Current State Analysis**:
The existing `JsonRendererV2` in `src/components/renderer/JsonRendererV2.tsx` provides:
- Constraint satisfaction planning
- Component rendering with validation
- Error handling and fallbacks
- Debug mode support

**Enhanced Features**:
```typescript
interface EnhancedPageRenderer extends JsonRendererV2Props {
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  cacheStrategy?: CacheStrategy;
  pluginContext?: PluginContext;
}

interface TenantContext {
  tenantId: string;
  domain: string;
  settings: TenantSettings;
}
```

**Implementation Strategy**:
- Wrap existing JsonRendererV2 with boilerplate features
- Add tenant-aware content loading
- Implement plugin hook system
- Maintain API compatibility

### 5. SEO Management System

**Purpose**: Extend existing SEO system with centralized management and API integration.

**Current State Analysis**:
The existing SEO system in `src/app/api/seo/[type]/[id]/route.ts` provides:
- CRUD operations for SEO data
- Validation and sanitization
- Audit logging

**Enhanced Features**:
```typescript
interface SEOManager {
  generateMetadata(pageData: PageData, context: RequestContext): Promise<Metadata>;
  validateSEO(seoData: SEOData): ValidationResult;
  generateStructuredData(pageData: PageData): StructuredData[];
  optimizeForSearch(content: string): SEOOptimization;
}

interface SEOOptimization {
  suggestions: SEOSuggestion[];
  score: number;
  issues: SEOIssue[];
}
```

### 6. CSS Isolation System

**Purpose**: Prevent style conflicts when integrating with existing projects.

**Interface**:
```typescript
interface CSSIsolationStrategy {
  detectGlobalStyles(projectPath: string): GlobalStyleInfo[];
  generateNamespacing(componentName: string): string;
  wrapComponent(component: React.ComponentType, namespace: string): React.ComponentType;
  validateIsolation(component: React.ComponentType): IsolationReport;
}

interface GlobalStyleInfo {
  file: string;
  selectors: string[];
  conflicts: string[];
  framework?: 'tailwind' | 'bootstrap' | 'custom';
}
```

**Implementation Strategies**:
1. **CSS Modules**: Default strategy for new components
2. **CSS-in-JS**: Emotion/styled-jsx for dynamic styling
3. **Namespace Prefixing**: Automatic prefixing for global styles
4. **Shadow DOM**: Isolation for complex components (optional)

### 7. Plugin System

**Purpose**: Enable extensibility without modifying core code.

**Interface**:
```typescript
interface Plugin {
  manifest: PluginManifest;
  install(context: PluginContext): Promise<void>;
  uninstall(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies: string[];
  components?: ComponentRegistration[];
  routes?: RouteRegistration[];
  apiEndpoints?: APIEndpointRegistration[];
  migrations?: MigrationRegistration[];
}
```

**Plugin Types**:
1. **Component Plugins**: Add new UI components
2. **Data Plugins**: Add new content sources
3. **Integration Plugins**: Third-party service integrations
4. **Workflow Plugins**: Custom content workflows

### 8. Multi-Tenant Architecture

**Purpose**: Support multiple tenants with data isolation.

**Interface**:
```typescript
interface TenantManager {
  resolveTenant(request: NextRequest): Promise<TenantContext>;
  isolateData(tenantId: string, operation: DataOperation): Promise<unknown>;
  validateTenantAccess(tenantId: string, userId: string): Promise<boolean>;
  getTenantSettings(tenantId: string): Promise<TenantSettings>;
}

interface TenantContext {
  id: string;
  domain: string;
  subdomain?: string;
  settings: TenantSettings;
  features: FeatureFlags;
  limits: TenantLimits;
}
```

**Tenant Resolution Strategies**:
1. **Domain-based**: Different domains per tenant
2. **Subdomain-based**: Subdomains for tenant identification
3. **Header-based**: Custom headers for API access
4. **Path-based**: URL path prefixes

### 9. Authentication and Authorization

**Purpose**: Provide pluggable auth with RBAC support.

**Interface**:
```typescript
interface AuthAdapter {
  authenticate(request: NextRequest): Promise<AuthResult>;
  authorize(user: User, resource: string, action: string): Promise<boolean>;
  getUser(userId: string): Promise<User>;
  createSession(user: User): Promise<Session>;
  validateSession(sessionId: string): Promise<Session | null>;
}

interface RBACManager {
  defineRole(role: Role): Promise<void>;
  assignRole(userId: string, roleId: string, scope?: string): Promise<void>;
  checkPermission(userId: string, permission: string, context?: unknown): Promise<boolean>;
}
```

**Supported Auth Providers**:
- NextAuth.js integration
- Auth0 adapter
- Clerk adapter
- Custom JWT implementation
- Session-based authentication

### 10. Caching and Performance

**Purpose**: Optimize content delivery and API performance.

**Interface**:
```typescript
interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

interface PerformanceMonitor {
  trackPageLoad(pageId: string, metrics: PageMetrics): Promise<void>;
  trackAPICall(endpoint: string, duration: number): Promise<void>;
  getInsights(timeRange: TimeRange): Promise<PerformanceInsights>;
}
```

**Caching Strategies**:
1. **In-Memory**: Fast access for frequently used data
2. **Redis**: Distributed caching for multi-instance deployments
3. **CDN**: Static asset and page caching
4. **Database Query**: Query result caching

### 11. Migration System

**Purpose**: Seamless transition from JSON files to database storage.

**Interface**:
```typescript
interface MigrationManager {
  planMigration(source: ContentSource, target: ContentSource): Promise<MigrationPlan>;
  executeMigration(plan: MigrationPlan): Promise<MigrationResult>;
  rollbackMigration(migrationId: string): Promise<void>;
  validateMigration(migrationId: string): Promise<ValidationResult>;
}

interface MigrationPlan {
  id: string;
  source: ContentSource;
  target: ContentSource;
  steps: MigrationStep[];
  estimatedDuration: number;
  risks: MigrationRisk[];
}
```

**Migration Phases**:
1. **Analysis**: Scan existing JSON files and structure
2. **Schema Generation**: Create database schema from JSON structure
3. **Data Transfer**: Batch transfer with validation
4. **Verification**: Ensure data integrity and completeness
5. **Cutover**: Switch API endpoints to database provider

### 12. CLI Tools

**Purpose**: Provide developer-friendly command-line interface.

**Interface**:
```typescript
interface CLIManager {
  scan(projectPath: string): Promise<void>;
  init(projectPath: string, options: InitOptions): Promise<void>;
  generate(type: GenerationType, options: GenerateOptions): Promise<void>;
  migrate(options: MigrateOptions): Promise<void>;
  validate(options: ValidateOptions): Promise<void>;
}
```

**CLI Commands**:
- `boilerplate scan` - Analyze project compatibility
- `boilerplate init` - Initialize CMS integration
- `boilerplate generate page|component|plugin` - Scaffold new content
- `boilerplate migrate` - Execute database migration
- `boilerplate validate` - Validate content and schemas

## Data Models

### Core Content Models

```typescript
// Extend existing PageV2 from src/types/composer.ts
interface CMSPage extends PageV2 {
  tenantId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  metadata: PageMetadata;
}

interface CMSBlock extends Block {
  tenantId?: string;
  category: string;
  tags: string[];
  usage: BlockUsage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CMSComponent {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  props: ComponentProps;
  schema: JSONSchema;
  metadata: ComponentMetadata;
  tenantId?: string;
}
```

### Database Schema Design

```sql
-- Pages table
CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  UNIQUE(tenant_id, slug)
);

-- Blocks table
CREATE TABLE cms_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  block_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content JSONB NOT NULL,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, block_id)
);

-- SEO data table
CREATE TABLE cms_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  canonical VARCHAR(500),
  robots VARCHAR(100),
  meta_data JSONB DEFAULT '{}',
  structured_data JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, type, reference_id)
);
```

## Error Handling

### Error Classification

1. **Validation Errors**: Schema validation failures
2. **Authentication Errors**: Auth failures and permission denials
3. **Content Errors**: Missing or corrupted content
4. **System Errors**: Infrastructure and service failures
5. **Migration Errors**: Data migration issues

### Error Response Format

```typescript
interface APIError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId: string;
  path: string;
}

interface ErrorEnvelope {
  error: APIError;
  meta: {
    version: string;
    tenant?: string;
  };
}
```

### Error Recovery Strategies

1. **Graceful Degradation**: Fallback to cached or default content
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Circuit Breaker**: Prevent cascade failures
4. **Monitoring**: Real-time error tracking and alerting

## Testing Strategy

### Unit Testing

- **Component Registry**: Test component registration and validation
- **API Bridge**: Test provider interfaces and data transformation
- **Content Validation**: Test schema validation and sanitization
- **Migration Logic**: Test data transformation and integrity

### Integration Testing

- **API Endpoints**: Test full request/response cycles
- **Database Operations**: Test CRUD operations and transactions
- **Plugin System**: Test plugin loading and integration
- **Multi-Tenant**: Test tenant isolation and context switching

### End-to-End Testing

- **Page Rendering**: Test complete page rendering pipeline
- **Content Management**: Test content creation and publishing workflows
- **Migration Process**: Test JSON to database migration
- **Performance**: Test caching and optimization features

### Testing Tools

- **Jest**: Unit and integration testing
- **Playwright**: End-to-end browser testing
- **Supertest**: API endpoint testing
- **Testing Library**: React component testing

## Security Considerations

### Input Validation and Sanitization

- **Schema Validation**: Zod schemas for all input data
- **HTML Sanitization**: DOMPurify for rich text content
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Prevention**: Content Security Policy and output encoding

### Authentication and Authorization

- **JWT Validation**: Secure token validation and refresh
- **RBAC Implementation**: Role-based access control
- **Session Management**: Secure session handling
- **API Rate Limiting**: Prevent abuse and DoS attacks

### Data Protection

- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Audit Logging**: Comprehensive audit trail for all operations
- **Data Anonymization**: Privacy-compliant data handling

### Infrastructure Security

- **CSP Headers**: Content Security Policy implementation
- **CORS Configuration**: Proper cross-origin resource sharing
- **Security Headers**: Comprehensive security header configuration
- **Dependency Scanning**: Regular security vulnerability scanning

## Performance Optimization

### Caching Strategy

1. **Multi-Level Caching**: Memory, Redis, and CDN layers
2. **Cache Invalidation**: Smart invalidation based on content changes
3. **Cache Warming**: Proactive cache population
4. **Cache Monitoring**: Performance metrics and optimization

### Database Optimization

1. **Query Optimization**: Efficient queries and indexing
2. **Connection Pooling**: Optimal database connection management
3. **Read Replicas**: Separate read and write operations
4. **Data Partitioning**: Tenant-based data partitioning

### Frontend Optimization

1. **Code Splitting**: Dynamic imports for components
2. **Image Optimization**: Next.js image optimization
3. **Bundle Analysis**: Regular bundle size monitoring
4. **Performance Monitoring**: Real-time performance tracking

## Deployment and DevOps

### Environment Configuration

- **Development**: Local development with file-based storage
- **Staging**: Production-like environment with database
- **Production**: Fully optimized with caching and monitoring

### CI/CD Pipeline

1. **Code Quality**: Linting, formatting, and type checking
2. **Testing**: Automated test execution and coverage reporting
3. **Security Scanning**: Dependency and code security analysis
4. **Deployment**: Automated deployment with rollback capabilities

### Monitoring and Observability

1. **Application Monitoring**: Performance and error tracking
2. **Infrastructure Monitoring**: Server and database metrics
3. **Log Aggregation**: Centralized logging and analysis
4. **Alerting**: Proactive issue detection and notification

This design provides a comprehensive foundation for building the JSON CMS Boilerplate System while leveraging and extending the existing architecture in the codebase.