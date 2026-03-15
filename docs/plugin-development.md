# Plugin Development Guide

Learn how to create custom plugins to extend the @upflame/json-cms functionality.

## Overview

The plugin system allows you to extend the CMS with:
- Custom React components
- API endpoints
- Data providers
- Workflow integrations
- Third-party service integrations

## Plugin Architecture

### Plugin Structure

```
my-plugin/
├── plugin.json          # Plugin manifest
├── index.ts             # Main plugin entry
├── components/          # React components
│   ├── MyComponent.tsx
│   └── index.ts
├── api/                 # API routes
│   └── handlers.ts
├── hooks/               # React hooks
│   └── useMyFeature.ts
├── types/               # TypeScript types
│   └── index.ts
└── README.md           # Plugin documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome plugin that does amazing things",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["cms", "plugin", "awesome"],
  "main": "index.ts",
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.0.0"
  },
  "peerDependencies": {
    "@upflame/json-cms": "^1.0.0"
  },
  "cms": {
    "minVersion": "1.0.0",
    "maxVersion": "2.0.0",
    "components": [
      {
        "key": "MyComponent",
        "name": "My Awesome Component",
        "category": "Custom"
      }
    ],
    "apiRoutes": [
      {
        "path": "/api/my-plugin/*",
        "handler": "./api/handlers"
      }
    ],
    "hooks": [
      "page.beforeRender",
      "block.afterCreate"
    ],
    "permissions": [
      "my-plugin:read",
      "my-plugin:write"
    ]
  }
}
```

## Creating Your First Plugin

### Step 1: Initialize Plugin

```bash
# Create plugin directory
mkdir my-awesome-plugin
cd my-awesome-plugin

# Initialize with CLI (if available)
cms create-plugin --name "my-awesome-plugin"

# Or create manually
npm init -y
```

### Step 2: Create Plugin Manifest

Create `plugin.json` with your plugin configuration:

```json
{
  "name": "analytics-plugin",
  "version": "1.0.0",
  "description": "Google Analytics integration for CMS",
  "author": "Your Name",
  "main": "index.ts",
  "cms": {
    "components": [
      {
        "key": "AnalyticsTracker",
        "name": "Analytics Tracker",
        "category": "Analytics"
      }
    ],
    "apiRoutes": [
      {
        "path": "/api/analytics/*",
        "handler": "./api/analytics"
      }
    ]
  }
}
```

### Step 3: Implement Plugin Interface

Create `index.ts`:

```typescript
import { Plugin, PluginContext } from '@upflame/json-cms/plugin';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { analyticsApiHandler } from './api/analytics';

export default class AnalyticsPlugin implements Plugin {
  name = 'analytics-plugin';
  version = '1.0.0';

  async install(context: PluginContext): Promise<void> {
    // Register components
    context.registry.register('AnalyticsTracker', AnalyticsTracker, {
      schema: {
        trackingId: { type: 'string', required: true },
        events: { type: 'array', items: { type: 'string' } }
      },
      metadata: {
        name: 'Analytics Tracker',
        description: 'Track page views and events',
        category: 'Analytics'
      }
    });

    // Register API routes
    context.api.register('/api/analytics', analyticsApiHandler);

    console.log('Analytics plugin installed successfully');
  }

  async uninstall(context: PluginContext): Promise<void> {
    // Cleanup
    context.registry.unregister('AnalyticsTracker');
    context.api.unregister('/api/analytics');
    
    console.log('Analytics plugin uninstalled');
  }

  async activate(): Promise<void> {
    // Plugin activation logic
    console.log('Analytics plugin activated');
  }

  async deactivate(): Promise<void> {
    // Plugin deactivation logic
    console.log('Analytics plugin deactivated');
  }
}
```

### Step 4: Create Components

Create `components/AnalyticsTracker.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

interface AnalyticsTrackerProps {
  trackingId: string;
  events?: string[];
  debug?: boolean;
}

export function AnalyticsTracker({ 
  trackingId, 
  events = [], 
  debug = false 
}: AnalyticsTrackerProps) {
  const router = useRouter();

  useEffect(() => {
    // Initialize Google Analytics
    if (typeof window !== 'undefined') {
      // Load GA script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.gtag = window.gtag || function() {
        (window.gtag.q = window.gtag.q || []).push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', trackingId);

      if (debug) {
        console.log('Analytics initialized with ID:', trackingId);
      }
    }
  }, [trackingId, debug]);

  useEffect(() => {
    // Track page views
    const handleRouteChange = (url: string) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', trackingId, {
          page_path: url,
        });
        
        if (debug) {
          console.log('Page view tracked:', url);
        }
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, trackingId, debug]);

  useEffect(() => {
    // Track custom events
    events.forEach(event => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', event, {
          event_category: 'CMS',
          event_label: 'Plugin Generated'
        });
        
        if (debug) {
          console.log('Event tracked:', event);
        }
      }
    });
  }, [events, debug]);

  // This component doesn't render anything visible
  return null;
}

// Extend window type for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
```

### Step 5: Create API Handlers

Create `api/analytics.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { APIEnvelope } from '@upflame/json-cms/api';

interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
}

export async function analyticsApiHandler(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const method = request.method;

  try {
    switch (true) {
      case pathname.endsWith('/track') && method === 'POST':
        return await trackEvent(request);
      
      case pathname.endsWith('/stats') && method === 'GET':
        return await getStats(request);
      
      default:
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function trackEvent(request: NextRequest): Promise<NextResponse> {
  const body: AnalyticsEvent = await request.json();
  
  // Validate event data
  if (!body.event || !body.category) {
    return NextResponse.json(
      { error: 'Event and category are required' },
      { status: 400 }
    );
  }

  // Here you would typically send to your analytics service
  // For this example, we'll just log it
  console.log('Analytics event tracked:', body);

  const response: APIEnvelope<{ success: boolean }> = {
    data: { success: true },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: generateRequestId()
    }
  };

  return NextResponse.json(response);
}

async function getStats(request: NextRequest): Promise<NextResponse> {
  // Mock analytics stats
  const stats = {
    pageViews: 1234,
    uniqueVisitors: 567,
    events: 890,
    topPages: [
      { path: '/', views: 456 },
      { path: '/about', views: 234 },
      { path: '/contact', views: 123 }
    ]
  };

  const response: APIEnvelope<typeof stats> = {
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: generateRequestId()
    }
  };

  return NextResponse.json(response);
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

## Advanced Plugin Features

### Plugin Hooks

Plugins can hook into CMS lifecycle events:

```typescript
export default class MyPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    // Hook into page rendering
    context.hooks.register('page.beforeRender', async (page) => {
      console.log('Page about to render:', page.slug);
      
      // Modify page data
      page.metadata.lastViewed = new Date().toISOString();
      
      return page;
    });

    // Hook into block creation
    context.hooks.register('block.afterCreate', async (block) => {
      console.log('Block created:', block.id);
      
      // Send notification, update analytics, etc.
      await notifyBlockCreated(block);
    });
  }
}
```

### Available Hooks

| Hook | Description | Parameters |
|------|-------------|------------|
| `page.beforeRender` | Before page renders | `(page: PageData) => PageData` |
| `page.afterRender` | After page renders | `(page: PageData, html: string) => void` |
| `block.beforeCreate` | Before block creation | `(block: BlockData) => BlockData` |
| `block.afterCreate` | After block creation | `(block: BlockData) => void` |
| `component.beforeRegister` | Before component registration | `(component: ComponentDef) => ComponentDef` |
| `api.beforeRequest` | Before API request | `(request: Request) => Request` |
| `api.afterResponse` | After API response | `(response: Response) => Response` |

### Plugin Configuration

Plugins can define configuration schemas:

```typescript
// plugin.json
{
  "cms": {
    "config": {
      "schema": {
        "type": "object",
        "properties": {
          "apiKey": {
            "type": "string",
            "description": "API key for external service"
          },
          "enabled": {
            "type": "boolean",
            "default": true
          },
          "options": {
            "type": "object",
            "properties": {
              "timeout": { "type": "number", "default": 5000 },
              "retries": { "type": "number", "default": 3 }
            }
          }
        },
        "required": ["apiKey"]
      }
    }
  }
}
```

Access configuration in your plugin:

```typescript
export default class MyPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    const config = context.config.get('my-plugin');
    
    if (!config.enabled) {
      console.log('Plugin is disabled');
      return;
    }

    // Use configuration
    const apiKey = config.apiKey;
    const timeout = config.options?.timeout || 5000;
  }
}
```

### Database Integration

Plugins can define their own database schemas:

```typescript
// migrations/001_create_analytics_tables.ts
export async function up(db: Database): Promise<void> {
  await db.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary();
    table.string('event').notNullable();
    table.string('category').notNullable();
    table.string('label').nullable();
    table.integer('value').nullable();
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.index(['event', 'category']);
  });
}

export async function down(db: Database): Promise<void> {
  await db.schema.dropTable('analytics_events');
}
```

Register migrations in your plugin:

```typescript
export default class AnalyticsPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    // Register migrations
    context.migrations.register('analytics', [
      require('./migrations/001_create_analytics_tables')
    ]);
  }
}
```

### Custom Providers

Create custom content providers:

```typescript
import { ContentProvider } from '@upflame/json-cms/providers';

export class CustomProvider implements ContentProvider {
  async getPage(slug: string, context: RequestContext): Promise<PageData> {
    // Custom page retrieval logic
    const page = await this.fetchFromCustomSource(slug);
    return this.transformToPageData(page);
  }

  async getBlock(id: string, context: RequestContext): Promise<BlockData> {
    // Custom block retrieval logic
  }

  // Implement other required methods...
}

// Register in plugin
export default class MyPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    context.providers.register('custom', CustomProvider);
  }
}
```

## Plugin Examples

### E-commerce Plugin

```typescript
// plugins/ecommerce/index.ts
export default class EcommercePlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    // Register components
    context.registry.register('ProductCard', ProductCard);
    context.registry.register('ShoppingCart', ShoppingCart);
    context.registry.register('CheckoutForm', CheckoutForm);

    // Register API routes
    context.api.register('/api/products', productsHandler);
    context.api.register('/api/cart', cartHandler);
    context.api.register('/api/orders', ordersHandler);

    // Hook into page rendering for product pages
    context.hooks.register('page.beforeRender', async (page) => {
      if (page.metadata?.type === 'product') {
        // Fetch product data and inject into page
        const product = await this.getProduct(page.metadata.productId);
        page.context = { ...page.context, product };
      }
      return page;
    });
  }
}
```

### SEO Enhancement Plugin

```typescript
// plugins/seo-enhancer/index.ts
export default class SEOEnhancerPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    // Hook into page rendering to enhance SEO
    context.hooks.register('page.beforeRender', async (page) => {
      // Auto-generate meta descriptions
      if (!page.seo?.description) {
        page.seo = page.seo || {};
        page.seo.description = await this.generateDescription(page);
      }

      // Add structured data
      page.seo.structuredData = [
        ...page.seo.structuredData || [],
        await this.generateStructuredData(page)
      ];

      return page;
    });

    // Register SEO analysis component
    context.registry.register('SEOAnalysis', SEOAnalysisComponent);
  }

  private async generateDescription(page: PageData): Promise<string> {
    // Extract text from blocks and generate description
    const text = this.extractTextFromBlocks(page.blocks);
    return text.substring(0, 160) + '...';
  }
}
```

## Testing Plugins

### Unit Testing

```typescript
// __tests__/analytics-plugin.test.ts
import { createMockContext } from '@upflame/json-cms/testing';
import AnalyticsPlugin from '../index';

describe('AnalyticsPlugin', () => {
  let plugin: AnalyticsPlugin;
  let mockContext: any;

  beforeEach(() => {
    plugin = new AnalyticsPlugin();
    mockContext = createMockContext();
  });

  test('should register components on install', async () => {
    await plugin.install(mockContext);
    
    expect(mockContext.registry.register).toHaveBeenCalledWith(
      'AnalyticsTracker',
      expect.any(Function),
      expect.any(Object)
    );
  });

  test('should track events correctly', async () => {
    const trackSpy = jest.spyOn(window, 'gtag');
    
    // Test component
    render(<AnalyticsTracker trackingId="GA-123" events={['test_event']} />);
    
    expect(trackSpy).toHaveBeenCalledWith('event', 'test_event', expect.any(Object));
  });
});
```

### Integration Testing

```typescript
// __tests__/analytics-integration.test.ts
import { createTestApp } from '@upflame/json-cms/testing';
import AnalyticsPlugin from '../index';

describe('Analytics Integration', () => {
  let app: any;

  beforeEach(async () => {
    app = await createTestApp({
      plugins: [AnalyticsPlugin]
    });
  });

  test('should track page views via API', async () => {
    const response = await app.request('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'page_view',
        category: 'navigation'
      })
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});
```

## Publishing Plugins

### NPM Package

```json
{
  "name": "@upflame/cms-analytics-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "plugin.json"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

### Plugin Registry

Submit to the official plugin registry:

```bash
cms publish-plugin
```

## Best Practices

### 1. Plugin Design

- **Single Responsibility**: Each plugin should have a clear, focused purpose
- **Minimal Dependencies**: Keep external dependencies to a minimum
- **Backward Compatibility**: Maintain API compatibility across versions
- **Error Handling**: Implement comprehensive error handling and logging

### 2. Performance

- **Lazy Loading**: Use dynamic imports for components when possible
- **Caching**: Implement appropriate caching strategies
- **Bundle Size**: Keep plugin bundles small and optimized
- **Memory Management**: Clean up resources in uninstall/deactivate methods

### 3. Security

- **Input Validation**: Validate all user inputs and API requests
- **Permissions**: Implement proper permission checks
- **Sanitization**: Sanitize any user-generated content
- **Secrets Management**: Never hardcode API keys or secrets

### 4. Documentation

- **README**: Provide comprehensive documentation
- **Examples**: Include usage examples and code samples
- **API Docs**: Document all public APIs and interfaces
- **Changelog**: Maintain a detailed changelog

### 5. Testing

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test plugin integration with CMS
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test plugin performance impact

## Plugin Marketplace

Discover and share plugins in the official marketplace:

- **Browse Plugins**: [https://plugins.json-cms.com](https://plugins.json-cms.com)
- **Submit Plugin**: Use the CLI or web interface
- **Plugin Reviews**: Community ratings and reviews
- **Plugin Analytics**: Usage statistics and metrics

## Support and Community

- **Plugin Development Forum**: [https://community.json-cms.com/plugins](https://community.json-cms.com/plugins)
- **Discord Channel**: #plugin-development
- **GitHub Discussions**: Plugin-specific discussions
- **Office Hours**: Weekly plugin development office hours

## Migration Guide

### From v1.x to v2.x

```typescript
// v1.x
export default class MyPlugin {
  install(registry) {
    registry.addComponent('MyComponent', MyComponent);
  }
}

// v2.x
export default class MyPlugin implements Plugin {
  async install(context: PluginContext): Promise<void> {
    context.registry.register('MyComponent', MyComponent, {
      schema: { /* component schema */ },
      metadata: { /* component metadata */ }
    });
  }
}
```

For more examples and advanced patterns, check out the [official plugin examples repository](https://github.com/upflame/json-cms-plugin-examples).