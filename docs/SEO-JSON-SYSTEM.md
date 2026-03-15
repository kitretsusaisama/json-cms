# SEO & JSON Page Design System

This document describes the comprehensive SEO and JSON page design system implemented in Albata.

## Overview

The system provides:
- **Entity-based SEO** for 10 entity types with structured data
- **JSON page design** with component-driven rendering
- **Security-first** approach with validation and audit logging
- **Developer-friendly** tools and DX features

## SEO Feature Set

### Supported Entity Types

1. `page` - Static pages
2. `post` - Blog posts/articles
3. `product` - E-commerce products
4. `category` - Product categories
5. `brand` - Brand pages
6. `tag` - Tag pages
7. `author` - Author profiles
8. `collection` - Product collections
9. `event` - Event pages
10. `service` - Service pages

### Storage Structure

```
data/seo/
├── page/
│   ├── _defaults.json
│   ├── home.json
│   └── about.json
├── product/
│   ├── cosmos-chair.json
│   └── ergonomic-desk.json
├── post/
│   └── getting-started.json
└── ...
```

### SEO Record Schema

```typescript
interface SeoRecord {
  id: string;                    // slug or id
  type: SeoType;                 // entity type
  title: string;                 // page title
  description: string;           // meta description
  canonical?: string;            // canonical URL
  robots?: string;               // robots directive
  alternates?: Record<string, string>; // locale -> URL
  meta: MetaTag[];               // custom meta tags
  openGraph?: OpenGraph;         // Open Graph data
  twitter?: TwitterCard;         // Twitter Card data
  structuredData: any[];         // JSON-LD blocks
  updatedAt: string;             // ISO timestamp
}
```

### API Endpoints

- `GET /api/seo/:type/:id` - Fetch SEO data
- `POST /api/seo/:type/:id` - Create/update SEO data
- `PUT /api/seo/:type/:id` - Update SEO data
- `DELETE /api/seo/:type/:id` - Delete SEO data

### Server-Side Usage

```typescript
import { getSeo } from '@/lib/seo-store';

// In RSC component
const seo = await getSeo('product', 'cosmos-chair');
```

### Client-Side Usage

```typescript
import { useSeo } from '@/hooks/useSeo';

// In client component
const { seo, isLoading, isError } = useSeo('product', 'cosmos-chair');
```

## JSON Page Design

### Page Definition Schema

```typescript
interface PageDefinition {
  version: 1;
  seoRef?: { type: string; id: string };
  components: ComponentInstance[];
  guards?: string[];
  featureFlags?: string[];
}

interface ComponentInstance {
  key: string;
  type: string;           // must exist in registry
  props: Record<string, any>;
  children?: ComponentInstance[];
  visible?: VisibilityRules;
}
```

### Component Registry

The system includes a whitelisted component registry with prop validation:

```typescript
// Available components
- Hero
- ProductGrid
- CTA
- RichText
- FAQ
- Newsletter
```

### Page JSON Example

```json
{
  "version": 1,
  "seoRef": {
    "type": "page",
    "id": "home"
  },
  "components": [
    {
      "key": "hero-1",
      "type": "Hero",
      "props": {
        "title": "Welcome to Albata",
        "subtitle": "Modern Web Platform",
        "ctaText": "Get Started",
        "ctaHref": "/docs"
      }
    },
    {
      "key": "product-grid-1",
      "type": "ProductGrid",
      "props": {
        "limit": 6,
        "collection": "featured"
      }
    }
  ]
}
```

### Usage in Pages

```typescript
import JsonPageRenderer from '@/components/JsonPageRenderer';

export default async function HomePage() {
  const pageDef = await loadPageDefinition('home');
  return <JsonPageRenderer def={pageDef} />;
}
```

## Security Features

### Headers

- **CSP**: Content Security Policy with strict rules
- **HSTS**: HTTP Strict Transport Security (production)
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: minimal permissions

### Validation

- **Zod schemas** for all JSON data
- **Input sanitization** for HTML content
- **Path traversal protection** for file operations
- **Rate limiting** on API endpoints
- **Admin authentication** for mutations

### Audit Logging

All SEO and settings changes are logged to `data/audit.log`:

```json
{
  "timestamp": "2025-08-23T00:00:00.000Z",
  "action": "seo:update",
  "userId": "admin-1",
  "userEmail": "admin@example.com",
  "details": {
    "type": "product",
    "id": "cosmos-chair",
    "title": "Cosmos Ergonomic Chair"
  }
}
```

## Development Tools

### SEO Generation

```bash
# Generate SEO file for a product
npm run generate:seo product cosmos-chair "Cosmos Chair" "Premium ergonomic chair" "ergonomic,office,chair" "599.99"

# Generate SEO file for a page
npm run generate:seo page about "About Us" "Learn more about our company" "about,company,team"
```

### Schema Validation

```bash
# Validate all JSON files against schemas
npm run check:schemas

# Alias
npm run validate:json
```

### File Structure Validation

The system validates:
- SEO files against `SeoRecordSchema`
- Page definitions against `PageDefinitionSchema`
- Component props against their respective schemas

## Settings Management

### App Settings

```json
{
  "name": "Albata",
  "version": "1.0.0",
  "features": {
    "seo": true,
    "jsonPages": true,
    "pwa": true,
    "ai": false
  },
  "security": {
    "csp": true,
    "hsts": true,
    "rateLimit": true
  }
}
```

### API Endpoints

- `GET /api/settings/:area?key=value` - Read settings
- `POST /api/settings/:area` - Update settings
- `DELETE /api/settings/:area?key=value` - Delete settings

## Entity-Based SEO Best Practices

### 1. Identify Relevant Entities

- **Brand entities**: Your company, products, services
- **Niche entities**: Industry terms, tools, influencers
- **Semantic entities**: Related concepts and topics

### 2. Build Entity Maps

Create connections between entities:

```json
{
  "primary": "Cosmos Chair",
  "related": ["Ergonomic Office", "Lumbar Support", "Mesh Back"],
  "context": "Office furniture, productivity, health"
}
```

### 3. Structured Data

Include comprehensive JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cosmos Ergonomic Chair",
  "brand": { "@type": "Brand", "name": "Albata" },
  "category": "Office Furniture",
  "offers": {
    "@type": "Offer",
    "price": "599.99",
    "priceCurrency": "USD"
  }
}
```

### 4. Content Depth

- Provide comprehensive information about each entity
- Include historical context and relationships
- Update regularly as entities evolve

## Migration Guide (v1 → v2)

### File System to Database

Current structure:
```
data/seo/{type}/{id}.json
```

Future structure:
```sql
CREATE TABLE seo_records (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Script

```typescript
async function migrateSeoToDatabase() {
  const files = await glob('data/seo/**/*.json');
  
  for (const file of files) {
    const data = await readJsonFile(file);
    await db.seoRecords.upsert({
      where: { id: data.id, type: data.type },
      update: { data },
      create: { id: data.id, type: data.type, data }
    });
  }
}
```

## Performance Considerations

### Caching

- **RSC caching**: `cache()` wrapper for server functions
- **ETags**: Automatic ETag generation for API responses
- **SWR**: Client-side caching with revalidation

### Optimization

- **Lazy loading**: Components load on demand
- **Suspense boundaries**: Graceful loading states
- **Atomic writes**: Prevent file corruption

## Testing

### Unit Tests

```typescript
describe('SEO Store', () => {
  it('should validate SEO records', async () => {
    const seo = await getSeo('product', 'test');
    expect(seo).toMatchSchema(SeoRecordSchema);
  });
});
```

### Integration Tests

```typescript
describe('SEO API', () => {
  it('should return 404 for non-existent SEO', async () => {
    const response = await fetch('/api/seo/product/nonexistent');
    expect(response.status).toBe(404);
  });
});
```

## Troubleshooting

### Common Issues

1. **Schema validation errors**: Check JSON structure against Zod schemas
2. **Component not found**: Ensure component exists in registry
3. **Permission denied**: Verify admin authentication
4. **Rate limit exceeded**: Wait before retrying API calls

### Debug Commands

```bash
# Validate all schemas
npm run check:schemas

# Check file permissions
ls -la data/seo/

# View audit log
tail -f data/audit.log
```

## Future Enhancements

### Planned Features

- **AI-powered SEO suggestions**
- **Visual page builder**
- **Advanced analytics integration**
- **Multi-tenant support**
- **GraphQL API**
- **Real-time collaboration**

### Extensibility

The system is designed for easy extension:

1. **New entity types**: Add to `SeoType` enum
2. **New components**: Add to registry with prop schema
3. **New settings areas**: Extend settings API
4. **Database backend**: Implement `SeoStore` interface

---

For more information, see the [API documentation](./API-USAGE.md) and [implementation guide](./IMPLEMENTATION-GUIDE.md). 