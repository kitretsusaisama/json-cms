# Enhanced PageRenderer

The Enhanced PageRenderer extends the existing JsonRendererV2 with comprehensive boilerplate features including tenant context, authentication, plugin support, and advanced error handling.

## Features

### 🏢 Multi-Tenant Support
- Tenant-aware content loading with data isolation
- Tenant-specific branding and configuration
- Automatic tenant context injection into components

### 🔐 Authentication & Authorization
- User context integration with role-based access
- Permission-based content filtering
- Secure session management

### 🔌 Plugin System
- Extensible hook system for component lifecycle events
- Plugin-based component registration
- Event-driven architecture with conditions

### 🚀 Performance Optimization
- Enhanced caching strategies with tenant isolation
- Intelligent cache invalidation
- Performance monitoring and metrics

### 🛡️ Enhanced Error Handling
- Graceful error fallbacks with retry mechanisms
- Comprehensive error logging with context
- Debug mode with detailed information

## Usage

### Basic Usage

```tsx
import { EnhancedPageRenderer } from '@/boilerplate/renderer';

export default async function Page() {
  return (
    <EnhancedPageRenderer
      slug="homepage"
      ctx={{ locale: 'en' }}
      debug={process.env.NODE_ENV === 'development'}
    />
  );
}
```

### Multi-Tenant Usage

```tsx
import { EnhancedPageRenderer } from '@/boilerplate/renderer';

export default async function TenantPage({ tenantContext, authContext }) {
  return (
    <EnhancedPageRenderer
      slug="dashboard"
      ctx={{ userPreferences: { theme: 'dark' } }}
      tenantContext={tenantContext}
      authContext={authContext}
      cacheStrategy={{
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
        invalidateOn: ['user-update', 'settings-change']
      }}
    />
  );
}
```

### Plugin Integration

```tsx
import { EnhancedPageRenderer } from '@/boilerplate/renderer';

export default async function PluginEnabledPage({ pluginContext }) {
  return (
    <EnhancedPageRenderer
      slug="product-page"
      ctx={{ productId: 'prod-123' }}
      pluginContext={pluginContext}
      errorFallback={{
        showErrors: false,
        retryAttempts: 3,
        retryDelay: 1000
      }}
    />
  );
}
```

## Components

### EnhancedPageRenderer

The main renderer component that extends JsonRendererV2 with boilerplate features.

**Props:**
- `slug` - Page slug to render
- `ctx` - Context object passed to components
- `tenantContext?` - Tenant information and settings
- `authContext?` - User authentication and authorization data
- `pluginContext?` - Plugin system integration
- `cacheStrategy?` - Caching configuration
- `errorFallback?` - Error handling strategy
- `debug?` - Enable debug mode

### Enhanced Components

All rendered components receive enhanced props:
- `tenantContext` - Current tenant information
- `authContext` - User authentication data
- Enhanced data attributes for debugging and analytics

## Plugin Hooks

The renderer supports various lifecycle hooks for plugins:

### Available Hooks

- `before-load` - Before page data loading
- `after-load` - After page data loading
- `before-plan` - Before constraint satisfaction planning
- `after-plan` - After planning completion
- `before-render` - Before component rendering
- `after-render` - After rendering completion
- `component-mount` - When individual components mount
- `component-unmount` - When components unmount
- `error` - When errors occur
- `cache-hit` - When cache is hit
- `cache-miss` - When cache is missed

### Hook Registration

```typescript
import { registerPluginHook } from '@/boilerplate/renderer';

registerPluginHook(pluginContext, 'before-render', async (data) => {
  // Track page view analytics
  analytics.track('page_view', {
    slug: data.slug,
    tenantId: data.tenantContext?.id,
    userId: data.authContext?.user?.id
  });
}, {
  priority: 10,
  conditions: [
    { field: 'tenantContext.features.analytics', operator: 'equals', value: true }
  ]
});
```

## Tenant Content Provider

Handles tenant-specific content loading with data isolation:

```typescript
import { createTenantContentProvider } from '@/boilerplate/renderer';

const tenantProvider = createTenantContentProvider(baseProvider);

// Get tenant-specific content
const pageData = await tenantProvider.getTenantContent(
  'page',
  'homepage',
  tenantContext,
  authContext
);
```

## Error Handling

### Built-in Error Components

- `ErrorDisplay` - User-friendly error messages
- `PlanningErrorDisplay` - Constraint planning errors
- `FallbackRenderer` - Graceful fallback content
- `LoadingSpinner` - Loading states

### Custom Error Handling

```tsx
const CustomFallback = ({ slug, error }) => (
  <div className="error-container">
    <h1>Something went wrong</h1>
    <p>Failed to load: {slug}</p>
    <button onClick={() => window.location.reload()}>
      Try Again
    </button>
  </div>
);

<EnhancedPageRenderer
  slug="page"
  ctx={{}}
  errorFallback={{
    showErrors: false,
    fallbackComponent: CustomFallback,
    retryAttempts: 3
  }}
/>
```

## Caching Strategies

### Cache Configuration

```typescript
const cacheStrategy = {
  enabled: true,
  ttl: 15 * 60 * 1000, // 15 minutes
  key: 'custom-cache-key',
  invalidateOn: [
    'content-update',
    'user-change',
    'tenant-settings-update'
  ]
};
```

### Tenant-Aware Caching

Cache keys automatically include tenant and user context:
```
base-cache-key:tenant:tenant-id:user:user-id:roles:role1,role2
```

## Debug Mode

Enable comprehensive debugging information:

```tsx
<EnhancedPageRenderer
  slug="debug-page"
  ctx={{ debugMode: true }}
  debug={true}
/>
```

Debug mode provides:
- Component rendering metrics
- Cache hit/miss information
- Tenant and auth context details
- Plugin execution statistics
- Performance timing data

## Security Features

### Data Isolation
- Tenant-specific content filtering
- User permission validation
- Secure context injection

### Input Sanitization
- Automatic prop validation
- XSS prevention
- Content Security Policy integration

### Audit Logging
- Comprehensive request logging
- Error tracking with context
- Performance monitoring

## Performance Monitoring

The renderer includes built-in performance tracking:
- Page load times
- Component render duration
- Cache performance metrics
- Plugin execution timing

## Testing

Run the renderer tests:

```bash
npm test src/boilerplate/renderer/__tests__/
```

## Examples

See `src/boilerplate/examples/enhanced-renderer-usage.tsx` for comprehensive usage examples including:
- Multi-tenant scenarios
- Plugin integration
- Custom error handling
- Advanced caching
- Role-based rendering

## Migration from JsonRendererV2

The Enhanced PageRenderer is backward compatible with JsonRendererV2:

```tsx
// Before
<JsonRendererV2 slug="page" ctx={{}} />

// After - drop-in replacement
<EnhancedPageRenderer slug="page" ctx={{}} />

// With enhanced features
<EnhancedPageRenderer 
  slug="page" 
  ctx={{}} 
  tenantContext={tenant}
  authContext={auth}
/>
```

## Architecture

The Enhanced PageRenderer follows a layered architecture:

1. **Request Layer** - Handles incoming requests and context
2. **Plugin Layer** - Executes lifecycle hooks
3. **Content Layer** - Loads and transforms content
4. **Planning Layer** - Constraint satisfaction planning
5. **Rendering Layer** - Component rendering with context
6. **Error Layer** - Error handling and fallbacks

This architecture ensures extensibility, maintainability, and performance while providing comprehensive boilerplate functionality.