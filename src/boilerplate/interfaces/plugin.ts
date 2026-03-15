/**
 * Plugin System Interface
 */

import { ComponentDefinition } from './component-registry';
import { ContentProvider } from './content-provider';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
  boilerplate?: {
    minVersion: string;
    maxVersion?: string;
  };
  components?: ComponentRegistration[];
  routes?: RouteRegistration[];
  apiEndpoints?: APIEndpointRegistration[];
  migrations?: MigrationRegistration[];
  hooks?: HookRegistration[];
  permissions?: PermissionRegistration[];
}

export interface ComponentRegistration {
  key: string;
  path: string;
  metadata?: Partial<ComponentDefinition['metadata']>;
}

export interface RouteRegistration {
  path: string;
  component: string;
  layout?: string;
  middleware?: string[];
  permissions?: string[];
}

export interface APIEndpointRegistration {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  handler: string;
  middleware?: string[];
  permissions?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface MigrationRegistration {
  version: string;
  description: string;
  up: string;
  down: string;
}

export interface HookRegistration {
  name: string;
  handler: string;
  priority?: number;
  conditions?: HookCondition[];
}

export interface HookCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface PermissionRegistration {
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

export interface PluginContext {
  pluginId: string;
  pluginDir: string;
  config: PluginConfig;
  logger: PluginLogger;
  registry: PluginRegistry;
  contentProvider: ContentProvider;
  hooks: PluginHooks;
}

export interface PluginConfig {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set<T = unknown>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
}

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface PluginRegistry {
  registerComponent(key: string, definition: ComponentDefinition): void;
  registerRoute(registration: RouteRegistration): void;
  registerAPIEndpoint(registration: APIEndpointRegistration): void;
  registerHook(registration: HookRegistration): void;
  registerPermission(registration: PermissionRegistration): void;
}

export interface PluginHooks {
  emit(event: string, data?: unknown): Promise<void>;
  on(event: string, handler: PluginHookHandler): void;
  off(event: string, handler: PluginHookHandler): void;
}

export type PluginHookHandler = (data?: unknown) => Promise<void> | void;

export interface PluginState {
  installed: boolean;
  activated: boolean;
  version: string;
  installedAt?: string;
  activatedAt?: string;
  lastError?: string;
}

/**
 * Plugin Interface
 */
export interface Plugin {
  manifest: PluginManifest;
  
  /**
   * Install the plugin
   */
  install(context: PluginContext): Promise<void>;

  /**
   * Uninstall the plugin
   */
  uninstall(context: PluginContext): Promise<void>;

  /**
   * Activate the plugin
   */
  activate(context: PluginContext): Promise<void>;

  /**
   * Deactivate the plugin
   */
  deactivate(context: PluginContext): Promise<void>;

  /**
   * Update the plugin
   */
  update?(context: PluginContext, fromVersion: string): Promise<void>;

  /**
   * Validate plugin configuration
   */
  validateConfig?(config: unknown): boolean;

  /**
   * Get plugin health status
   */
  getHealth?(): Promise<PluginHealthStatus>;
}

export interface PluginHealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Plugin Manager Interface
 */
export interface PluginManager {
  /**
   * Load plugin from directory
   */
  loadPlugin(pluginDir: string): Promise<Plugin>;

  /**
   * Install a plugin
   */
  installPlugin(pluginId: string, pluginPath: string): Promise<void>;

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(pluginId: string): Promise<void>;

  /**
   * Activate a plugin
   */
  activatePlugin(pluginId: string): Promise<void>;

  /**
   * Deactivate a plugin
   */
  deactivatePlugin(pluginId: string): Promise<void>;

  /**
   * Update a plugin
   */
  updatePlugin(pluginId: string, newVersion: string): Promise<void>;

  /**
   * List all plugins
   */
  listPlugins(): Promise<Record<string, PluginState>>;

  /**
   * Get plugin information
   */
  getPlugin(pluginId: string): Promise<Plugin | null>;

  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): Promise<PluginState | null>;

  /**
   * Validate plugin
   */
  validatePlugin(plugin: Plugin): Promise<boolean>;

  /**
   * Get plugin dependencies
   */
  getDependencies(pluginId: string): Promise<string[]>;

  /**
   * Check plugin compatibility
   */
  checkCompatibility(plugin: Plugin): Promise<boolean>;

  /**
   * Execute plugin hook
   */
  executeHook(event: string, data?: unknown): Promise<void>;

  /**
   * Get plugin health status
   */
  getPluginHealth(pluginId: string): Promise<PluginHealthStatus>;
}