# Integration Guide

This guide walks you through integrating the @upflame/json-cms into an existing Next.js project step-by-step.

## Prerequisites

Before starting the integration, ensure your project meets these requirements:

- **Next.js 13+** with App Router or Pages Router
- **Node.js 18+**
- **TypeScript** (recommended but not required)
- **React 18+**

## Step 1: Project Analysis

First, analyze your existing project to identify potential conflicts and integration points.

### 1.1 Run the Scanner

```bash
cms scan
```

This will generate a detailed report including:
- Next.js version and configuration
- Existing routes and API endpoints
- CSS frameworks and potential conflicts
- Third-party integrations
- Recommended integration strategy

### 1.2 Review the Scan Report

The scanner creates a `jsoncms-scan-report.json` file with findings:

```json
{
  "nextjsVersion": "14.0.0",
  "hasTypeScript": true,
  "cssStrategy": ["tailwind", "custom"],
  "routes": {
    "pages": ["/", "/about", "/contact"],
    "api": ["/api/auth", "/api/users"],
    "dynamic": ["/blog/[slug]", "/products/[id]"]
  },
  "conflicts": {
    "routes": [],
    "css": ["global.css line 15: .container conflicts with boilerplate"]
  },
  "recommendations": [
    "Use CSS isolation for Tailwind compatibility",
    "Configure API namespace to avoid conflicts"
  ]
}
```

## Step 2: Installation and Initialization

### 2.1 Install the Package

```bash
npm install @upflame/json-cms
# or
yarn add @upflame/json-cms
```

### 2.2 Initialize the CMS

```bash
cms init
```

This command will:
- Create the necessary directory structure
- Generate configuration files
- Set up example content
- Configure middleware
- Update your Next.js configuration

### 2.3 Directory Structure Created

```
your-project/
├── data/
│   ├── content/
│   │   ├── pages/
│   │   ├── blocks/
│   │   └── components/
│   ├── plugins/
│   └── config/
├── src/
│   ├── app/api/cms/          # API routes
│   ├── components/cms/       # CMS components
│   └── lib/cms/             # CMS utilities
└── jsoncms.config.ts        # Main configuration
```

## Step 3: Configuration

### 3.1 Environment Variables

Create or update your `.env.local` file:

```bash
# Storage Provider
CMS_PROVIDER=file

# API Configuration
CMS_API_PREFIX=/api/cms
CMS_CONTENT_PATH=./data/content

# Security
CMS_API_KEY=your-secure-api-key
CORS_ORIGINS=http://localhost:3000

# Caching (optional)
CACHE_PROVIDER=memory
CACHE_TTL=3600

# Multi-tenant (optional)
TENANT_STRATEGY=single
# TENANT_STRATEGY=domain|subdomain|header|path
```

### 3.2 Next.js Configuration

Update your `next.config.js`:

```javascript
const { withCMS } = require('@upflame/json-cms/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing configuration
  experimental: {
    appDir: true,
  },
};

module.exports = withCMS(nextConfig, {
  // CMS-specific configuration
  cssIsolation: true,
  apiPrefix: '/api/cms',
  contentPath: './data/content',
});
```

### 3.3 Middleware Setup

Create or update `middleware.ts`:

```typescript
import { NextRequest } from 'next/server';
import { withCMSMiddleware } from '@upflame/json-cms/middleware';

// Your existing middleware (if any)
function customMiddleware(request: NextRequest) {
  // Your custom logic
}

// Combine with CMS middleware
export default withCMSMiddleware(customMiddleware, {
  apiPrefix: '/api/cms',
  enableTenantResolution: false, // Set to true for multi-tenant
  enableRateLimit: true,
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Step 4: Component Integration

### 4.1 Register Existing Components

Create a component registry file `src/lib/cms/registry.ts`:

```typescript
import { ComponentRegistry } from '@upflame/json-cms';
import { Hero } from '@/components/Hero';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ContactForm } from '@/components/ContactForm';

const registry = new ComponentRegistry();

// Register your existing components
registry.register('Hero', Hero, {
  schema: {
    title: { type: 'string', required: true },
    subtitle: { type: 'string' },
    backgroundImage: { type: 'string' },
    ctaText: { type: 'string' },
    ctaLink: { type: 'string' }
  },
  metadata: {
    name: 'Hero Section',
    description: 'Main hero section with title and CTA',
    category: 'Layout',
    version: '1.0.0'
  }
});

registry.register('FeatureGrid', FeatureGrid, {
  schema: {
    title: { type: 'string' },
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' }
        }
      }
    }
  },
  metadata: {
    name: 'Feature Grid',
    description: 'Grid of features with icons',
    category: 'Content'
  }
});

export { registry };
```

### 4.2 Update Component Props

Ensure your components accept props that match the JSON schema:

```typescript
// Before: Hardcoded component
export function Hero() {
  return (
    <section className="hero">
      <h1>Welcome to Our Site</h1>
      <p>This is our amazing platform</p>
    </section>
  );
}

// After: JSON-driven component
interface HeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function Hero({ title, subtitle, backgroundImage, ctaText, ctaLink }: HeroProps) {
  return (
    <section 
      className="hero"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
    >
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {ctaText && ctaLink && (
        <a href={ctaLink} className="cta-button">
          {ctaText}
        </a>
      )}
    </section>
  );
}
```

## Step 5: Page Migration

### 5.1 Identify Pages to Migrate

Start with simple, content-heavy pages:
- Homepage
- About page
- Landing pages
- Blog posts

Avoid migrating complex pages initially:
- Authentication pages
- Dashboard pages
- Forms with complex logic

### 5.2 Create JSON Page Definitions

Create `data/content/pages/homepage.json`:

```json
{
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
        "subtitle": "Build amazing experiences with our tools",
        "backgroundImage": "/images/hero-bg.jpg",
        "ctaText": "Get Started",
        "ctaLink": "/signup"
      }
    },
    {
      "id": "features-1",
      "componentType": "FeatureGrid",
      "props": {
        "title": "Why Choose Us",
        "features": [
          {
            "title": "Fast Performance",
            "description": "Lightning-fast loading times",
            "icon": "⚡"
          },
          {
            "title": "Easy to Use",
            "description": "Intuitive interface for everyone",
            "icon": "🎯"
          }
        ]
      }
    }
  ],
  "seo": {
    "title": "Welcome to Our Platform - Your Company",
    "description": "Discover our amazing platform that helps you build better experiences",
    "canonical": "https://yoursite.com/",
    "openGraph": {
      "title": "Welcome to Our Platform",
      "description": "Build amazing experiences with our tools",
      "image": "/images/og-homepage.jpg"
    }
  },
  "metadata": {
    "layout": "default",
    "publishedAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 5.3 Update Page Components

Replace static pages with CMS-driven ones:

```typescript
// pages/index.tsx or app/page.tsx
import { CMSPage } from '@upflame/json-cms/components';
import { getCMSPageData } from '@upflame/json-cms/server';

interface HomePageProps {
  pageData: any;
}

export default function HomePage({ pageData }: HomePageProps) {
  return <CMSPage data={pageData} />;
}

// For App Router
export async function generateStaticParams() {
  return [{ slug: [] }]; // Root page
}

// For both App Router and Pages Router
export async function getStaticProps() {
  const pageData = await getCMSPageData('/');
  
  return {
    props: {
      pageData,
    },
    revalidate: 3600, // Revalidate every hour
  };
}
```

## Step 6: CSS Integration

### 6.1 Handle CSS Conflicts

If the scanner detected CSS conflicts, implement isolation:

```typescript
// jsoncms.config.ts
module.exports = {
  css: {
    isolation: {
      enabled: true,
      strategy: 'namespace', // or 'css-modules', 'css-in-js'
      namespace: 'cms-',
      excludeGlobal: ['.container', '.btn'] // Existing classes to preserve
    }
  }
};
```

### 6.2 Tailwind Integration

If using Tailwind CSS, configure the compatibility layer:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './data/**/*.{json,js,ts,jsx,tsx}', // Include CMS content
    './node_modules/@upflame/json-cms/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Your existing theme
    },
  },
  plugins: [
    require('@upflame/json-cms/tailwind-plugin')
  ],
};
```

### 6.3 Custom CSS Integration

For custom CSS frameworks, use the isolation wrapper:

```typescript
import { withCSSIsolation } from '@upflame/json-cms/css';

const IsolatedComponent = withCSSIsolation(YourComponent, {
  namespace: 'cms-',
  isolateGlobal: true
});
```

## Step 7: API Integration

### 7.1 Test API Endpoints

Verify the API is working correctly:

```bash
# Test page endpoint
curl http://localhost:3000/api/cms/pages/homepage

# Test blocks endpoint
curl http://localhost:3000/api/cms/blocks

# Test components endpoint
curl http://localhost:3000/api/cms/components
```

### 7.2 Frontend API Integration

Use the CMS client in your components:

```typescript
import { useCMSData } from '@upflame/json-cms/hooks';

function DynamicContent() {
  const { data: page, loading, error } = useCMSData('pages', 'homepage');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <CMSPage data={page} />;
}
```

## Step 8: Testing Integration

### 8.1 Run Integration Tests

```bash
# Test the CMS functionality
npm run test:cms

# Test page rendering
npm run test:e2e

# Test API endpoints
npm run test:api
```

### 8.2 Manual Testing Checklist

- [ ] Homepage loads with CMS content
- [ ] Components render correctly
- [ ] SEO metadata is applied
- [ ] API endpoints respond correctly
- [ ] No CSS conflicts
- [ ] Performance is acceptable
- [ ] Error handling works

## Step 9: Production Deployment

### 9.1 Environment Configuration

Set production environment variables:

```bash
# Production .env
CMS_PROVIDER=database
DATABASE_URL=postgresql://user:pass@prod-db:5432/cms
REDIS_URL=redis://prod-redis:6379
CMS_API_KEY=your-production-api-key
CORS_ORIGINS=https://yoursite.com
```

### 9.2 Database Migration (Optional)

If moving to database storage:

```bash
# Run migration
cms migrate --from file --to database --env production

# Verify migration
cms validate --env production
```

### 9.3 Performance Optimization

Enable production optimizations:

```javascript
// next.config.js
module.exports = withCMS(nextConfig, {
  optimization: {
    enableCaching: true,
    enableCompression: true,
    enableImageOptimization: true,
  },
  security: {
    enableRateLimit: true,
    enableCSP: true,
    enableCORS: true,
  }
});
```

## Troubleshooting

### Common Issues

**1. CSS Conflicts**
```bash
# Re-run scanner to identify conflicts
cms scan --css-only

# Enable CSS isolation
# Update jsoncms.config.ts with isolation settings
```

**2. Component Not Found**
```typescript
// Ensure component is registered
import { registry } from '@/lib/cms/registry';
console.log(registry.list()); // Check registered components
```

**3. API Errors**
```bash
# Check API configuration
curl -v http://localhost:3000/api/cms/health

# Verify environment variables
echo $CMS_PROVIDER
echo $CMS_API_KEY
```

**4. Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

- Check the [FAQ](faq.md)
- Review [API Documentation](api-reference.md)
- Join our [Discord Community](https://discord.gg/json-cms)
- Open an [Issue](https://github.com/upflame/json-cms/issues)

## Next Steps

After successful integration:

1. **Explore Advanced Features**
   - [Multi-tenant setup](multi-tenant.md)
   - [Plugin development](plugin-development.md)
   - [Performance optimization](performance.md)

2. **Content Management**
   - Create more page templates
   - Build custom components
   - Set up content workflows

3. **Scaling**
   - Implement database storage
   - Set up caching strategies
   - Configure CDN integration

Congratulations! You've successfully integrated the @upflame/json-cms into your Next.js project.