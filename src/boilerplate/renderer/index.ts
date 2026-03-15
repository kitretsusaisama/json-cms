/**
 * Enhanced PageRenderer Module
 * Exports all renderer components and utilities
 */

// Main renderer
export { default as EnhancedPageRenderer, renderEnhancedJsonPage } from './enhanced-page-renderer';
export type { 
  EnhancedPageRendererProps, 
  CacheStrategy, 
  ErrorFallbackStrategy,
  PluginHookData 
} from './enhanced-page-renderer';

// Renderer components
export {
  ErrorDisplay,
  PlanningErrorDisplay,
  FallbackRenderer,
  DebugInfo,
  LoadingSpinner,
  RetryButton
} from './enhanced-renderer-components';
export type {
  ErrorDisplayProps,
  PlanningErrorDisplayProps,
  FallbackRendererProps,
  DebugInfoProps
} from './enhanced-renderer-components';

// Tenant content provider
export { 
  EnhancedTenantContentProvider, 
  createTenantContentProvider 
} from './tenant-content-provider';
export type { 
  TenantContentProvider, 
  RequestContext 
} from './tenant-content-provider';

// Plugin hooks
export {
  PluginHookManager,
  pluginHookManager,
  executePluginHooks,
  registerPluginHook,
  createHookData
} from './plugin-hooks';
export type {
  HookData,
  HookPhase,
  HookHandler,
  HookCondition,
  HookExecutionResult,
  HookExecutionSummary
} from './plugin-hooks';