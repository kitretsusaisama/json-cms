# API Reference

Complete API documentation for the JSON CMS Boilerplate system with OpenAPI specification and examples.

## Base URL

```
http://localhost:3000/api/cms
```

## Authentication

All API endpoints support optional authentication via API key or JWT token.

### API Key Authentication

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/cms/pages
```

### JWT Authentication

```bash
curl -H "Authorization: Bearer your-jwt-token" \
  http://localhost:3000/api/cms/pages
```

## Response Format

All API responses follow a standardized envelope format:

```typescript
interface APIResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
    cacheKey?: string;
    tenant?: string;
  };
  errors?: APIError[];
  warnings?: string[];
}

interface APIError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}
```

### Success Response Example

```json
{
  "data": {
    "id": "homepage",
    "title": "Homepage",
    "blocks": [...]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789",
    "cacheKey": "page:homepage:v1"
  }
}
```

### Error Response Example

```json
{
  "data": null,
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid page data",
      "details": {
        "field": "title",
        "reason": "Title is required"
      }
    }
  ]
}
```

## Pages API

### GET /api/cms/pages

Retrieve all pages with optional filtering.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of pages to return (default: 50) |
| `offset` | number | Number of pages to skip (default: 0) |
| `status` | string | Filter by status: `draft`, `published`, `archived` |
| `search` | string | Search in title and content |
| `category` | string | Filter by category |

#### Example Request

```bash
curl "http://localhost:3000/api/cms/pages?limit=10&status=published"
```

#### Example Response

```json
{
  "data": {
    "pages": [
      {
        "id": "homepage",
        "slug": "/",
        "title": "Homepage",
        "description": "Welcome to our platform",
        "status": "published",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "category": "landing",
          "author": "admin"
        }
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### GET /api/cms/pages/[slug]

Retrieve a specific page by slug.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Page slug (URL path) |
| `include` | string | Comma-separated list: `blocks`, `seo`, `metadata` |
| `version` | number | Specific version to retrieve |

#### Example Request

```bash
curl "http://localhost:3000/api/cms/pages/homepage?include=blocks,seo"
```

#### Example Response

```json
{
  "data": {
    "id": "homepage",
    "slug": "/",
    "title": "Homepage",
    "description": "Welcome to our platform",
    "blocks": [
      {
        "id": "hero-1",
        "componentType": "Hero",
        "props": {
          "title": "Welcome to Our Platform",
          "subtitle": "Build amazing experiences",
          "ctaText": "Get Started",
          "ctaLink": "/signup"
        },
        "constraints": {
          "maxWidth": "1200px",
          "alignment": "center"
        }
      }
    ],
    "seo": {
      "title": "Welcome to Our Platform - Your Company",
      "description": "Discover our amazing platform",
      "canonical": "https://yoursite.com/",
      "robots": "index,follow",
      "openGraph": {
        "title": "Welcome to Our Platform",
        "description": "Build amazing experiences",
        "image": "/images/og-homepage.jpg",
        "type": "website"
      },
      "structuredData": [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Homepage",
          "description": "Welcome to our platform"
        }
      ]
    },
    "status": "published",
    "version": 3,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "publishedAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "layout": "default",
      "category": "landing",
      "author": "admin",
      "tags": ["homepage", "landing"]
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789",
    "cacheKey": "page:homepage:v3"
  }
}
```

### POST /api/cms/pages

Create a new page.

#### Request Body

```json
{
  "slug": "/new-page",
  "title": "New Page",
  "description": "A new page description",
  "blocks": [
    {
      "id": "content-1",
      "componentType": "TextBlock",
      "props": {
        "content": "This is the page content"
      }
    }
  ],
  "seo": {
    "title": "New Page - Your Company",
    "description": "Description for the new page"
  },
  "status": "draft",
  "metadata": {
    "category": "content",
    "tags": ["new", "content"]
  }
}
```

#### Example Request

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d @new-page.json \
  http://localhost:3000/api/cms/pages
```

#### Example Response

```json
{
  "data": {
    "id": "new-page-123",
    "slug": "/new-page",
    "title": "New Page",
    "status": "draft",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### PUT /api/cms/pages/[slug]

Update an existing page.

#### Request Body

Same format as POST, but all fields are optional.

#### Example Request

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"title": "Updated Page Title", "status": "published"}' \
  http://localhost:3000/api/cms/pages/new-page
```

### DELETE /api/cms/pages/[slug]

Delete a page.

#### Example Request

```bash
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/cms/pages/new-page
```

## Blocks API

### GET /api/cms/blocks

Retrieve all blocks with optional filtering.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of blocks to return (default: 50) |
| `offset` | number | Number of blocks to skip (default: 0) |
| `category` | string | Filter by category |
| `componentType` | string | Filter by component type |
| `search` | string | Search in name and content |

#### Example Request

```bash
curl "http://localhost:3000/api/cms/blocks?category=hero&limit=5"
```

#### Example Response

```json
{
  "data": {
    "blocks": [
      {
        "id": "hero-1",
        "name": "Homepage Hero",
        "category": "hero",
        "componentType": "Hero",
        "props": {
          "title": "Welcome to Our Platform",
          "subtitle": "Build amazing experiences"
        },
        "tags": ["homepage", "hero"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 5,
      "offset": 0,
      "hasMore": true
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### GET /api/cms/blocks/[id]

Retrieve a specific block by ID.

#### Example Request

```bash
curl "http://localhost:3000/api/cms/blocks/hero-1"
```

#### Example Response

```json
{
  "data": {
    "id": "hero-1",
    "name": "Homepage Hero",
    "description": "Main hero section for homepage",
    "category": "hero",
    "componentType": "Hero",
    "props": {
      "title": "Welcome to Our Platform",
      "subtitle": "Build amazing experiences with our tools",
      "backgroundImage": "/images/hero-bg.jpg",
      "ctaText": "Get Started",
      "ctaLink": "/signup"
    },
    "constraints": {
      "maxWidth": "1200px",
      "alignment": "center",
      "spacing": "large"
    },
    "variants": [
      {
        "name": "dark",
        "props": {
          "theme": "dark",
          "textColor": "white"
        }
      }
    ],
    "usage": [
      {
        "pageId": "homepage",
        "position": 0
      }
    ],
    "tags": ["homepage", "hero", "cta"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "author": "admin",
      "version": 2
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### POST /api/cms/blocks

Create a new block.

#### Request Body

```json
{
  "name": "New Hero Block",
  "description": "A new hero block for landing pages",
  "category": "hero",
  "componentType": "Hero",
  "props": {
    "title": "New Hero Title",
    "subtitle": "Hero subtitle"
  },
  "tags": ["hero", "landing"]
}
```

### PUT /api/cms/blocks/[id]

Update an existing block.

### DELETE /api/cms/blocks/[id]

Delete a block.

## Components API

### GET /api/cms/components

Retrieve all registered components.

#### Example Response

```json
{
  "data": {
    "components": [
      {
        "key": "Hero",
        "name": "Hero Section",
        "description": "Main hero section with title and CTA",
        "category": "Layout",
        "version": "1.0.0",
        "author": "CMS Team",
        "schema": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "description": "Hero title"
            },
            "subtitle": {
              "type": "string",
              "description": "Hero subtitle"
            }
          },
          "required": ["title"]
        },
        "slots": [
          {
            "name": "content",
            "description": "Main content area",
            "allowedComponents": ["TextBlock", "Button"]
          }
        ],
        "variants": [
          {
            "name": "dark",
            "description": "Dark theme variant"
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### GET /api/cms/components/[key]

Retrieve a specific component definition.

### POST /api/cms/components

Register a new component (typically used by plugins).

## SEO API

### GET /api/cms/seo/[type]/[id]

Retrieve SEO data for a specific resource.

#### Parameters

- `type`: Resource type (`page`, `block`, `global`)
- `id`: Resource ID

#### Example Request

```bash
curl "http://localhost:3000/api/cms/seo/page/homepage"
```

#### Example Response

```json
{
  "data": {
    "type": "page",
    "id": "homepage",
    "title": "Welcome to Our Platform - Your Company",
    "description": "Discover our amazing platform that helps you build better experiences",
    "canonical": "https://yoursite.com/",
    "robots": "index,follow",
    "keywords": ["platform", "tools", "development"],
    "openGraph": {
      "title": "Welcome to Our Platform",
      "description": "Build amazing experiences with our tools",
      "image": "/images/og-homepage.jpg",
      "type": "website",
      "url": "https://yoursite.com/"
    },
    "twitter": {
      "card": "summary_large_image",
      "title": "Welcome to Our Platform",
      "description": "Build amazing experiences",
      "image": "/images/twitter-homepage.jpg"
    },
    "structuredData": [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Homepage",
        "description": "Welcome to our platform",
        "url": "https://yoursite.com/"
      }
    ],
    "optimization": {
      "score": 85,
      "suggestions": [
        "Consider adding more descriptive keywords",
        "Optimize image alt text for better accessibility"
      ],
      "issues": []
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### PUT /api/cms/seo/[type]/[id]

Update SEO data for a resource.

## Plugins API

### GET /api/cms/plugins

Retrieve all installed plugins.

#### Example Response

```json
{
  "data": {
    "plugins": [
      {
        "id": "analytics-plugin",
        "name": "Analytics Plugin",
        "version": "1.2.0",
        "description": "Google Analytics integration",
        "author": "CMS Team",
        "status": "active",
        "dependencies": [],
        "components": ["AnalyticsTracker"],
        "routes": ["/api/analytics"],
        "installedAt": "2024-01-01T00:00:00Z",
        "activatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### POST /api/cms/plugins/[id]/activate

Activate a plugin.

### POST /api/cms/plugins/[id]/deactivate

Deactivate a plugin.

## Tenants API (Multi-Tenant Mode)

### GET /api/cms/tenants

Retrieve all tenants (admin only).

### GET /api/cms/tenants/[id]

Retrieve a specific tenant.

### POST /api/cms/tenants

Create a new tenant.

### PUT /api/cms/tenants/[id]

Update tenant settings.

## Utility Endpoints

### GET /api/cms/health

Health check endpoint.

#### Example Response

```json
{
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600,
    "checks": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "requestId": "req_123456789"
  }
}
```

### GET /api/cms/metrics

System metrics (admin only).

### POST /api/cms/cache/invalidate

Invalidate cache for specific keys.

#### Request Body

```json
{
  "keys": ["page:homepage", "blocks:hero-*"],
  "pattern": true
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `CONFLICT` | Resource conflict (e.g., duplicate slug) |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Rate Limiting

API endpoints are rate limited based on:
- **Anonymous requests**: 100 requests per 15 minutes
- **Authenticated requests**: 1000 requests per 15 minutes
- **Admin requests**: 5000 requests per 15 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Webhooks

Configure webhooks to receive notifications about content changes.

### Webhook Events

- `page.created`
- `page.updated`
- `page.deleted`
- `page.published`
- `block.created`
- `block.updated`
- `block.deleted`

### Webhook Payload

```json
{
  "event": "page.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "homepage",
    "slug": "/",
    "changes": ["title", "blocks"]
  },
  "tenant": "tenant-123"
}
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/cms/openapi.json
```

You can use this with tools like Swagger UI, Postman, or generate client SDKs.

## Client SDKs

### JavaScript/TypeScript

```bash
npm install @upflame/json-cms-client
```

```typescript
import { CMSClient } from '@upflame/json-cms-client';

const client = new CMSClient({
  baseURL: 'http://localhost:3000/api/cms',
  apiKey: 'your-api-key'
});

// Fetch a page
const page = await client.pages.get('homepage');

// Create a block
const block = await client.blocks.create({
  name: 'New Block',
  componentType: 'Hero',
  props: { title: 'Hello World' }
});
```

### Python

```bash
pip install json-cms-client
```

```python
from json_cms_client import CMSClient

client = CMSClient(
    base_url='http://localhost:3000/api/cms',
    api_key='your-api-key'
)

# Fetch a page
page = client.pages.get('homepage')

# Create a block
block = client.blocks.create({
    'name': 'New Block',
    'componentType': 'Hero',
    'props': {'title': 'Hello World'}
})
```

## Testing

Use the provided test utilities for API testing:

```typescript
import { createTestClient } from '@upflame/json-cms/testing';

describe('CMS API', () => {
  const client = createTestClient();
  
  test('should fetch page', async () => {
    const page = await client.pages.get('homepage');
    expect(page.data.title).toBe('Homepage');
  });
});
```

For more examples and advanced usage, see the [Integration Guide](integration-guide.md) and [Plugin Development Guide](plugin-development.md).