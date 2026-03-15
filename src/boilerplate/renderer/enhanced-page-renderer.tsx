/**
 * Enhanced PageRenderer with Boilerplate Features
 * Extends JsonRendererV2 with tenant context, auth context, and plugin support
 */

import React, { ReactElement } from "react";
import { planPage } from "@/lib/compose/planner";
import { loadResolvedPage, generateCacheKey, cachedResolve } from "@/lib/compose/resolve";
import { ComponentInstance, Constraint } from "@/types/composer";
import { logger } from "../../lib/logger";
import { TenantContext } from "../interfaces/tenant";
import { AuthContext } from "../interfaces/auth";
import { PluginContext } from "../interfaces/plugin";
import { enhancedRegistry } from "../registry/enhanced-registry";
import { 
  ErrorDisplay, 
  PlanningErrorDisplay, 
  FallbackRenderer,
  DebugInfo 
} from "./enhanced-renderer-components";

export interface EnhancedPageRendererProps {
  slug: string;
  ctx: Record<string, unknown>;
  globalConstraints?: Constraint[];
  resolveContext?: {
    site?: string;
    env?: string;
    locale?: string;
    preview?: boolean;
  };
  debug?: boolean;
  // Enhanced boilerplate features
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  pluginContext?: PluginContext;
  cacheStrategy?: CacheStrategy;
  errorFallback?: ErrorFallbackStrategy;
}

export interface CacheStrategy {
  enabled: boolean;
  ttl?: number;
  key?: string;
  invalidateOn?: string[];
}

export interface ErrorFallbackStrategy {
  showErrors: boolean;
  fallbackComponent?: React.ComponentType<{ slug: string; error?: Error }>;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface PluginHookData {
  slug: string;
  ctx: Record<string, unknown>;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  component?: ComponentInstance;
  phase: 'before-load' | 'after-load' | 'before-render' | 'after-render' | 'error';
  data?: unknown;
  error?: Error;
}

/**
 * Enhanced PageRenderer with tenant-aware content loading and plugin support
 */
export default async function EnhancedPageRenderer({
  slug,
  ctx,
  globalConstraints = [],
  resolveContext = {},
  debug = false,
  tenantContext,
  authContext,
  pluginContext,
  cacheStrategy = { enabled: true },
  errorFallback = { showErrors: debug }
}: EnhancedPageRendererProps): Promise<ReactElement> {
  try {
    // Execute before-load plugin hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'before-load', {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'before-load'
      });
    }

    // Generate enhanced cache key with tenant and auth context
    const enhancedCacheKey = generateEnhancedCacheKey(
      slug, 
      ctx, 
      resolveContext, 
      tenantContext, 
      authContext
    );
    
    // Load and resolve page with tenant-aware caching
    const loadedData = await loadTenantAwarePage(
      slug,
      ctx,
      resolveContext,
      tenantContext,
      authContext,
      cacheStrategy,
      enhancedCacheKey
    );

    // Execute after-load plugin hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'after-load', {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'after-load',
        data: loadedData
      });
    }
    
    // Plan the page layout with constraint satisfaction
    const planResult = planPage({
      page: loadedData.page,
      ctx: enhanceContextWithTenant(ctx, tenantContext, authContext),
      globalConstraints,
      blocks: loadedData.blocks
    });
    
    // Handle planning errors with enhanced error handling
    if (planResult.errors.length > 0) {
      const errorData = {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'error' as const,
        error: new Error(`Planning errors: ${JSON.stringify(planResult.errors)}`)
      };

      if (pluginContext) {
        await executePluginHooks(pluginContext, 'error', errorData);
      }

      if (debug || errorFallback.showErrors) {
        logger.error({ 
          message: `Planning errors: ${JSON.stringify(planResult.errors)}`,
          tenantId: tenantContext?.id,
          userId: authContext?.user?.id
        });
        return <PlanningErrorDisplay errors={planResult.errors} warnings={planResult.warnings} />;
      }
      
      // In production, log errors and render fallback
      logger.error({ 
        message: `Page planning failed for ${slug}: ${JSON.stringify(planResult.errors)}`,
        tenantId: tenantContext?.id,
        userId: authContext?.user?.id
      });
      
      return renderErrorFallback(slug, errorData.error, errorFallback);
    }

    // Execute before-render plugin hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'before-render', {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'before-render',
        data: planResult
      });
    }
    
    // Render planned components with enhanced component renderer
    const renderedComponents = await Promise.all(
      planResult.components.map(async (component) => {
        return (
          <EnhancedComponentRenderer 
            key={component.id}
            component={component}
            tenantContext={tenantContext}
            authContext={authContext}
            pluginContext={pluginContext}
            debug={debug}
          />
        );
      })
    );

    // Execute after-render plugin hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'after-render', {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'after-render',
        data: renderedComponents
      });
    }
    
    // Optional debug information with enhanced context
    const debugInfo = debug ? (
      <DebugInfo 
        planResult={planResult}
        loadWarnings={loadedData.warnings}
        cacheKey={enhancedCacheKey}
        tenantContext={tenantContext}
        authContext={authContext}
      />
    ) : null;
    
    return (
      <>
        {debugInfo}
        <main 
          data-page-slug={slug} 
          data-plan-metrics={JSON.stringify(planResult.metrics)}
          data-tenant-id={tenantContext?.id}
          data-user-id={authContext?.user?.id}
        >
          {renderedComponents}
        </main>
      </>
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Execute error plugin hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'error', {
        slug,
        ctx,
        tenantContext,
        authContext,
        phase: 'error',
        error: error as Error
      });
    }

    logger.error({ 
      message: `Failed to render page ${slug}: ${errorMessage}`,
      tenantId: tenantContext?.id,
      userId: authContext?.user?.id,
      error: error instanceof Error ? error.stack : undefined
    });
    
    if (debug || errorFallback.showErrors) {
      return <ErrorDisplay error={error as Error} slug={slug} />;
    }
    
    return renderErrorFallback(slug, error as Error, errorFallback);
  }
}

/**
 * Enhanced Component Renderer with plugin support and tenant context
 */
async function EnhancedComponentRenderer({ 
  component, 
  tenantContext,
  authContext,
  pluginContext,
  debug 
}: { 
  component: ComponentInstance; 
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  pluginContext?: PluginContext;
  debug: boolean;
}) {
  try {
    // Get the component from enhanced registry
    const componentDefinition = await enhancedRegistry.loadDynamic(component.key);
    
    if (!componentDefinition) {
      if (debug) {
        return (
          <div 
            className="border-2 border-red-500 p-4 bg-red-50"
            data-testid={`missing-component-${component.id}`}
          >
            <h3 className="text-red-700 font-bold">Missing Component</h3>
            <p>Component key: {component.key}</p>
            <p>Component ID: {component.id}</p>
            <p>Tenant: {tenantContext?.id || 'none'}</p>
          </div>
        );
      }
      
      // Component not found - handled gracefully in production
      return null;
    }

    // Validate component props with enhanced validation
    const validation = enhancedRegistry.validate(component.key, component.props);
    if (!validation.valid && debug) {
      logger.warn({
        message: `Component validation failed for ${component.key}`,
        errors: validation.errors,
        tenantId: tenantContext?.id
      });
    }

    // Execute component lifecycle hooks
    if (pluginContext) {
      await executePluginHooks(pluginContext, 'before-render', {
        slug: '',
        ctx: {},
        tenantContext,
        authContext,
        component,
        phase: 'before-render'
      });
    }
    
    // Render slots recursively with enhanced context
    const slots: Record<string, React.ReactNode[]> = {};
    if (component.slotIds) {
      for (const slotName of component.slotIds) {
        const slotItems = (component as any)[`${slotName}Items`] as ComponentInstance[] | undefined;
        if (slotItems) {
          slots[slotName] = await Promise.all(
            slotItems.map(async (item) => (
              <EnhancedComponentRenderer 
                key={item.id || `item-${Math.random().toString(36).substr(2, 9)}`}
                component={item}
                tenantContext={tenantContext}
                authContext={authContext}
                pluginContext={pluginContext}
                debug={debug}
              />
            ))
          );
        }
      }
    }
    
    const componentKey = component.id || `component-${component.key}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create enhanced props with tenant and auth context
    const enhancedProps: Record<string, unknown> = {
      ...(component.props || {}),
      // Inject tenant and auth context if component supports it
      tenantContext: tenantContext,
      authContext: authContext,
    };
    
    // Add slots if they exist
    if (Object.keys(slots).length > 0) {
      enhancedProps.slots = slots;
    }
    
    // Add enhanced data attributes
    const dataProps = {
      'data-testid': componentKey,
      'data-component-key': component.key,
      'data-tenant-id': tenantContext?.id,
      'data-user-id': authContext?.user?.id,
      ...(component.variant && { 'data-variant': component.variant }),
      ...(component.weight && { 'data-weight': component.weight }),
      ...(component.analytics && { 'data-analytics': JSON.stringify(component.analytics) })
    };
    
    // Create the final props object
    const finalProps = {
      ...enhancedProps,
      ...dataProps
    };
    
    // Render the component
    const Component = componentDefinition.component as React.ComponentType<any>;
    return <Component key={componentKey} {...finalProps} />;
    
  } catch (renderError) {
    // Log render error with enhanced context
    logger.error({
      message: `Failed to render component ${component.key}`,
      error: renderError instanceof Error ? renderError.message : String(renderError),
      tenantId: tenantContext?.id,
      userId: authContext?.user?.id,
      componentId: component.id
    });
    
    if (debug) {
      return (
        <div 
          className="border-2 border-orange-500 p-4 bg-orange-50"
          data-testid={`error-component-${component.id}`}
        >
          <h3 className="text-orange-700 font-bold">Render Error</h3>
          <p>Component: {component.key} ({component.id})</p>
          <p>Tenant: {tenantContext?.id || 'none'}</p>
          <p>Error: {(renderError as Error).message}</p>
        </div>
      );
    }
    
    return null;
  }
}

/**
 * Generate enhanced cache key with tenant and auth context
 */
function generateEnhancedCacheKey(
  slug: string,
  ctx: Record<string, unknown>,
  resolveContext: Record<string, unknown>,
  tenantContext?: TenantContext,
  authContext?: AuthContext
): string {
  const baseCacheKey = generateCacheKey(slug, ctx, resolveContext);
  const tenantId = tenantContext?.id || 'default';
  const userId = authContext?.user?.id || 'anonymous';
  const userRoles = authContext?.roles?.join(',') || 'none';
  
  return `${baseCacheKey}:tenant:${tenantId}:user:${userId}:roles:${userRoles}`;
}

/**
 * Load page with tenant-aware content loading and data isolation
 */
async function loadTenantAwarePage(
  slug: string,
  ctx: Record<string, unknown>,
  resolveContext: Record<string, unknown>,
  tenantContext?: TenantContext,
  authContext?: AuthContext,
  cacheStrategy?: CacheStrategy,
  cacheKey?: string
) {
  // Enhance resolve context with tenant information
  const enhancedResolveContext = {
    ...resolveContext,
    tenantId: tenantContext?.id,
    userId: authContext?.user?.id,
    userRoles: authContext?.roles,
    userPermissions: authContext?.permissions
  };

  // Apply tenant-specific content filtering
  const enhancedCtx = enhanceContextWithTenant(ctx, tenantContext, authContext);

  // Use caching if enabled
  if (cacheStrategy?.enabled && cacheKey) {
    const ttl = cacheStrategy.ttl || (process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 1000);
    
    return await cachedResolve(
      cacheKey,
      () => loadResolvedPage(slug, enhancedCtx, enhancedResolveContext),
      ttl
    );
  }

  return await loadResolvedPage(slug, enhancedCtx, enhancedResolveContext);
}

/**
 * Enhance context with tenant and auth information
 */
function enhanceContextWithTenant(
  ctx: Record<string, unknown>,
  tenantContext?: TenantContext,
  authContext?: AuthContext
): Record<string, unknown> {
  return {
    ...ctx,
    tenant: tenantContext ? {
      id: tenantContext.id,
      name: tenantContext.name,
      domain: tenantContext.domain,
      settings: tenantContext.settings,
      features: tenantContext.features
    } : null,
    auth: authContext ? {
      user: authContext.user,
      roles: authContext.roles,
      permissions: authContext.permissions
    } : null
  };
}

/**
 * Execute plugin hooks for component lifecycle events
 */
async function executePluginHooks(
  pluginContext: PluginContext,
  event: string,
  data: PluginHookData
): Promise<void> {
  try {
    await pluginContext.hooks.emit(event, data);
  } catch (error) {
    logger.error({
      message: `Plugin hook execution failed for event: ${event}`,
      error: error instanceof Error ? error.message : String(error),
      pluginId: pluginContext.pluginId
    });
  }
}

/**
 * Render error fallback with enhanced strategies
 */
function renderErrorFallback(
  slug: string, 
  error: Error, 
  strategy: ErrorFallbackStrategy
): ReactElement {
  if (strategy.fallbackComponent) {
    const FallbackComponent = strategy.fallbackComponent;
    return <FallbackComponent slug={slug} error={error} />;
  }
  
  return <FallbackRenderer slug={slug} />;
}

/**
 * Export enhanced render function for direct usage
 */
export async function renderEnhancedJsonPage(
  slug: string,
  ctx: Record<string, unknown>,
  options: Omit<EnhancedPageRendererProps, 'slug' | 'ctx'> = {}
): Promise<ReactElement> {
  return EnhancedPageRenderer({ slug, ctx, ...options });
}