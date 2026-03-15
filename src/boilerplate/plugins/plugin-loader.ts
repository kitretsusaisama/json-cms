/**
 * Plugin Loader
 * Handles loading and validation of plugins from various sources
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Plugin, PluginManifest } from '../interfaces/plugin';
import { logger } from '../../lib/logger';

export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
  warnings?: string[];
}

export interface PluginSource {
  type: 'directory' | 'npm' | 'git' | 'url';
  location: string;
  version?: string;
}

export class PluginLoader {
  private cache = new Map<string, Plugin>();

  /**
   * Load plugin from various sources
   */
  async loadPlugin(source: PluginSource): Promise<PluginLoadResult> {
    try {
      switch (source.type) {
        case 'directory':
          return await this.loadFromDirectory(source.location);
        case 'npm':
          return await this.loadFromNpm(source.location, source.version);
        case 'git':
          return await this.loadFromGit(source.location);
        case 'url':
          return await this.loadFromUrl(source.location);
        default:
          return {
            success: false,
            error: `Unsupported plugin source type: ${source.type}`
          };
      }
    } catch (error) {
      logger.error('Failed to load plugin', { source, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load plugin from directory
   */
  async loadFromDirectory(pluginDir: string): Promise<PluginLoadResult> {
    try {
      const warnings: string[] = [];

      // Check if directory exists
      try {
        await fs.access(pluginDir);
      } catch {
        return {
          success: false,
          error: `Plugin directory does not exist: ${pluginDir}`
        };
      }

      // Load and validate manifest
      const manifestResult = await this.loadManifest(pluginDir);
      if (!manifestResult.success) {
        return manifestResult;
      }

      const manifest = manifestResult.manifest!;

      // Load plugin entry point
      const entryPoints = ['index.js', 'index.ts', 'plugin.js', 'plugin.ts'];
      let pluginModule: any = null;
      let entryPath: string | null = null;

      for (const entry of entryPoints) {
        const fullPath = path.join(pluginDir, entry);
        try {
          await fs.access(fullPath);
          entryPath = fullPath;
          break;
        } catch {
          // Continue to next entry point
        }
      }

      if (!entryPath) {
        return {
          success: false,
          error: `No valid entry point found. Expected one of: ${entryPoints.join(', ')}`
        };
      }

      try {
        pluginModule = await import(entryPath);
      } catch (error) {
        return {
          success: false,
          error: `Failed to import plugin module: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      // Extract plugin instance
      const plugin: Plugin = pluginModule.default || pluginModule.plugin || pluginModule;

      if (!plugin || typeof plugin !== 'object') {
        return {
          success: false,
          error: 'Plugin module must export a plugin instance'
        };
      }

      // Attach manifest
      plugin.manifest = manifest;

      // Validate plugin structure
      const validationResult = this.validatePluginStructure(plugin);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check for potential issues
      warnings.push(...this.checkPluginWarnings(plugin, pluginDir));

      // Cache the plugin
      this.cache.set(manifest.name, plugin);

      return {
        success: true,
        plugin,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load plugin from npm package
   */
  async loadFromNpm(packageName: string, version?: string): Promise<PluginLoadResult> {
    try {
      // TODO: Implement npm package loading
      // This would involve:
      // 1. Installing the package to a temporary directory
      // 2. Loading the plugin from the installed package
      // 3. Validating the plugin
      
      return {
        success: false,
        error: 'NPM plugin loading not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load plugin from git repository
   */
  async loadFromGit(gitUrl: string): Promise<PluginLoadResult> {
    try {
      // TODO: Implement git repository loading
      // This would involve:
      // 1. Cloning the repository to a temporary directory
      // 2. Building the plugin if necessary
      // 3. Loading the plugin from the built output
      
      return {
        success: false,
        error: 'Git plugin loading not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load plugin from URL
   */
  async loadFromUrl(url: string): Promise<PluginLoadResult> {
    try {
      // TODO: Implement URL-based plugin loading
      // This would involve:
      // 1. Downloading the plugin archive
      // 2. Extracting to a temporary directory
      // 3. Loading the plugin from the extracted files
      
      return {
        success: false,
        error: 'URL plugin loading not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load and validate plugin manifest
   */
  private async loadManifest(pluginDir: string): Promise<{ success: boolean; manifest?: PluginManifest; error?: string }> {
    const manifestPath = path.join(pluginDir, 'plugin.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate required fields
      const validationError = this.validateManifest(manifest);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      return {
        success: true,
        manifest
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {
          success: false,
          error: 'Plugin manifest (plugin.json) not found'
        };
      }

      return {
        success: false,
        error: `Failed to load plugin manifest: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): string | null {
    if (!manifest.name) {
      return 'Plugin manifest must include "name" field';
    }

    if (!manifest.version) {
      return 'Plugin manifest must include "version" field';
    }

    if (!manifest.description) {
      return 'Plugin manifest must include "description" field';
    }

    if (!manifest.author) {
      return 'Plugin manifest must include "author" field';
    }

    // Validate version format (basic semver check)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
    if (!versionRegex.test(manifest.version)) {
      return 'Plugin version must follow semantic versioning (e.g., 1.0.0)';
    }

    // Validate components if present
    if (manifest.components) {
      for (let i = 0; i < manifest.components.length; i++) {
        const component = manifest.components[i];
        if (!component.key) {
          return `Component at index ${i} must have a "key" field`;
        }
        if (!component.path) {
          return `Component at index ${i} must have a "path" field`;
        }
      }
    }

    // Validate API endpoints if present
    if (manifest.apiEndpoints) {
      for (let i = 0; i < manifest.apiEndpoints.length; i++) {
        const endpoint = manifest.apiEndpoints[i];
        if (!endpoint.path) {
          return `API endpoint at index ${i} must have a "path" field`;
        }
        if (!endpoint.methods || endpoint.methods.length === 0) {
          return `API endpoint at index ${i} must have at least one HTTP method`;
        }
        if (!endpoint.handler) {
          return `API endpoint at index ${i} must have a "handler" field`;
        }
      }
    }

    return null;
  }

  /**
   * Validate plugin structure
   */
  private validatePluginStructure(plugin: Plugin): PluginLoadResult {
    const requiredMethods = ['install', 'uninstall', 'activate', 'deactivate'];

    for (const method of requiredMethods) {
      if (typeof plugin[method as keyof Plugin] !== 'function') {
        return {
          success: false,
          error: `Plugin must implement ${method} method`
        };
      }
    }

    if (!plugin.manifest) {
      return {
        success: false,
        error: 'Plugin must have a manifest'
      };
    }

    return { success: true };
  }

  /**
   * Check for potential plugin warnings
   */
  private checkPluginWarnings(plugin: Plugin, pluginDir: string): string[] {
    const warnings: string[] = [];

    // Check for missing optional methods
    if (!plugin.update) {
      warnings.push('Plugin does not implement update method - updates will not be supported');
    }

    if (!plugin.validateConfig) {
      warnings.push('Plugin does not implement validateConfig method - configuration validation will be skipped');
    }

    if (!plugin.getHealth) {
      warnings.push('Plugin does not implement getHealth method - health checks will not be available');
    }

    // Check for missing license
    if (!plugin.manifest.license) {
      warnings.push('Plugin manifest does not specify a license');
    }

    // Check for missing homepage or repository
    if (!plugin.manifest.homepage && !plugin.manifest.repository) {
      warnings.push('Plugin manifest does not specify homepage or repository URL');
    }

    // Check for large number of components
    if (plugin.manifest.components && plugin.manifest.components.length > 20) {
      warnings.push(`Plugin registers ${plugin.manifest.components.length} components - consider splitting into multiple plugins`);
    }

    // Check for large number of API endpoints
    if (plugin.manifest.apiEndpoints && plugin.manifest.apiEndpoints.length > 10) {
      warnings.push(`Plugin registers ${plugin.manifest.apiEndpoints.length} API endpoints - consider splitting into multiple plugins`);
    }

    return warnings;
  }

  /**
   * Clear plugin cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached plugin
   */
  getCachedPlugin(name: string): Plugin | undefined {
    return this.cache.get(name);
  }

  /**
   * Check if plugin is cached
   */
  isCached(name: string): boolean {
    return this.cache.has(name);
  }
}

// Create singleton instance
export const pluginLoader = new PluginLoader();