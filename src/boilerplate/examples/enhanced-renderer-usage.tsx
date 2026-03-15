/**
 * Enhanced PageRenderer Usage Examples
 * Demonstrates how to use the enhanced renderer with various configurations
 */

import React from 'react';
import { 
  EnhancedPageRenderer, 
  renderEnhancedJsonPage,
  createTenantContentProvider 
} from '../renderer';
import { TenantContext } from '../interfaces/tenant';
import { AuthContext } from '../interfaces/auth';
import { PluginContext } from '../interfaces/plugin';
import { ContentProvider } from '../interfaces/content-provider';

// Example tenant context
const exampleTenantContext: TenantContext = {
  id: 'acme-corp',
  name: 'ACME Corporation',
  domain: 'acme.example.com',
  settings: {
    theme: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      logo: '/logos/acme-logo.png',
      favicon: '/favicons/acme-favicon.ico'
    },
    branding: {
      companyName: 'ACME Corporation',
      tagline: 'Innovation at its finest',
      footerText: '© 2023 ACME Corporation. All rights reserved.'
    },
    localization: {
      defaultLocale: 'en',
      supportedLocales: ['en', 'es', 'fr'],
      timezone: 'America/New_York'
    },
    content: {
      defaultPageTemplate: 'standard',
      allowedComponents: ['hero', 'text-block', 'image-gallery', 'contact-form'],
      maxPages: 100,
      maxBlocks: 500
    },
    security: {
      allowedDomains: ['acme.example.com', 'www.acme.example.com'],
      requireSSL: true,
      enableAuditLog: true
    }
  },
  features: {
    multiLanguage: true,
    customThemes: true,
    advancedAnalytics: true,
    apiAccess: true,
    customDomains: true
  },
  limits: {
    maxUsers: 50,
    maxPages: 100,
    maxBlocks: 500,
    maxComponents: 20,
    maxStorage: 1024 * 1024 * 1024, // 1GB
    maxApiRequests: 10000, // per hour
    maxBandwidth: 10 * 1024 * 1024 * 1024 // 10GB per month
  },
  metadata: {
    industry: 'technology',
    companySize: 'medium',
    plan: 'professional'
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-06-01T00:00:00Z',
  status: 'active'
};

// Example auth context
const exampleAuthContext: AuthContext = {
  user: {
    id: 'user-123',
    email: 'john.doe@acme.example.com',
    name: 'John Doe',
    avatar: '/avatars/john-doe.jpg',
    roles: ['editor', 'content-manager'],
    permissions: [
      'content.page.read',
      'content.page.write',
      'content.block.read',
      'content.block.write',
      'content.seo.read',
      'content.seo.write'
    ],
    tenantId: 'acme-corp',
    metadata: {
      department: 'marketing',
      title: 'Content Manager',
      lastLogin: '2023-06-15T10:30:00Z'
    },
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-06-15T10:30:00Z',
    lastLoginAt: '2023-06-15T10:30:00Z',
    status: 'active'
  },
  permissions: [
    'content.page.read',
    'content.page.write',
    'content.block.read',
    'content.block.write',
    'content.seo.read',
    'content.seo.write'
  ],
  roles: ['editor', 'content-manager']
};

// Example plugin context
const examplePluginContext: PluginContext = {
  pluginId: 'analytics-plugin',
  pluginDir: '/plugins/analytics-plugin',
  config: {
    get: (key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'analytics.trackPageViews': true,
        'analytics.trackUserInteractions': true,
        'analytics.provider': 'google-analytics',
        'analytics.trackingId': 'GA-XXXX-XXXX'
      };
      return config[key] ?? defaultValue;
    },
    set: (key: string, value: any) => {
      console.log(`Setting config: ${key} = ${value}`);
    },
    has: (key: string) => {
      const config = ['analytics.trackPageViews', 'analytics.trackUserInteractions'];
      return config.includes(key);
    },
    delete: (key: string) => {
      console.log(`Deleting config: ${key}`);
    }
  },
  logger: {
    debug: (message: string, ...args: any[]) => console.debug(`[Analytics Plugin] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.info(`[Analytics Plugin] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[Analytics Plugin] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[Analytics Plugin] ${message}`, ...args)
  },
  registry: {
    registerComponent: (key: string, definition: any) => {
      console.log(`Registering component: ${key}`);
    },
    registerRoute: (registration: any) => {
      console.log(`Registering route: ${registration.path}`);
    },
    registerAPIEndpoint: (registration: any) => {
      console.log(`Registering API endpoint: ${registration.path}`);
    },
    registerHook: (registration: any) => {
      console.log(`Registering hook: ${registration.name}`);
    },
    registerPermission: (registration: any) => {
      console.log(`Registering permission: ${registration.name}`);
    }
  },
  contentProvider: {} as ContentProvider,
  hooks: {
    emit: async (event: string, data?: any) => {
      console.log(`Emitting hook: ${event}`, data);
    },
    on: (event: string, handler: any) => {
      console.log(`Registering hook handler for: ${event}`);
    },
    off: (event: string, handler: any) => {
      console.log(`Unregistering hook handler for: ${event}`);
    }
  }
};

/**
 * Example 1: Basic Enhanced Renderer Usage
 */
export async function BasicEnhancedRendererExample() {
  return (
    <EnhancedPageRenderer
      slug="homepage"
      ctx={{
        locale: 'en',
        preview: false
      }}
      debug={process.env.NODE_ENV === 'development'}
    />
  );
}

/**
 * Example 2: Multi-Tenant Renderer with Auth
 */
export async function MultiTenantRendererExample() {
  return (
    <EnhancedPageRenderer
      slug="dashboard"
      ctx={{
        locale: 'en',
        userPreferences: {
          theme: 'dark',
          notifications: true
        }
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      debug={false}
    />
  );
}

/**
 * Example 3: Plugin-Enhanced Renderer
 */
export async function PluginEnhancedRendererExample() {
  return (
    <EnhancedPageRenderer
      slug="product-page"
      ctx={{
        productId: 'prod-123',
        category: 'electronics'
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      pluginContext={examplePluginContext}
      cacheStrategy={{
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
        invalidateOn: ['product-update', 'inventory-change']
      }}
      debug={false}
    />
  );
}

/**
 * Example 4: Custom Error Handling
 */
export async function CustomErrorHandlingExample() {
  const CustomFallbackComponent = ({ slug, error }: { slug: string; error?: Error }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We're having trouble loading the "{slug}" page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <EnhancedPageRenderer
      slug="complex-page"
      ctx={{}}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      errorFallback={{
        showErrors: false,
        fallbackComponent: CustomFallbackComponent,
        retryAttempts: 3,
        retryDelay: 1000
      }}
      debug={false}
    />
  );
}

/**
 * Example 5: Advanced Caching Strategy
 */
export async function AdvancedCachingExample() {
  return (
    <EnhancedPageRenderer
      slug="news-article"
      ctx={{
        articleId: 'article-456',
        timestamp: Date.now()
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      cacheStrategy={{
        enabled: true,
        ttl: 15 * 60 * 1000, // 15 minutes
        key: 'news-article-456',
        invalidateOn: [
          'article-update',
          'comment-added',
          'author-update'
        ]
      }}
      debug={false}
    />
  );
}

/**
 * Example 6: Programmatic Rendering
 */
export async function ProgrammaticRenderingExample() {
  try {
    const renderedPage = await renderEnhancedJsonPage(
      'api-documentation',
      {
        version: 'v2',
        section: 'authentication'
      },
      {
        tenantContext: exampleTenantContext,
        authContext: exampleAuthContext,
        cacheStrategy: {
          enabled: true,
          ttl: 60 * 60 * 1000 // 1 hour
        },
        debug: false
      }
    );

    return renderedPage;
  } catch (error) {
    console.error('Failed to render page programmatically:', error);
    throw error;
  }
}

/**
 * Example 7: Tenant-Aware Content Provider Usage
 */
export async function TenantContentProviderExample() {
  // This would typically be used in an API route or server component
  const baseProvider: ContentProvider = {
    getPage: async (slug, context) => {
      // Implementation would fetch from file system or database
      return {
        id: slug,
        title: 'Example Page',
        content: {},
        metadata: {}
      } as any;
    },
    getBlock: async (id, context) => {
      return {
        id,
        content: {},
        metadata: {}
      } as any;
    },
    getSEO: async (type, id) => {
      return {
        title: 'Example SEO Title',
        description: 'Example SEO Description',
        metadata: {}
      } as any;
    },
    setContent: async (type, id, data) => {
      console.log(`Setting ${type} content for ${id}`);
    },
    deleteContent: async (type, id) => {
      console.log(`Deleting ${type} content for ${id}`);
    },
    listContent: async (type, filters) => {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 10
      };
    }
  };

  const tenantProvider = createTenantContentProvider(baseProvider);

  // Example usage
  const pageData = await tenantProvider.getTenantContent(
    'page',
    'homepage',
    exampleTenantContext,
    exampleAuthContext
  );

  return pageData;
}

/**
 * Example 8: Debug Mode with Full Context
 */
export async function DebugModeExample() {
  return (
    <EnhancedPageRenderer
      slug="debug-test-page"
      ctx={{
        debugMode: true,
        testData: {
          scenario: 'component-validation',
          expectedComponents: ['hero', 'feature-grid', 'testimonials']
        }
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      pluginContext={examplePluginContext}
      cacheStrategy={{
        enabled: false // Disable caching in debug mode
      }}
      debug={true}
    />
  );
}

/**
 * Example 9: Conditional Rendering Based on Features
 */
export async function ConditionalRenderingExample() {
  // Check if tenant has advanced features enabled
  const hasAdvancedFeatures = exampleTenantContext.features.advancedAnalytics;
  
  return (
    <EnhancedPageRenderer
      slug={hasAdvancedFeatures ? "advanced-dashboard" : "basic-dashboard"}
      ctx={{
        featureLevel: hasAdvancedFeatures ? 'advanced' : 'basic',
        availableFeatures: Object.keys(exampleTenantContext.features).filter(
          key => exampleTenantContext.features[key]
        )
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      debug={false}
    />
  );
}

/**
 * Example 10: Role-Based Content Rendering
 */
export async function RoleBasedRenderingExample() {
  const isAdmin = exampleAuthContext.roles.includes('admin');
  const isEditor = exampleAuthContext.roles.includes('editor');
  
  let slug = 'public-page';
  if (isAdmin) {
    slug = 'admin-dashboard';
  } else if (isEditor) {
    slug = 'editor-dashboard';
  }

  return (
    <EnhancedPageRenderer
      slug={slug}
      ctx={{
        userRole: exampleAuthContext.roles[0],
        permissions: exampleAuthContext.permissions,
        accessLevel: isAdmin ? 'full' : isEditor ? 'limited' : 'read-only'
      }}
      tenantContext={exampleTenantContext}
      authContext={exampleAuthContext}
      debug={false}
    />
  );
}