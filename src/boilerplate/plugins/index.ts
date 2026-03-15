/**
 * Plugin System Exports
 * Central export point for all plugin-related functionality
 */

// Core plugin system
export { CentralizedPluginManager } from './plugin-manager';
export { PluginLoader, pluginLoader } from './plugin-loader';
export type { PluginLoadResult, PluginSource } from './plugin-loader';

// Plugin interfaces
export type {
  Plugin,
  PluginManager,
  PluginManifest,
  PluginState,
  PluginContext,
  PluginConfig,
  PluginLogger,
  PluginRegistry,
  PluginHooks,
  PluginHealthStatus,
  PluginHookHandler,
  ComponentRegistration,
  RouteRegistration,
  APIEndpointRegistration,
  MigrationRegistration,
  HookRegistration,
  HookCondition,
  PermissionRegistration
} from '../interfaces/plugin';

// Plugin registry
export { PluginRegistry, pluginRegistry, createPluginManifest, createComponentDefinition } from '../registry/plugin-registry';
export type { PluginComponentManifest, PluginComponentDefinition } from '../registry/plugin-registry';

// Plugin hooks
export type { HookData, HookPhase, HookHandler, HookCondition as PluginHookCondition } from '../renderer/plugin-hooks';

// API routes
export {
  handleListPlugins,
  handleGetPlugin,
  handleInstallPlugin,
  handleUninstallPlugin,
  handleActivatePlugin,
  handleDeactivatePlugin,
  handleUpdatePlugin,
  handleGetPluginHealth,
  handleGetPluginDependencies
} from '../api/plugin-routes';

// Utility functions
export function createPlugin(
  manifest: PluginManifest,
  implementation: Omit<Plugin, 'manifest'>
): Plugin {
  return {
    manifest,
    ...implementation
  };
}

export function validatePluginManifest(manifest: Partial<PluginManifest>): string[] {
  const errors: string[] = [];

  if (!manifest.name) {
    errors.push('Plugin name is required');
  }

  if (!manifest.version) {
    errors.push('Plugin version is required');
  }

  if (!manifest.description) {
    errors.push('Plugin description is required');
  }

  if (!manifest.author) {
    errors.push('Plugin author is required');
  }

  // Validate version format
  if (manifest.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(manifest.version)) {
    errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
  }

  return errors;
}

export function createPluginTemplate(
  name: string,
  author: string,
  description?: string
): PluginManifest {
  return {
    name,
    version: '1.0.0',
    description: description || `Plugin: ${name}`,
    author,
    license: 'MIT',
    keywords: ['boilerplate', 'plugin'],
    components: [],
    routes: [],
    apiEndpoints: [],
    hooks: [],
    permissions: []
  };
}