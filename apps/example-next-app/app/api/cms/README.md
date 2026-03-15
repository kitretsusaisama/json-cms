# CMS API Routes

This directory contains the API routes for the JSON CMS Boilerplate system. These routes provide a comprehensive REST API for managing pages, blocks, components, plugins, and tenants.

## Overview

The CMS API provides standardized endpoints for all content management operations with:

- **Validation and Sanitization**: All input is validated using Zod schemas and sanitized for security
- **Security Middleware**: Rate limiting, CORS, CSP headers, and audit logging
- **Multi-tenant Support**: Tenant isolation and context management
- **Standardized Responses**: Consistent API envelope format with metadata
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Version Control**: Built-in versioning for pages and blocks

## API Endpoints

### Pages API (`/api/cms/pages`)

Manages page content with CRUD operations.

#### Endpoints

- `GET /api/cms/pages` - List pages with filtering and pagination
- `POST /api/cms/pages` - Create a new page
- `GET /api/cms/pages/[slug]` - Get specific page by slug
- `PUT /api/cms/pages/[slug]` - Update specific page
- `DELETE /api/cms/pages/[slug]` - Delete specific page

#### Request/Response Examples

**Create Page:**
```bash
POST /api/cms/pages
Content-Type: application/json
X-Tenant-ID: tenant-123

{
  "slug": "about-us",
  "title": "About Us",
  "description": "Learn more about our company",
  "content": {
    "blocks": [
      {
        "type": "hero",
        "props": {
          "title": "Welcome to Our Company",
          "subtitle": "We build amazing products"
        }
      }
    ]
  },
  "status": "draft",
  "seo": {
    "title": "About Us - Company Name",
    "description": "Learn more about our company and mission"
  }
}
```

**Response:**
```json
{
  "data": {
    "slug": "about-us",
    "title": "About Us",
    "description": "Learn more about our company",
    "content": { ... },
    "status": "draft",
    "version": 1,
    "createdBy": "user-123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedBy": "user-123",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "status": "created",
    "requestId": "req_1705315800_abc123"
  }
}
```

### Blocks API (`/api/cms/blocks`)

Manages reusable content blocks with version control.

#### Endpoints

- `GET /api/cms/blocks` - List blocks with filtering
- `POST /api/cms/blocks` - Create a new block
- `GET /api/cms/blocks/[id]` - Get specific block
- `PUT /api/cms/blocks/[id]` - Update specific block
- `DELETE /api/cms/blocks/[id]` - Delete specific block
- `POST /api/cms/blocks/[id]/usage` - Track block usage

#### Features

- **Usage Tracking**: Automatically tracks which pages use each block
- **Version Control**: Maintains version history for blocks
- **Category Management**: Organize blocks by categories
- **Tag Support**: Tag blocks for better organization
- **Conflict Prevention**: Prevents deletion of blocks currently in use

### Components API (`/api/cms/components`)

Manages the component registry for dynamic component loading.

#### Endpoints

- `GET /api/cms/components` - List registered components
- `POST /api/cms/components` - Register a new component
- `GET /api/cms/components/[key]` - Get specific component
- `PUT /api/cms/components/[key]` - Update component definition
- `DELETE /api/cms/components/[key]` - Unregister component
- `POST /api/cms/components/[key]/validate` - Validate component props

#### Features

- **Dynamic Registration**: Register components at runtime
- **Schema Validation**: Validate component props against schemas
- **Lazy Loading**: Support for lazy-loaded components
- **Metadata Management**: Rich metadata for components including slots and variants

### Plugins API (`/api/cms/plugins`)

Manages plugin lifecycle and operations.

#### Endpoints

- `GET /api/cms/plugins` - List installed plugins
- `POST /api/cms/plugins` - Install a new plugin
- `GET /api/cms/plugins/[id]` - Get specific plugin info
- `PUT /api/cms/plugins/[id]` - Update plugin
- `DELETE /api/cms/plugins/[id]` - Uninstall plugin
- `POST /api/cms/plugins/[id]/activate` - Activate plugin
- `DELETE /api/cms/plugins/[id]/activate` - Deactivate plugin

#### Features

- **Lifecycle Management**: Install, activate, deactivate, uninstall
- **Dependency Tracking**: Track plugin dependencies
- **Health Monitoring**: Monitor plugin health status
- **Version Management**: Handle plugin updates

### Tenants API (`/api/cms/tenants`)

Manages multi-tenant operations and settings.

#### Endpoints

- `GET /api/cms/tenants` - List tenants
- `POST /api/cms/tenants` - Create a new tenant
- `GET /api/cms/tenants/[id]` - Get specific tenant
- `PUT /api/cms/tenants/[id]` - Update tenant
- `DELETE /api/cms/tenants/[id]` - Delete tenant
- `POST /api/cms/tenants/[id]/suspend` - Suspend tenant
- `DELETE /api/cms/tenants/[id]/suspend` - Activate tenant

#### Features

- **Domain Management**: Handle domain and subdomain routing
- **Settings Management**: Tenant-specific settings and branding
- **Usage Tracking**: Monitor tenant resource usage
- **Limits Enforcement**: Enforce tenant limits and quotas

## Authentication and Authorization

All API endpoints support:

- **Bearer Token Authentication**: Pass JWT tokens in Authorization header
- **Tenant Context**: Specify tenant using X-Tenant-ID header
- **User Context**: User identification via X-User-ID header
- **Role-Based Access**: Integration with RBAC system

### Headers

```bash
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-id>
X-User-ID: <user-id>
X-Request-ID: <request-id>
Content-Type: application/json
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "details": {
        "field": "slug",
        "issue": "String must contain at least 1 character(s)"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "path": "/api/cms/pages"
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_1705315800_abc123"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `CONFLICT` - Resource conflict (e.g., duplicate slug)
- `RATE_LIMIT` - Rate limit exceeded
- `INTERNAL_ERROR` - Server error

## Filtering and Pagination

Most list endpoints support filtering and pagination:

### Query Parameters

- `limit` - Number of items per page (default: 20, max: 100)
- `offset` - Number of items to skip (default: 0)
- `status` - Filter by status (draft, published, archived)
- `category` - Filter by category
- `tags` - Filter by tags (comma-separated)
- `createdBy` - Filter by creator
- `dateFrom` - Filter by creation date (ISO string)
- `dateTo` - Filter by creation date (ISO string)

### Example

```bash
GET /api/cms/pages?status=published&limit=10&offset=20&tags=featured,homepage
```

## Caching

The API includes intelligent caching:

- **Response Caching**: GET requests are cached with appropriate TTL
- **Cache Invalidation**: Automatic invalidation on content changes
- **Cache Keys**: Structured cache keys for efficient invalidation
- **Cache Headers**: Proper cache control headers

## Security Features

### Input Sanitization

- **HTML Sanitization**: DOMPurify for rich text content
- **Schema Validation**: Zod schemas for all input data
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Content Security Policy headers

### Rate Limiting

- **Per-endpoint Limits**: Different limits for different operations
- **Per-user Limits**: User-specific rate limiting
- **Per-tenant Limits**: Tenant-specific quotas
- **Sliding Window**: Advanced rate limiting algorithms

### Audit Logging

- **Request Logging**: All requests are logged with correlation IDs
- **Change Tracking**: Track all content changes
- **Security Events**: Log security-related events
- **Structured Logging**: JSON-formatted logs for analysis

## Testing

The API routes include comprehensive tests:

```bash
# Run all CMS API tests
npm test src/app/api/cms

# Run specific test file
npm test src/app/api/cms/__tests__/basic-functionality.test.ts
```

### Test Coverage

- **Unit Tests**: Individual endpoint testing
- **Integration Tests**: End-to-end API testing
- **Validation Tests**: Schema validation testing
- **Error Handling Tests**: Error scenario testing
- **Security Tests**: Security middleware testing

## Configuration

### Environment Variables

```bash
# Provider Configuration
CMS_PROVIDER=file|database|memory
CMS_DATABASE=postgresql|mongodb|sqlite
CMS_CONNECTION_STRING=<connection-string>

# Security Configuration
CMS_ENABLE_RATE_LIMIT=true
CMS_ENABLE_CORS=true
CMS_ENABLE_CSP=true
CMS_ENABLE_AUDIT_LOG=true

# Cache Configuration
CMS_API_CACHE=true
CMS_API_CACHE_TTL=300000
```

### Provider Setup

The API automatically initializes the appropriate content provider based on configuration:

```typescript
// File provider (default)
CMS_PROVIDER=file
DATA_DIR=./src/data

// Database provider
CMS_PROVIDER=database
CMS_DATABASE=postgresql
CMS_CONNECTION_STRING=postgresql://user:pass@localhost:5432/cms

// Memory provider (testing)
CMS_PROVIDER=memory
```

## Usage Examples

### Client-side Usage

```typescript
import { APIClient } from '@/boilerplate/api/client';

const client = new APIClient({
  baseUrl: '/api/cms',
  authToken: 'your-jwt-token',
  tenantId: 'your-tenant-id'
});

// Create a page
const page = await client.setPage('about-us', {
  title: 'About Us',
  content: { blocks: [] },
  status: 'draft'
});

// List pages
const pages = await client.listPages({
  status: 'published',
  limit: 10
});

// Get specific page
const aboutPage = await client.getPage('about-us');
```

### Server-side Usage

```typescript
import { initializeProvider } from '@/boilerplate/api';

const provider = await initializeProvider();

// Direct provider usage
const page = await provider.getPage('about-us', {
  tenantId: 'tenant-123',
  userId: 'user-456'
});
```

## Performance Considerations

### Optimization Strategies

1. **Caching**: Aggressive caching with smart invalidation
2. **Pagination**: Limit result sets to prevent large responses
3. **Lazy Loading**: Components loaded on demand
4. **Connection Pooling**: Database connection optimization
5. **Compression**: Response compression for large payloads

### Monitoring

- **Response Times**: Track API response times
- **Error Rates**: Monitor error rates and patterns
- **Cache Hit Rates**: Monitor cache effectiveness
- **Resource Usage**: Track memory and CPU usage

## Migration and Compatibility

The API is designed to be compatible with existing JSON file structures while providing a migration path to database storage:

1. **File Mode**: Direct compatibility with existing JSON files
2. **Hybrid Mode**: Gradual migration with fallback support
3. **Database Mode**: Full database storage with API compatibility
4. **Migration Tools**: Automated migration utilities

## Contributing

When adding new API endpoints:

1. Follow the established patterns for validation and error handling
2. Include comprehensive tests
3. Update this documentation
4. Ensure security middleware is applied
5. Add appropriate caching strategies
6. Include audit logging for sensitive operations

## Support

For issues or questions about the CMS API:

1. Check the test files for usage examples
2. Review the interface definitions in `/src/boilerplate/interfaces/`
3. Examine the provider implementations for data flow
4. Consult the security middleware documentation