/**
 * Plugin Manager
 * Core plugin lifecycle management system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  Plugin, 
  PluginManager, 
  PluginManifest, 
  PluginState, 
  PluginContext,
  PluginHealthStatus,
  PluginConfig,
  PluginLogger,
  PluginRegistry,
  PluginHooks
} from '../interfaces/plugin';
import { ContentProvider } from '../interfaces/content-provider';
import { logger } from '../../lib/logger';
import { pluginRegistry } from '../registry/plugin-registry';

export class CentralizedPluginManager implements PluginManager {
  private plugins = new Map<string, Plugin>();
  private pluginStates = new Map<string, PluginState>();
  private pluginContexts = new Map<string, PluginContext>();
  private hooks = new Map<string, Set<(data?: unknown) => Promise<void> | void>>();
  private pluginsDir: string;
  private contentProvider: ContentProvider;

  constructor(pluginsDir: string, contentProvider: ContentProvider) {
    this.pluginsDir = pluginsDir;
    this.contentProvider = contentProvider;
  }

  /**
   * Initialize plugin manager and load all plugins
   */
  async initialize(): Promise<void> {
    try {
      await this.ensurePluginsDirectory();
      await this.loadAllPlugins();
      await this.activateInstalledPlugins();
    } catch (error) {
      logger.error('Failed to initialize plugin manager', { error });
      throw error;
    }
  }

  /**
   * Load plugin from directory
   */
  async loadPlugin(pluginDir: string): Promise<Plugin> {
    try {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate manifest
      this.validateManifest(manifest);

      // Load plugin entry point
      const entryPath = path.join(pluginDir, 'index.js');
      const pluginModule = await import(entryPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      // Validate plugin implementation
      this.validatePlugin(plugin);

      plugin.manifest = manifest;
      return plugin;
    } catch (error) {
      logger.error('Failed to load plugin', { pluginDir, error });
      throw new Error(`Failed to load plugin from ${pluginDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Install a plugin
   */
  async installPlugin(pluginId: string, pluginPath: string): Promise<void> {
    try {
      // Load plugin
      const plugin = await this.loadPlugin(pluginPath);
      
      // Check compatibility
      const isCompatible = await this.checkCompatibility(plugin);
      if (!isCompatible) {
        throw new Error(`Plugin ${pluginId} is not compatible with current boilerplate version`);
      }

      // Check dependencies
      await this.validateDependencies(plugin);

      // Create plugin context
      const context = this.createPluginContext(pluginId, pluginPath);

      // Install plugin
      await plugin.install(context);

      // Store plugin and state
      this.plugins.set(pluginId, plugin);
      this.pluginContexts.set(pluginId, context);
      this.pluginStates.set(pluginId, {
        installed: true,
        activated: false,
        version: plugin.manifest.version,
        installedAt: new Date().toISOString()
      });

      // Register plugin components
      if (plugin.manifest.components) {
        const componentManifest = {
          name: plugin.manifest.name,
          version: plugin.manifest.version,
          description: plugin.manifest.description,
          author: plugin.manifest.author,
          components: plugin.manifest.components.map(comp => ({
            key: comp.key,
            path: comp.path,
            metadata: comp.metadata || {
              name: comp.key,
              description: `Component from ${plugin.manifest.name}`,
              category: 'plugin',
              tags: ['plugin']
            }
          }))
        };

        await pluginRegistry.registerPlugin(pluginId, componentManifest);
      }

      logger.info('Plugin installed successfully', { pluginId, version: plugin.manifest.version });
    } catch (error) {
      logger.error('Failed to install plugin', { pluginId, error });
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      const context = this.pluginContexts.get(pluginId);

      if (!plugin || !context) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Deactivate if active
      const state = this.pluginStates.get(pluginId);
      if (state?.activated) {
        await this.deactivatePlugin(pluginId);
      }

      // Uninstall plugin
      await plugin.uninstall(context);

      // Unregister components
      pluginRegistry.unregisterPlugin(pluginId);

      // Remove from tracking
      this.plugins.delete(pluginId);
      this.pluginContexts.delete(pluginId);
      this.pluginStates.delete(pluginId);

      logger.info('Plugin uninstalled successfully', { pluginId });
    } catch (error) {
      logger.error('Failed to uninstall plugin', { pluginId, error });
      throw error;
    }
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      const context = this.pluginContexts.get(pluginId);
      const state = this.pluginStates.get(pluginId);

      if (!plugin || !context || !state) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (state.activated) {
        throw new Error(`Plugin ${pluginId} is already activated`);
      }

      // Activate plugin
      await plugin.activate(context);

      // Update state
      state.activated = true;
      state.activatedAt = new Date().toISOString();
      state.lastError = undefined;

      logger.info('Plugin activated successfully', { pluginId });
    } catch (error) {
      // Update state with error
      const state = this.pluginStates.get(pluginId);
      if (state) {
        state.lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      logger.error('Failed to activate plugin', { pluginId, error });
      throw error;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      const context = this.pluginContexts.get(pluginId);
      const state = this.pluginStates.get(pluginId);

      if (!plugin || !context || !state) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (!state.activated) {
        throw new Error(`Plugin ${pluginId} is not activated`);
      }

      // Deactivate plugin
      await plugin.deactivate(context);

      // Update state
      state.activated = false;
      state.activatedAt = undefined;
      state.lastError = undefined;

      logger.info('Plugin deactivated successfully', { pluginId });
    } catch (error) {
      // Update state with error
      const state = this.pluginStates.get(pluginId);
      if (state) {
        state.lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      logger.error('Failed to deactivate plugin', { pluginId, error });
      throw error;
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string, newVersion: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      const context = this.pluginContexts.get(pluginId);
      const state = this.pluginStates.get(pluginId);

      if (!plugin || !context || !state) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const oldVersion = plugin.manifest.version;

      // Call plugin update method if available
      if (plugin.update) {
        await plugin.update(context, oldVersion);
      }

      // Update version in state
      state.version = newVersion;
      plugin.manifest.version = newVersion;

      logger.info('Plugin updated successfully', { pluginId, oldVersion, newVersion });
    } catch (error) {
      logger.error('Failed to update plugin', { pluginId, error });
      throw error;
    }
  }

  /**
   * List all plugins
   */
  async listPlugins(): Promise<Record<string, PluginState>> {
    const result: Record<string, PluginState> = {};
    for (const [pluginId, state] of this.pluginStates.entries()) {
      result[pluginId] = { ...state };
    }
    return result;
  }

  /**
   * Get plugin information
   */
  async getPlugin(pluginId: string): Promise<Plugin | null> {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get plugin state
   */
  async getPluginState(pluginId: string): Promise<PluginState | null> {
    const state = this.pluginStates.get(pluginId);
    return state ? { ...state } : null;
  }

  /**
   * Validate plugin
   */
  async validatePlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Check required methods
      if (typeof plugin.install !== 'function') {
        throw new Error('Plugin must implement install method');
      }
      if (typeof plugin.uninstall !== 'function') {
        throw new Error('Plugin must implement uninstall method');
      }
      if (typeof plugin.activate !== 'function') {
        throw new Error('Plugin must implement activate method');
      }
      if (typeof plugin.deactivate !== 'function') {
        throw new Error('Plugin must implement deactivate method');
      }

      // Validate manifest
      this.validateManifest(plugin.manifest);

      // Validate configuration if method exists
      if (plugin.validateConfig) {
        const config = {}; // Get plugin config from storage
        const isValidConfig = plugin.validateConfig(config);
        if (!isValidConfig) {
          throw new Error('Plugin configuration is invalid');
        }
      }

      return true;
    } catch (error) {
      logger.error('Plugin validation failed', { plugin: plugin.manifest?.name, error });
      return false;
    }
  }

  /**
   * Get plugin dependencies
   */
  async getDependencies(pluginId: string): Promise<string[]> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return [];
    }

    const dependencies = [];
    if (plugin.manifest.dependencies) {
      dependencies.push(...Object.keys(plugin.manifest.dependencies));
    }
    if (plugin.manifest.peerDependencies) {
      dependencies.push(...Object.keys(plugin.manifest.peerDependencies));
    }

    return dependencies;
  }

  /**
   * Check plugin compatibility
   */
  async checkCompatibility(plugin: Plugin): Promise<boolean> {
    try {
      const boilerplateConfig = plugin.manifest.boilerplate;
      if (!boilerplateConfig) {
        return true; // No specific requirements
      }

      // Get current boilerplate version (this would come from package.json or config)
      // FIX BUG-PLUGIN-001: read version from package.json instead of hardcoded '1.0.0'
      let currentVersion = '1.0.0';
      try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
        currentVersion = pkg.version ?? '1.0.0';
      } catch { /* package.json not readable — use fallback */ }

      // Simple version check (in production, use semver)
      if (boilerplateConfig.minVersion && currentVersion < boilerplateConfig.minVersion) {
        return false;
      }
      if (boilerplateConfig.maxVersion && currentVersion > boilerplateConfig.maxVersion) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Compatibility check failed', { plugin: plugin.manifest?.name, error });
      return false;
    }
  }

  /**
   * Execute plugin hook
   */
  async executeHook(event: string, data?: unknown): Promise<void> {
    const handlers = this.hooks.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error('Plugin hook execution failed', { event, error });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get plugin health status
   */
  async getPluginHealth(pluginId: string): Promise<PluginHealthStatus> {
    try {
      const plugin = this.plugins.get(pluginId);
      const state = this.pluginStates.get(pluginId);

      if (!plugin || !state) {
        return {
          healthy: false,
          message: 'Plugin not found'
        };
      }

      if (!state.activated) {
        return {
          healthy: false,
          message: 'Plugin not activated'
        };
      }

      if (state.lastError) {
        return {
          healthy: false,
          message: state.lastError
        };
      }

      // Call plugin health check if available
      if (plugin.getHealth) {
        return await plugin.getHealth();
      }

      return {
        healthy: true,
        message: 'Plugin is healthy'
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Private helper methods
   */

  private async ensurePluginsDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginsDir);
    } catch {
      await fs.mkdir(this.pluginsDir, { recursive: true });
    }
  }

  private async loadAllPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      const pluginDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(this.pluginsDir, entry.name));

      for (const pluginDir of pluginDirs) {
        try {
          const pluginId = path.basename(pluginDir);
          const plugin = await this.loadPlugin(pluginDir);
          this.plugins.set(pluginId, plugin);
          
          // Initialize state as installed but not activated
          this.pluginStates.set(pluginId, {
            installed: true,
            activated: false,
            version: plugin.manifest.version
          });

          // Create context
          const context = this.createPluginContext(pluginId, pluginDir);
          this.pluginContexts.set(pluginId, context);
        } catch (error) {
          logger.error('Failed to load plugin during initialization', { pluginDir, error });
        }
      }
    } catch (error) {
      logger.error('Failed to load plugins directory', { pluginsDir: this.pluginsDir, error });
    }
  }

  private async activateInstalledPlugins(): Promise<void> {
    // TODO: Load activation state from persistent storage
    // For now, we'll activate all installed plugins
    for (const [pluginId] of this.plugins.entries()) {
      try {
        await this.activatePlugin(pluginId);
      } catch (error) {
        logger.error('Failed to activate plugin during initialization', { pluginId, error });
      }
    }
  }

  private createPluginContext(pluginId: string, pluginDir: string): PluginContext {
    return {
      pluginId,
      pluginDir,
      config: this.createPluginConfig(pluginId),
      logger: this.createPluginLogger(pluginId),
      registry: this.createPluginRegistry(pluginId),
      contentProvider: this.contentProvider,
      hooks: this.createPluginHooks(pluginId)
    };
  }

  private createPluginConfig(pluginId: string): PluginConfig {
    const configMap = new Map<string, unknown>();

    return {
      get<T = unknown>(key: string, defaultValue?: T): T {
        return (configMap.get(key) as T) ?? defaultValue!;
      },
      set<T = unknown>(key: string, value: T): void {
        configMap.set(key, value);
      },
      has(key: string): boolean {
        return configMap.has(key);
      },
      delete(key: string): void {
        configMap.delete(key);
      }
    };
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    return {
      debug: (message: string, ...args: unknown[]) => logger.debug(`[${pluginId}] ${message}`, ...args),
      info: (message: string, ...args: unknown[]) => logger.info(`[${pluginId}] ${message}`, ...args),
      warn: (message: string, ...args: unknown[]) => logger.warn(`[${pluginId}] ${message}`, ...args),
      error: (message: string, ...args: unknown[]) => logger.error(`[${pluginId}] ${message}`, ...args)
    };
  }

  private createPluginRegistry(pluginId: string): PluginRegistry {
    return {
      registerComponent: (key: string, definition) => {
        // Implementation would register with enhanced registry
      },
      registerRoute: (registration) => {
        // Implementation would register routes
      },
      registerAPIEndpoint: (registration) => {
        // Implementation would register API endpoints
      },
      registerHook: (registration) => {
        // Implementation would register hooks
      },
      registerPermission: (registration) => {
        // Implementation would register permissions
      }
    };
  }

  private createPluginHooks(pluginId: string): PluginHooks {
    return {
      emit: async (event: string, data?: unknown) => {
        await this.executeHook(event, data);
      },
      on: (event: string, handler) => {
        if (!this.hooks.has(event)) {
          this.hooks.set(event, new Set());
        }
        this.hooks.get(event)!.add(handler);
      },
      off: (event: string, handler) => {
        const handlers = this.hooks.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      }
    };
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name) {
      throw new Error('Plugin manifest must include name');
    }
    if (!manifest.version) {
      throw new Error('Plugin manifest must include version');
    }
    if (!manifest.description) {
      throw new Error('Plugin manifest must include description');
    }
    if (!manifest.author) {
      throw new Error('Plugin manifest must include author');
    }
  }

  private async validateDependencies(plugin: Plugin): Promise<void> {
    if (plugin.manifest.dependencies) {
      for (const [dep, version] of Object.entries(plugin.manifest.dependencies)) {
        // TODO: Check if dependency is available and version is compatible
      }
    }
  }
}