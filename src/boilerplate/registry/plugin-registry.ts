/**
 * Plugin Registry for Component Management
 * Handles plugin-based component registration and lifecycle
 */

import React from 'react';
import { z } from 'zod';
import { enhancedRegistry } from './enhanced-registry';
import { componentLoader } from './component-loader';
import {
  ComponentDefinition,
  ComponentMetadata,
  ValidationResult,
} from '../interfaces/component-registry';

export interface PluginComponentManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  components: PluginComponentDefinition[];
  dependencies?: string[];
}

export interface PluginComponentDefinition {
  key: string;
  path?: string;
  module?: string;
  component?: React.ComponentType<any>;
  metadata: ComponentMetadata;
  schema?: z.ZodSchema;
  lazy?: boolean;
}

export class PluginRegistry {
  private plugins = new Map<string, PluginComponentManifest>();
  private pluginComponents = new Map<string, Set<string>>();

  /**
   * Register a plugin with its components
   */
  async registerPlugin(pluginId: string, manifest: PluginComponentManifest): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];
    const registeredComponents = new Set<string>();

    try {
      // Validate plugin manifest
      const manifestValidation = this.validatePluginManifest(manifest);
      if (!manifestValidation.valid) {
        return manifestValidation;
      }

      // Load and register each component
      for (const componentDef of manifest.components) {
        try {
          const definition = await this.loadPluginComponent(componentDef);
          enhancedRegistry.register(componentDef.key, definition);
          registeredComponents.add(componentDef.key);
        } catch (error) {
          errors.push({
            path: `components.${componentDef.key}`,
            message: `Failed to load component: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'COMPONENT_LOAD_ERROR',
          });
        }
      }

      // Store plugin information
      this.plugins.set(pluginId, manifest);
      this.pluginComponents.set(pluginId, registeredComponents);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      // Cleanup any partially registered components
      for (const componentKey of registeredComponents) {
        enhancedRegistry.unregister(componentKey);
      }

      return {
        valid: false,
        errors: [{
          path: 'plugin',
          message: `Failed to register plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'PLUGIN_REGISTRATION_ERROR',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Unregister a plugin and all its components
   */
  unregisterPlugin(pluginId: string): boolean {
    const componentKeys = this.pluginComponents.get(pluginId);
    if (!componentKeys) {
      return false;
    }

    // Unregister all components
    for (const componentKey of componentKeys) {
      enhancedRegistry.unregister(componentKey);
    }

    // Remove plugin tracking
    this.plugins.delete(pluginId);
    this.pluginComponents.delete(pluginId);

    return true;
  }

  /**
   * Get information about a registered plugin
   */
  getPlugin(pluginId: string): PluginComponentManifest | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * List all registered plugins
   */
  listPlugins(): Record<string, PluginComponentManifest> {
    const result: Record<string, PluginComponentManifest> = {};
    for (const [id, manifest] of this.plugins.entries()) {
      result[id] = manifest;
    }
    return result;
  }

  /**
   * Get components registered by a specific plugin
   */
  getPluginComponents(pluginId: string): string[] {
    const componentKeys = this.pluginComponents.get(pluginId);
    return componentKeys ? Array.from(componentKeys) : [];
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(pluginId: string): ValidationResult {
    const manifest = this.plugins.get(pluginId);
    if (!manifest) {
      return {
        valid: false,
        errors: [{
          path: 'plugin',
          message: `Plugin "${pluginId}" not found`,
          code: 'PLUGIN_NOT_FOUND',
        }],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];

    if (manifest.dependencies) {
      for (const dependency of manifest.dependencies) {
        if (!this.hasPlugin(dependency)) {
          errors.push({
            path: `dependencies.${dependency}`,
            message: `Required dependency "${dependency}" is not registered`,
            code: 'MISSING_DEPENDENCY',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Load a component from plugin definition
   */
  private async loadPluginComponent(componentDef: PluginComponentDefinition): Promise<ComponentDefinition> {
    let component: React.ComponentType<any>;

    if (componentDef.component) {
      // Component is directly provided
      component = componentDef.component;
    } else if (componentDef.path) {
      // Load from file path
      const definition = await componentLoader.loadFromPath(componentDef.path);
      component = definition.component;
    } else if (componentDef.module) {
      // Load from module
      const definition = await componentLoader.loadFromModule(componentDef.module);
      component = definition.component;
    } else {
      throw new Error('Component definition must include component, path, or module');
    }

    return {
      component,
      schema: componentDef.schema,
      metadata: componentDef.metadata,
      lazy: componentDef.lazy || false,
      loader: componentDef.path 
        ? () => componentLoader.loadFromPath(componentDef.path!).then(def => def.component)
        : componentDef.module
        ? () => componentLoader.loadFromModule(componentDef.module!).then(def => def.component)
        : undefined,
    };
  }

  /**
   * Validate plugin manifest
   */
  private validatePluginManifest(manifest: PluginComponentManifest): ValidationResult {
    const errors = [];

    if (!manifest.name) {
      errors.push({
        path: 'name',
        message: 'Plugin name is required',
        code: 'MISSING_NAME',
      });
    }

    if (!manifest.version) {
      errors.push({
        path: 'version',
        message: 'Plugin version is required',
        code: 'MISSING_VERSION',
      });
    }

    if (!manifest.components || manifest.components.length === 0) {
      errors.push({
        path: 'components',
        message: 'Plugin must define at least one component',
        code: 'NO_COMPONENTS',
      });
    }

    // Validate each component definition
    if (manifest.components) {
      for (let i = 0; i < manifest.components.length; i++) {
        const component = manifest.components[i];
        
        if (!component.key) {
          errors.push({
            path: `components[${i}].key`,
            message: 'Component key is required',
            code: 'MISSING_COMPONENT_KEY',
          });
        }

        if (!component.component && !component.path && !component.module) {
          errors.push({
            path: `components[${i}]`,
            message: 'Component must have component, path, or module defined',
            code: 'MISSING_COMPONENT_SOURCE',
          });
        }

        if (!component.metadata) {
          errors.push({
            path: `components[${i}].metadata`,
            message: 'Component metadata is required',
            code: 'MISSING_METADATA',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

// Create singleton instance
export const pluginRegistry = new PluginRegistry();

// Helper function to create plugin manifests
export function createPluginManifest(
  name: string,
  version: string,
  components: PluginComponentDefinition[],
  options: {
    description?: string;
    author?: string;
    dependencies?: string[];
  } = {}
): PluginComponentManifest {
  return {
    name,
    version,
    description: options.description || `Plugin: ${name}`,
    author: options.author || 'unknown',
    components,
    dependencies: options.dependencies,
  };
}

// Helper function to create component definitions
export function createComponentDefinition(
  key: string,
  metadata: ComponentMetadata,
  options: {
    component?: React.ComponentType<any>;
    path?: string;
    module?: string;
    schema?: z.ZodSchema;
    lazy?: boolean;
  } = {}
): PluginComponentDefinition {
  return {
    key,
    metadata,
    ...options,
  };
}